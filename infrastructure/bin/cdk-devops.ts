#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { PipelineStack } from '../lib/pipeline-stack'
import { ApplicationStack } from '../lib/application-stack'

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

const app = new cdk.App()

function name(suffix: string) {
    return config.PROJECT_NAME + "-" + WORKING_BRANCH + "-" + suffix
}

new PipelineStack(app, name('pipeline'), 'my_secret_token', 'enricopesce', 'AWSome-pipeline', WORKING_BRANCH, { env: env })
new ApplicationStack(app, name('stg-app'), config.VPC_NAME, 'stg', '/', { env: env })
new ApplicationStack(app, name('prd-app'), config.VPC_NAME, 'prd', '/', { env: env })

app.synth()