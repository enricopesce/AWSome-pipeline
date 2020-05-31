from aws_cdk import (
    core,
    aws_ecs as ecs,
    aws_cloudwatch as cw
)

import jsii

class DashEcsCluster(core.Construct):
    def __init__(self, scope: core.Construct, id: str, cluster: ecs.Cluster, **kwargs):
        super().__init__(scope, id, **kwargs)
        cpu_utilization = cw.Metric(
            namespace="AWS/ECS",
            metric_name="CPUUtilization",
            dimensions={
                "ClusterName": cluster.cluster_name
            })

        cpu_widget = cw.GraphWidget(left=[cpu_utilization])
        dash = cw.Dashboard(self, "bagigio")
        dash.add_widgets(cpu_widget)


@jsii.implements(core.IAspect)
class PrintResource:

    def visit(self, node: core.IConstruct):
        # See that we're dealing with a Function
        if isinstance(node, ecs.Cluster):
            DashEcsCluster(node, "banana", node)
        print(type(node))
