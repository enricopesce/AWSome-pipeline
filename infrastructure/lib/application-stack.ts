import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import * as ecs_patterns from '@aws-cdk/aws-ecs-patterns'
import * as ec2 from '@aws-cdk/aws-ec2'

export class ApplicationStack extends cdk.Stack {
	private fargateService: ecs_patterns.ApplicationLoadBalancedFargateService
	public readonly urlOutput: cdk.CfnOutput;

	constructor(scope: cdk.Construct, id: string, vpc_name: string, props?: cdk.StackProps) {
		super(scope, id, props)

		console.log("VPC NAME: ")
		console.log(JSON.stringify(vpc_name))
		console.log("PROPS: ")
		console.log(JSON.stringify(props))

		const vpc = ec2.Vpc.fromLookup(this, "vpc", { vpcName: vpc_name })
		//const vpc = new ec2.Vpc(this, "vpc", { maxAzs: 2 })

		console.log("VPC IMPORTED ")
		console.log(vpc)

		const sg = new ec2.SecurityGroup(this, 'sg', {
			vpc: vpc
		})

	}
}

