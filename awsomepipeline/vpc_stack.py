from aws_cdk import (
    core,
    aws_ec2 as ec2
)

class VpcStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, *, from_vpc_name=None, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        if from_vpc_name is not None:
            self.vpc = ec2.Vpc.from_lookup(self, "vpc", vpc_name=from_vpc_name)
        else:
            self.vpc = ec2.Vpc(self, "vpc", max_azs=2)