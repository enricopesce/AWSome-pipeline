import 'source-map-support/register'
import { Stack, StackProps, Duration, CfnOutput, SecretValue, RemovalPolicy } from 'aws-cdk-lib';
import { aws_iam, aws_codebuild, aws_codepipeline, aws_codepipeline_actions, aws_s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, gitToken: string, github_owner: string, github_repo: string,
        github_branch: string, props?: StackProps) {
        super(scope, id, props)

        const role = new aws_iam.Role(this, 'role', { assumedBy: new aws_iam.ServicePrincipal('codebuild.amazonaws.com') })
        role.addManagedPolicy(aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))

        const project = new aws_codebuild.PipelineProject(this, 'pipelineProject', {
            buildSpec: aws_codebuild.BuildSpec.fromSourceFilename('infrastructure/codebuild/buildspec.yaml'),
            cache: aws_codebuild.Cache.bucket(
                new aws_s3.Bucket(this, 'cache', {
                    removalPolicy: RemovalPolicy.DESTROY, 
                    autoDeleteObjects: true
                })
            ),
            environment: {
                buildImage: aws_codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true
            },
            role: role
        })

        const source_output = new aws_codepipeline.Artifact()
        const staging_output = new aws_codepipeline.Artifact()
        const production_output = new aws_codepipeline.Artifact()

        const source_action = new aws_codepipeline_actions.GitHubSourceAction({
            actionName: 'GitHub_Source',
            owner: github_owner,
            repo: github_repo,
            branch: github_branch,
            oauthToken: SecretValue.secretsManager(gitToken),
            output: source_output
        })

        const staging_action = new aws_codepipeline_actions.CodeBuildAction({
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

        const manual_approval_action = new aws_codepipeline_actions.ManualApprovalAction({
            actionName: 'Approve'
        })

        const production_action = new aws_codepipeline_actions.CodeBuildAction({
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

        const bucketArtifacts = new aws_s3.Bucket(this, 'artifacts', {
            removalPolicy: RemovalPolicy.DESTROY, 
            autoDeleteObjects: true
        })

        const pipeline = new aws_codepipeline.Pipeline(this, "Pipeline", {
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

        new CfnOutput(this, 'LinkCodePipelinePage', {
            value: "https://"
                + this.region
                + ".console.aws.amazon.com/codesuite/"
                + "codepipeline/pipelines/"
                + pipeline.pipelineName
                + "/view?region=" + this.region
        })
    }
}
