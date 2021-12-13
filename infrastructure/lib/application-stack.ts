import 'source-map-support/register'
import * as path from 'path'
import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { aws_ecs, aws_ecs_patterns, aws_ecr_assets, aws_ec2 } from 'aws-cdk-lib';
import * as dashboards from './dashboards-stack';
import { Construct } from 'constructs';

export class ApplicationStack extends Stack {
	private fargateService: aws_ecs_patterns.ApplicationLoadBalancedFargateService

	constructor(scope: Construct, id: string, vpc_name: string, env_level: string = 'prd', health_check_path: string = '/',
		props?: StackProps) {
		super(scope, id, props)

		const vpc = aws_ec2.Vpc.fromLookup(this, "vpc", { vpcName: vpc_name })

		const web_asset = new aws_ecr_assets.DockerImageAsset(this, 'web_asset', {
			directory: path.join(__dirname, '../../'),
			file: 'docker/web/Dockerfile',
		})

		const app_asset = new aws_ecr_assets.DockerImageAsset(this, 'app_asset', {
			directory: path.join(__dirname, '../../'),
			file: 'docker/app/Dockerfile',
		})

		const cluster = new aws_ecs.Cluster(this, "cluster", {
			vpc: vpc
		})

		this.fargateService = new aws_ecs_patterns.ApplicationLoadBalancedFargateService(this, 'fargate', {
			cluster: cluster,
			desiredCount: 1,
			taskImageOptions: {
				image: aws_ecs.ContainerImage.fromDockerImageAsset(web_asset),
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
			timeout: Duration.seconds(10),
			interval: Duration.seconds(15)
		})

		this.fargateService.targetGroup.enableCookieStickiness(Duration.hours(1))

		this.fargateService.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "10")

		this.fargateService.taskDefinition.addContainer('app', {
			image: aws_ecs.ContainerImage.fromDockerImageAsset(app_asset),
			logging: aws_ecs.LogDriver.awsLogs({ streamPrefix: 'fargate' }),
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
			scaleInCooldown: Duration.seconds(300),
			scaleOutCooldown: Duration.seconds(60)
		})

		scalableTarget.scaleOnRequestCount('RequestCountScaling', {
			requestsPerTarget: 1000,
			targetGroup: this.fargateService.targetGroup,
			scaleInCooldown: Duration.seconds(60),
			scaleOutCooldown: Duration.seconds(10)
		})

		scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
			targetUtilizationPercent: 90,
			scaleInCooldown: Duration.seconds(60),
			scaleOutCooldown: Duration.seconds(10)
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

		new CfnOutput(this, 'LinkEcsClusterPage', {
			value: "https://"
				+ this.region
				+ ".console.aws.amazon.com/ecs/"
				+ "home?region="
				+ this.region
				+ "#/clusters/"
				+ cluster.clusterName
				+ "/fargateServices"
		})

		new CfnOutput(this, 'LinkCloudWatchDashboard', {
			value: "https://"
				+ this.region
				+ ".console.aws.amazon.com/cloudwatch/"
				+ "/home?region=" + this.region
				+ "#dashboards:name=" + this.stackName
		})
	}


    /**
     * getAppLogStream
     */
	private getLogStream(containerName: string): string {
		const task_def = this.fargateService.service.taskDefinition
		const container = task_def.node.tryFindChild(containerName) as aws_ecs.ContainerDefinition
		if (container.logDriverConfig?.options != undefined) {
			return container.logDriverConfig?.options["awslogs-group"]
		} else {
			return ""
		}
	}

}

