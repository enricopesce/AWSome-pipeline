from aws_cdk import (
    aws_codepipeline as codepipeline,
    aws_codebuild as codebuild,
    aws_codepipeline_actions as codepipeline_actions,
    aws_kms as kms,
    aws_s3 as s3,
    aws_iam as iam,
    core
)


class PipelineStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, git_token_key: str, github_owner: str, github_repo: str,
                 github_branch: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        role = iam.Role(
            self,
            "Role",
            assumed_by=iam.ServicePrincipal("codebuild.amazonaws.com")
        )

        role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AdministratorAccess")
        )

        cdk_project = codebuild.PipelineProject(
            self,
            "Codebuild",
            build_spec=codebuild.BuildSpec.from_source_filename("codebuild/buildspec.yaml"),
            cache=codebuild.Cache.bucket(s3.Bucket(self, "Bucket")),
            environment=codebuild.BuildEnvironment(
                build_image=codebuild.LinuxBuildImage.STANDARD_2_0,
                privileged=True
                ),
            role=role
        )

        source_output = codepipeline.Artifact()
        staging_output = codepipeline.Artifact()
        production_output = codepipeline.Artifact()

        source_action = codepipeline_actions.GitHubSourceAction(
            action_name="GitHub_Source",
            owner=github_owner,
            repo=github_repo,
            branch=github_branch,
            oauth_token=core.SecretValue.secrets_manager(git_token_key),
            output=source_output
        )

        staging_action = codepipeline_actions.CodeBuildAction(
            action_name="Deliver",
            project=cdk_project,
            input=source_output,
            outputs=[staging_output],
            environment_variables={
                "ENV": {"value": "stg"}
            }
        )

        manual_approval_action = codepipeline_actions.ManualApprovalAction(
            action_name="Approve"
        )

        production_action = codepipeline_actions.CodeBuildAction(
            action_name="Deliver",
            project=cdk_project,
            input=source_output,
            outputs=[production_output],
            environment_variables={
                "ENV": {"value": "prd"}
            }
        )

        key = kms.Key(self, "key")
        bucket = s3.Bucket(self, "bucket_artifacts", encryption_key=key)
        pipeline = codepipeline.Pipeline(self, "Pipeline", artifact_bucket=bucket)
        pipeline.add_stage(stage_name="Source", actions=[source_action])
        pipeline.add_stage(stage_name="Staging", actions=[staging_action])
        pipeline.add_stage(stage_name="Approval", actions=[manual_approval_action])
        pipeline.add_stage(stage_name="Production", actions=[production_action])