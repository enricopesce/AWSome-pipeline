from aws_cdk import (
    core,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_ecr_assets as ecr_assets,
)

from vpc_stack import VpcStack
import os


def get_root_path():
    current_file = os.path.abspath(os.path.dirname(__file__))
    parent_of_parent_dir = os.path.join(current_file, '../../')
    return parent_of_parent_dir


class WebAppStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, *, from_vpc_name=None, health_check_path="/",
                 env_level="prd", env=None, **kwargs) -> None:
        super().__init__(scope, id, env=env, **kwargs)

        web_asset = ecr_assets.DockerImageAsset(self, 'web_asset',
                                                directory=get_root_path(),
                                                file="docker/web/Dockerfile")
        app_asset = ecr_assets.DockerImageAsset(self, 'app_asset',
                                                directory=get_root_path(),
                                                file="docker/app/Dockerfile")

        vpc = VpcStack(self, "vpc", from_vpc_name=from_vpc_name, env=env).vpc

        cluster = ecs.Cluster(self, "Cluster", vpc=vpc)

        alb_options = ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
            image=ecs.ContainerImage.from_ecr_repository(
                web_asset.repository,
                web_asset.image_uri[-64:]
            ),
            environment={
                "ENV": env_level,
            }
        )

        service = ecs_patterns.ApplicationLoadBalancedFargateService(
            self, "fargate",
            cluster=cluster,
            desired_count=1,
            task_image_options=alb_options,
            public_load_balancer=True,
            listener_port=80
        )

        service.target_group.configure_health_check(
            path=health_check_path,
            healthy_threshold_count=2,
            healthy_http_codes="200-399",
            unhealthy_threshold_count=2,
            timeout=core.Duration.seconds(10),
            interval=core.Duration.seconds(15)
        )

        service.target_group.enable_cookie_stickiness(core.Duration.hours(1))

        service.target_group.set_attribute("deregistration_delay.timeout_seconds", "10")

        service.task_definition.add_container(
            "app",
            image=ecs.ContainerImage.from_ecr_repository(
                app_asset.repository,
                app_asset.image_uri[-64:]
            ),
            logging=ecs.LogDriver.aws_logs(stream_prefix="fargate"),
            environment={
                "ENV": env_level,
            }
        )

        scalable_target = service.service.auto_scale_task_count(max_capacity=20)

        scalable_target.scale_on_request_count(
            "RequestCountScaling",
            requests_per_target=1000,
            target_group=service.target_group,
            scale_in_cooldown=core.Duration.seconds(60),
            scale_out_cooldown=core.Duration.seconds(10)
        )

        scalable_target.scale_on_cpu_utilization(
            "CpuScaling",
            target_utilization_percent=90,
            scale_in_cooldown=core.Duration.seconds(60),
            scale_out_cooldown=core.Duration.seconds(10)
        )

        scalable_target.scale_on_memory_utilization(
            "MemoryScaling",
            target_utilization_percent=90,
            scale_in_cooldown=core.Duration.seconds(60),
            scale_out_cooldown=core.Duration.seconds(10)
        )

        core.CfnOutput(self, "LinkEcsClusterPage", value="https://"
                                                         + self.region
                                                         + ".console.aws.amazon.com/ecs/"
                                                         + "home?region="
                                                         + self.region
                                                         + "#/clusters/"
                                                         + cluster.cluster_name
                                                         + "/services")