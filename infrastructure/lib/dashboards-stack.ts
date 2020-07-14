import * as cloudwatch from '@aws-cdk/aws-cloudwatch'
import { Construct } from '@aws-cdk/core';

export interface DashboardEcsProps {
    readonly DashboardName: string
    readonly EcsClusterName: string
    readonly EcsServicName: string
    readonly EcsLogStreams: string[]  
  }

export class DashboardEcsStack extends Construct implements DashboardEcsProps {
    readonly DashboardName: string
    readonly EcsClusterName: string
    readonly EcsServicName: string
    readonly EcsLogStreams: [string]

    constructor(scope: Construct, id: string, props: DashboardEcsProps) {
        super(scope, id)
        const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
            dashboardName: props.DashboardName
        })

        dashboard.addWidgets(
            this.buildEcsWidget('CPUUtilization', props),
            this.buildEcsWidget('MemoryUtilization', props)
        )

        for (let stream of props.EcsLogStreams) {
            dashboard.addWidgets(
                this.buildLogWidget(stream)
            )
        }
    }

    private buildEcsWidget(metricName: string, props: DashboardEcsProps, statistic: string = 'avg'): cloudwatch.GraphWidget {
        return new cloudwatch.GraphWidget({
            title: metricName,
            left: [new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: metricName,
                dimensions: {
                    ClusterName: props.EcsClusterName,
                    ServiceName: props.EcsServicName
                },
                statistic: statistic
            })]
        })
    }

    private buildLogWidget(logGroupName: string): cloudwatch.LogQueryWidget {
        return new cloudwatch.LogQueryWidget({
            logGroupNames: [logGroupName],
            queryLines: [
                'fields @message'
              ]
        })
    }

}

