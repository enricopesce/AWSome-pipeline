#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { VpcStack } from '../lib/vpc-stack'
import { PipelineStack } from '../lib/pipeline-stack'
import { ApplicationStack } from '../lib/application-stack'

const currentGitBranch = require('current-git-branch')

var WORKING_BRANCH = <string>process.env.WORKING_BRANCH

if (WORKING_BRANCH === undefined) {
    WORKING_BRANCH = <string>currentGitBranch()
}

const PROJECT_NAME = 'devops'

const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
}

const app = new cdk.App()
const context = app.node.tryGetContext('tier')

function name(suffix: string) {
    return PROJECT_NAME + "-" + WORKING_BRANCH + "-" + suffix
}

var vpc

switch (context) {
    case 'pipeline':
        new PipelineStack(app, name('pipeline'), 'my_secret_token', 'enricopesce', 'AWSome-pipeline', WORKING_BRANCH, { env: env })
        break;
    case 'stg':
        vpc = new VpcStack(app, name('vpc'), undefined, { env: env }).vpc
        new ApplicationStack(app, name('stg'), vpc, 'stg', '/', { env: env })
        break;
    case 'prd':
        vpc = new VpcStack(app, name('vpc'), undefined, { env: env }).vpc
        new ApplicationStack(app, name('prd'), vpc, 'prd', '/', { env: env })
        break;
    default:
        console.log('Please define the tier context: prd | stg | pipeline. es: --context tier=pipeline')
        break;
}

app.synth()