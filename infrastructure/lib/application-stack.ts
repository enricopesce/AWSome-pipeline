import 'source-map-support/register'
import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as ecs from '@aws-cdk/aws-ecs'
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns'
import * as ecr_assets from '@aws-cdk/aws-ecr-assets'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as dashboards from './dashboards-stack';

export class ApplicationStack extends cdk.Stack {
	private fargateService: ecs_patterns.ApplicationLoadBalancedFargateService
	public readonly urlOutput: cdk.CfnOutput;

	constructor(scope: cdk.Construct, id: string, vpc_name: string, env_level: string = 'prd', health_check_path: string = '/',
		props?: cdk.StackProps) {
		super(scope, id, props)

/* 		console.log("OUTPUT2 ")
        console.log(JSON.stringify(vpc_name))
        console.log("OUTPUT2 ")
        console.log(JSON.stringify(props)) */

		//const vpc = ec2.Vpc.fromLookup(this, "vpc", { vpcName: vpc_name })
		const vpc = new ec2.Vpc(this, "vpc", { maxAzs: 2 })
/* 
		console.log("OUTPUT2 ")
        console.log(vpc)
 */
		const web_asset = new ecr_assets.DockerImageAsset(this, 'web_asset', {
			directory: path.join(__dirname, '../../'),
			file: 'docker/web/Dockerfile',
		})

		const app_asset = new ecr_assets.DockerImageAsset(this, 'app_asset', {
			directory: path.join(__dirname, '../../'),
			file: 'docker/app/Dockerfile',
		})

		const cluster = new ecs.Cluster(this, "cluster", {
			vpc: vpc
		})

		this.fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'fargate', {
			cluster: cluster,
			desiredCount: 1,
			taskImageOptions: {
				image: ecs.ContainerImage.fromDockerImageAsset(web_asset),
				environment: {
					ENV: env_level
				},
			},
			publicLoadBalancer: true,
			listenerPort: 80
		})

		this.fargateService.targetGroup.configureHealthCheck({
			path: health_check_path,
			healthyThresholdCount: 2,
			healthyHttpCodes: '200-399',
			unhealthyThresholdCount: 2,
			timeout: cdk.Duration.seconds(10),
			interval: cdk.Duration.seconds(15)
		})

		this.fargateService.targetGroup.enableCookieStickiness(cdk.Duration.hours(1))

		this.fargateService.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "10")

		this.fargateService.taskDefinition.addContainer('app', {
			image: ecs.ContainerImage.fromDockerImageAsset(app_asset),
			logging: ecs.LogDriver.awsLogs({ streamPrefix: 'fargate' }),
			environment: {
				ENV: env_level
			}
		})

		const scalableTarget = this.fargateService.service.autoScaleTaskCount({
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
			targetGroup: this.fargateService.targetGroup,
			scaleInCooldown: cdk.Duration.seconds(60),
			scaleOutCooldown: cdk.Duration.seconds(10)
		})

		scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
			targetUtilizationPercent: 90,
			scaleInCooldown: cdk.Duration.seconds(60),
			scaleOutCooldown: cdk.Duration.seconds(10)
		})

		new dashboards.DashboardEcs(this, "ecsdashboard", {
			DashboardName: this.stackName,
			EcsClusterName: cluster.clusterName,
			EcsServicName: this.fargateService.service.serviceName,
			EcsLogStreams: [ this.getLogStream("app"), this.getLogStream("web") ] 
        })

		new dashboards.DashboardAlb(this, "albdashboard", {
			DashboardName: this.stackName,
			AlbName: this.fargateService.loadBalancer.loadBalancerFullName,
			AlbTargetGroupName: this.fargateService.targetGroup.targetGroupFullName
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

		new cdk.CfnOutput(this, 'LinkCloudWatchDashboard', {
			value: "https://"
				+ this.region
				+ ".console.aws.amazon.com/cloudwatch/"
				+ "/home?region=" + this.region
				+ "#dashboards:name=" + this.stackName
		})

		this.urlOutput = new cdk.CfnOutput(this, 'Url', {
			value: this.fargateService.loadBalancer.loadBalancerDnsName
		  });
	}

    /**
     * getAppLogStream
     */
	private getLogStream(containerName: string): string {
		const task_def = this.fargateService.service.taskDefinition
		const container = task_def.node.tryFindChild(containerName) as ecs.ContainerDefinition
		if (container.logDriverConfig?.options != undefined) {
			return container.logDriverConfig?.options["awslogs-group"]
		} else {
			return ""
		}
	}

}

