import 'source-map-support/register'
import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as ecs from '@aws-cdk/aws-ecs'
import * as alb from '@aws-cdk/aws-elasticloadbalancingv2'
import * as ecr_assets from '@aws-cdk/aws-ecr-assets'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as iam from '@aws-cdk/aws-iam'
import * as fs from "fs"


export class ApplicationStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, vpcname: string, env_level: string = 'prd', health_check_path: string = '/',
		props?: cdk.StackProps) {
		super(scope, id, props)

		const vpc = ec2.Vpc.fromLookup(this, "vpc", { vpcName: vpcname })
		
 		const vpc_id = new cdk.CfnParameter(this, "vpc_id", {
			type: "String",
			default: ""
			})
 
		const subnet1 = new cdk.CfnParameter(this, "subnet1", {
			type: "String",
			default: ""
			})

		const subnet2 = new cdk.CfnParameter(this, "subnet2", {
			type: "String",
			default: ""
			})			 

		new cdk.CfnInclude(this, "Macro", {
			template: JSON.parse(fs.readFileSync("macro.json").toString())
		})

		const app_asset = new ecr_assets.DockerImageAsset(this, 'app_asset', {
			directory: path.join(__dirname, '../../'),
			file: 'docker/app/Dockerfile',
		})
		
		const sg = new ec2.CfnSecurityGroup(this, 'ExampleSecurityGroup', {
			groupDescription: "Security group for ec2 access",
			vpcId: vpc.vpcId,
			securityGroupIngress: [
				{
					"ipProtocol": "tcp",
					"fromPort": 80,
					"toPort": 80,
					"cidrIp": "0.0.0.0/0"
				},
				{
					"ipProtocol": "tcp",
					"fromPort": 8080,
					"toPort": 8080,
					"cidrIp": "0.0.0.0/0"
				},
				{
					"ipProtocol": "tcp",
					"fromPort": 22,
					"toPort": 22,
					"cidrIp": "0.0.0.0/0"
				}
			],
		})

		new alb.CfnTargetGroup(this, 'ALBTargetGroupBlue', {
			healthCheckIntervalSeconds: 5,
			healthCheckPath: "/",
			healthCheckPort: "80",
			healthCheckProtocol: "HTTP",
			healthCheckTimeoutSeconds: 2,
			healthyThresholdCount: 2,
			matcher: {
				"httpCode": "200"
			},
			port: 80,
			protocol: "HTTP",
			tags: [
				{
					"key": "Group",
					"value": "Example"
				}
			],
			targetType: "ip",
			unhealthyThresholdCount: 4,
			vpcId: vpc.vpcId
		})

		new alb.CfnTargetGroup(this, 'ALBTargetGroupGreen', {
			healthCheckIntervalSeconds: 5,
			healthCheckPath: "/",
			healthCheckPort: "80",
			healthCheckProtocol: "HTTP",
			healthCheckTimeoutSeconds: 2,
			healthyThresholdCount: 2,
			matcher: {
				"httpCode": "200"
			},
			port: 80,
			protocol: "HTTP",
			tags: [
				{
					"key": "Group",
					"value": "Example"
				}
			],
			targetType: "ip",
			unhealthyThresholdCount: 4,
			vpcId: vpc.vpcId
		})

		new alb.CfnLoadBalancer(this, 'ExampleALB', {
			scheme: "internet-facing",
			securityGroups: [
				cdk.Fn.ref("ExampleSecurityGroup")
			],
			subnets: [
				vpc.publicSubnets[0].subnetId,
				vpc.publicSubnets[1].subnetId
			],
			tags: [
				{
					"key": "Group",
					"value": "Example"
				}
			],
			type: "application",
			ipAddressType: "ipv4",
		});

		new alb.CfnListener(this, 'ALBListenerProdTraffic', {
			defaultActions: [
				{
					"type": "forward",
					"forwardConfig": {
						"targetGroups": [
							{
								"targetGroupArn": cdk.Fn.ref("ALBTargetGroupBlue"),
								"weight": 1
							}
						]
					}
				}
			],
			loadBalancerArn: cdk.Fn.ref("ExampleALB"),
			port: 80,
			protocol: "HTTP",
		});

		new alb.CfnListenerRule(this, 'ALBListenerProdRule', {
			actions: [
				{
					"type": "forward",
					"forwardConfig": {
						"targetGroups": [
							{
								"targetGroupArn": cdk.Fn.ref("ALBTargetGroupBlue"),
								"weight": 1
							}
						]
					}
				}
			],
			conditions: [
				{
					"field": "http-header",
					"httpHeaderConfig": {
						"httpHeaderName": "User-Agent",
						"values": [
							"Mozilla"
						]
					}
				}
			],
			listenerArn: cdk.Fn.ref("ALBListenerProdTraffic"),
			priority: 1,
		});

		const role = new iam.Role(this, 'role', { assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com') })
		role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))

		new ecs.CfnTaskDefinition(this, 'BlueTaskDefinition', {
			executionRoleArn: role.roleArn,
			containerDefinitions: [
				{
					"name": "DemoApp",
					"image": app_asset.imageUri,
					"essential": true,
					"portMappings": [
						{
							"hostPort": 80,
							"protocol": "tcp",
							"containerPort": 80
						}
					]
				}
			],
			requiresCompatibilities: [
				"FARGATE"
			],
			networkMode: "awsvpc",
			cpu: "256",
			memory: "512",
			family: "ecs-demo",
		});

		new ecs.CfnCluster(this, 'ECSDemoCluster');

		new ecs.CfnService(this, 'ECSDemoService', {
			cluster: cdk.Fn.ref("ECSDemoCluster"),
			desiredCount: 1,
			deploymentController: {
				"type": "EXTERNAL"
			},
		});

		const blue_task = new ecs.CfnTaskSet(this, 'BlueTaskSet', {
			cluster: cdk.Fn.ref("ECSDemoCluster"),
			launchType: "FARGATE",
			networkConfiguration: {
				"awsVpcConfiguration": {
					"assignPublicIp": "ENABLED",
					"securityGroups": [
						cdk.Fn.ref("ExampleSecurityGroup")
					],
					"subnets": [
						vpc.publicSubnets[0].subnetId,
						vpc.publicSubnets[1].subnetId
					]
				}
			},
			platformVersion: "1.3.0",
			scale: {
				"unit": "PERCENT",
				"value": 1
			},
			service: cdk.Fn.ref("ECSDemoService"),
			taskDefinition: cdk.Fn.ref("BlueTaskDefinition"),
			loadBalancers: [
				{
					"containerName": "DemoApp",
					"containerPort": 80,
					"targetGroupArn": cdk.Fn.ref("ALBTargetGroupBlue")
				}
			],
		});

		new ecs.CfnPrimaryTaskSet(this, 'PrimaryTaskSet', {
			cluster: cdk.Fn.ref("ECSDemoCluster"),
			service: cdk.Fn.ref("ECSDemoService"),
			taskSetId: blue_task.attrId
		});
	}

	/**
			const scalableTarget = fargateService.service.autoScaleTaskCount({
				maxCapacity: 20,
				minCapacity: 1
			})
	
			scalableTarget.scaleOnCpuUtilization('CpuScaling', {
				targetUtilizationPercent: 50,
				scaleInCooldown: cdk.Duration.seconds(300),
				scaleOutCooldown: cdk.Duration.seconds(60)
			})
	
			scalableTarget.scaleOnRequestCount('RequestCountScaling', {
				requestsPerTarget: 1000,
				targetGroup: fargateService.targetGroup,
				scaleInCooldown: cdk.Duration.seconds(60),
				scaleOutCooldown: cdk.Duration.seconds(10)
			})
	
			scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
				targetUtilizationPercent: 90,
				scaleInCooldown: cdk.Duration.seconds(60),
				scaleOutCooldown: cdk.Duration.seconds(10)
			})
	
			new cdk.CfnOutput(this, 'LinkEcsClusterPage', {
				value: "https://"
					+ this.region
					+ ".console.aws.amazon.com/ecs/"
					+ "home?region="
					+ this.region
					+ "#/clusters/"
					+ cluster.clusterName
					+ "/fargateServices"
			})
	*/
}