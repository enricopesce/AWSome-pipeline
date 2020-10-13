#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { ApplicationStack } from '../lib/application-stack'
import * as codepipeline from '@aws-cdk/aws-codepipeline'
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions'
import * as pipelines from '@aws-cdk/pipelines'
import * as ec2 from '@aws-cdk/aws-ec2'

export interface Config {
    PROJECT_NAME: string
    VPC_NAME: string
}

let config: Config = require('../app_config.json');

const currentGitBranch = require('current-git-branch')

let WORKING_BRANCH = process.env.WORKING_BRANCH as string

if (WORKING_BRANCH === undefined) {
    WORKING_BRANCH = currentGitBranch() as string
}

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
}

console.log(env)

const app = new cdk.App()

function name(suffix: string) {
    return config.PROJECT_NAME + "-" + WORKING_BRANCH + "-" + suffix
}

export class ApplicationStage extends cdk.Stage {
    public readonly urlOutput: cdk.CfnOutput
    constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props)
        const service = new ApplicationStack(this, id, config.VPC_NAME, props)
        this.urlOutput = service.urlOutput
    }
} 

/* 
export class ApplicationStage extends cdk.Stage {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props)
        new VpcStack(this, "vpc")
    }
} 

export class VpcStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)
        const vpc = new ec2.Vpc(this, "vpc", { maxAzs: 2 })
    }
}   
*/

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, gitToken: string, github_owner: string, github_repo: string,
        github_branch: string, props?: cdk.StackProps) {
        super(scope, id, props)

        const sourceArtifact = new codepipeline.Artifact()
        const cloudAssemblyArtifact = new codepipeline.Artifact()

        const pipeline = new pipelines.CdkPipeline(this, 'Pipeline', {
            cloudAssemblyArtifact,
            crossAccountKeys: false,
            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'GitHub_Source',
                owner: github_owner,
                repo: github_repo,
                branch: github_branch,
                oauthToken: cdk.SecretValue.secretsManager(gitToken),
                output: sourceArtifact
            }),
            synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
                sourceArtifact,
                cloudAssemblyArtifact,
                subdirectory: 'infrastructure',
                buildCommand: 'npm run build',
                environmentVariables: {
                    'WORKING_BRANCH': {
                        value: github_branch
                    }
                }
            }),
        })

        const staging = pipeline.addApplicationStage(new ApplicationStage(this, 'stg', {
            env: env
        }))
    }
}

new PipelineStack(app, name('pipeline'), 'my_secret_token', 'enricopesce', 'AWSome-pipeline', WORKING_BRANCH, { env: env })

//new ApplicationStack(app, "test", config.VPC_NAME, { env: env })

app.synth()