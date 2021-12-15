import { Construct } from 'constructs';
import { aws_cloudwatch } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';

export interface DashboardEcsProps {
    readonly DashboardName: string
    readonly EcsClusterName: string
    readonly EcsServicName: string
    readonly EcsLogStreams: string[]
}

export interface DashboardAlbProps {
    readonly DashboardName: string,
    readonly AlbTargetGroupName: string,
    readonly AlbName: string
}

export class DashboardAlb extends Construct implements DashboardAlbProps {
    readonly DashboardName: string
    readonly AlbTargetGroupName: string
    readonly AlbName: string

    constructor(scope: Construct, id: string, props: DashboardAlbProps) {
        super(scope, id)
        const dashboard = new aws_cloudwatch.Dashboard(this, 'albdashboard', {
            dashboardName: props.DashboardName + "-alb"
        })

        dashboard.addWidgets(
            this.buildAlbWidget('NewConnectionCount', props, 'sum'),
            this.buildAlbWidget('ActiveConnectionCount', props, 'sum'), 
            this.buildAlbWidget('RequestCount', props, 'sum'),
            this.buildAlbWidget('TargetResponseTime', props),
            this.buildAlbWidget('RequestCountPerTarget', props, 'sum'),
            this.buildAlbWidget('TargetConnectionErrorCount', props, 'sum'),
            this.buildAlbWidget('UnHealthyHostCount', props)
        )
    }

    private buildAlbWidget(metricName: string, props: DashboardAlbProps, statistic: string = 'avg',
        period: Duration = Duration.minutes(5), widgetName?: string): aws_cloudwatch.GraphWidget {

        if (widgetName === undefined) {
            widgetName = metricName
        }

        return new aws_cloudwatch.GraphWidget({
            title: widgetName,
            width: 8,
            height: 6,
            left: [new aws_cloudwatch.Metric({
                namespace: 'AWS/ApplicationELB',
                metricName: metricName,
                dimensionsMap: {
                    TargetGroup: props.AlbTargetGroupName,
                    LoadBalancer: props.AlbName
                },
                statistic: statistic,
                period: period
            })]
        })
    }
}

export class DashboardEcs extends Construct implements DashboardEcsProps {
    readonly DashboardName: string
    readonly EcsClusterName: string
    readonly EcsServicName: string
    readonly EcsLogStreams: [string]

    constructor(scope: Construct, id: string, props: DashboardEcsProps) {
        super(scope, id)
        const dashboard = new aws_cloudwatch.Dashboard(this, 'ecsdashboard', {
            dashboardName: props.DashboardName + "-ecs"
        })

        dashboard.addWidgets(
            this.buildEcsWidget('CPUUtilization', props),
            this.buildEcsWidget('MemoryUtilization', props),
            this.buildEcsWidget('CPUUtilization', props, 'SampleCount', Duration.minutes(1), "RunningTasks")
        )

        for (let stream of props.EcsLogStreams) {
            dashboard.addWidgets(
                this.buildLogWidget(stream)
            )
        }
    }

    private buildEcsWidget(metricName: string, props: DashboardEcsProps, statistic: string = 'avg',
        period: Duration = Duration.minutes(5), widgetName?: string): aws_cloudwatch.GraphWidget {

        if (widgetName === undefined) {
            widgetName = metricName
        }

        return new aws_cloudwatch.GraphWidget({
            title: widgetName,
            width: 8,
            height: 6,
            left: [new aws_cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: metricName,
                dimensionsMap: {
                    ClusterName: props.EcsClusterName,
                    ServiceName: props.EcsServicName
                },
                statistic: statistic,
                period: period
            })]
        })
    }

    private buildLogWidget(logGroupName: string): aws_cloudwatch.LogQueryWidget {
        return new aws_cloudwatch.LogQueryWidget({
            width: 24,
            height: 6,
            logGroupNames: [logGroupName],
            queryLines: [
                'fields @message'
            ]
        })
    }

}

