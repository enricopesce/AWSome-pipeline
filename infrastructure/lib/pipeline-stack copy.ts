import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as codebuild from '@aws-cdk/aws-codebuild'
import * as codepipeline from '@aws-cdk/aws-codepipeline'
import * as codepipelineActions from '@aws-cdk/aws-codepipeline-actions'
import { AutoDeleteBucket } from '@mobileposse/auto-delete-bucket'

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, gitToken: string, github_owner: string, github_repo: string,
        github_branch: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const role = new iam.Role(this, 'role', { assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com') })
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))

        const project = new codebuild.PipelineProject(this, 'pipelineProject', {
            buildSpec: codebuild.BuildSpec.fromSourceFilename('infrastructure/codebuild/buildspec.yaml'),
            cache: codebuild.Cache.bucket(
                new AutoDeleteBucket(this, 'cache')
            ),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true
            },
            role: role
        })

        const source_output = new codepipeline.Artifact()
        const staging_output = new codepipeline.Artifact()
        const production_output = new codepipeline.Artifact()

        const source_action = new codepipelineActions.GitHubSourceAction({
            actionName: 'GitHub_Source',
            owner: github_owner,
            repo: github_repo,
            branch: github_branch,
            oauthToken: cdk.SecretValue.secretsManager(gitToken),
            output: source_output
        })

        const staging_action = new codepipelineActions.CodeBuildAction({
            actionName: 'Deliver',
            project: project,
            input: source_output,
            outputs: [staging_output],
            environmentVariables: {
                'ENV': {
                    value: 'stg',
                },
                'WORKING_BRANCH': {
                    value: github_branch
                }
            }
        })

        const manual_approval_action = new codepipelineActions.ManualApprovalAction({
            actionName: 'Approve'
        })

        const production_action = new codepipelineActions.CodeBuildAction({
            actionName: 'Deliver',
            project: project,
            input: source_output,
            outputs: [production_output],
            environmentVariables: {
                'ENV': {
                    value: 'prd',
                },
                'WORKING_BRANCH': {
                    value: github_branch
                }
            }
        })

        const bucketArtifacts = new AutoDeleteBucket(this, 'artifacts')

        const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
            artifactBucket: bucketArtifacts
        })

        pipeline.addStage({
            stageName: 'Source',
            actions: [source_action]
        })

        pipeline.addStage({
            stageName: 'Staging',
            actions: [staging_action]
        })

        pipeline.addStage({
            stageName: 'Approval',
            actions: [manual_approval_action]
        })

        pipeline.addStage({
            stageName: 'Production',
            actions: [production_action]
        })

        new cdk.CfnOutput(this, 'LinkCodePipelinePage', {
            value: "https://"
                + this.region
                + ".console.aws.amazon.com/codesuite/"
                + "codepipeline/pipelines/"
                + pipeline.pipelineName
                + "/view?region=" + this.region
        })
    }
}
