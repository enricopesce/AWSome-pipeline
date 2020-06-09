import 'source-map-support/register'
import * as path from 'path'
import * as cdk from '@aws-cdk/core'
import * as ecs from '@aws-cdk/aws-ecs'
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns'
import * as ecr_assets from '@aws-cdk/aws-ecr-assets'
import * as ec2 from '@aws-cdk/aws-ec2'

export class ApplicationStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, vpc: ec2.IVpc, env_level: string = 'prd', health_check_path: string = '/',
		props?: cdk.StackProps) {
		super(scope, id, props)

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

		const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'fargate', {
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

		fargateService.targetGroup.configureHealthCheck({
			path: health_check_path,
			healthyThresholdCount: 2,
			healthyHttpCodes: '200-399',
			unhealthyThresholdCount: 2,
			timeout: cdk.Duration.seconds(10),
			interval: cdk.Duration.seconds(15)
		})

		fargateService.targetGroup.enableCookieStickiness(cdk.Duration.hours(1))

		fargateService.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "10")

		fargateService.taskDefinition.addContainer('app', {
			image: ecs.ContainerImage.fromDockerImageAsset(app_asset),
			logging: ecs.LogDriver.awsLogs({ streamPrefix: 'fargate' }),
			environment: {
				ENV: env_level
			}
		})

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

	}
}
