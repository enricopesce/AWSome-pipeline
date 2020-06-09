import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'

export class VpcStack extends cdk.Stack {

  public vpc: ec2.IVpc

  constructor(scope: cdk.Construct, id: string, vpcname?: string, props?: cdk.StackProps) {
    super(scope, id, props)

    if (vpcname == undefined) {
      this.vpc = new ec2.Vpc(this, "vpc", { maxAzs: 2 } )
    } else {
      this.vpc = ec2.Vpc.fromLookup(this, "vpc", { vpcName: vpcname })
    }

  }
}
