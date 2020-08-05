import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import * as codepipeline from '@aws-cdk/aws-codepipeline'
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions'
import * as pipelines from '@aws-cdk/pipelines';

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, gitToken: string, github_owner: string, github_repo: string,
        github_branch: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const pipeline = new pipelines.CdkPipeline(this, 'Pipeline', {
            cloudAssemblyArtifact,
            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'GitHub_Source',
                owner: github_owner,
                repo: github_repo,
                branch: github_branch,
                oauthToken: cdk.SecretValue.secretsManager(gitToken),
                output: sourceArtifact
            }),
            synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
                actionName: 'banana',
                sourceArtifact,
                cloudAssemblyArtifact,
                subdirectory: 'infrastructure',
                environmentVariables: {
                    'WORKING_BRANCH': {
                        value: github_branch
                    }
                }
            }),
        });

        /*     const staging_action = new codepipelineActions.CodeBuildAction({
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
            }) */
    }
}
