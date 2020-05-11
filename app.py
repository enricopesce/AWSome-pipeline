#!/usr/bin/env python3

import os

from aws_cdk import core
from pygit2 import Repository

from awsomepipeline.application_stack import WebAppStack
from awsomepipeline.pipeline_stack import PipelineStack
from awsomepipeline.vpc_stack import VpcStack

WORKING_BRANCH = "issue-6"

PROJECT_NAME = "awsome"


def name(suffix: str):
    return PROJECT_NAME + "-" + WORKING_BRANCH + "-" + suffix


env = core.Environment(
    account=os.environ["CDK_DEFAULT_ACCOUNT"],
    region=os.environ["CDK_DEFAULT_REGION"])

app = core.App()

context = app.node.try_get_context("stack")

if context == "prd" or context == "stg":
    stack_vpc = VpcStack(app, name("vpc"), env=env)
    if context == "prd":
        WebAppStack(app,
                    name("prd"),
                    vpc=stack_vpc.vpc,
                    env=env)
    elif context == "stg":
        WebAppStack(app,
                    name("stg"),
                    vpc=stack_vpc.vpc,
                    env_level="stg",
                    env=env)
elif context == "pipeline":
    PipelineStack(
        app,
        name("pipeline"),
        git_token_key="my_secret_token",
        github_branch=WORKING_BRANCH,
        github_owner="enricopesce",
        github_repo="AWSome-pipeline",
        env=env)
else:
    print("Please define the stack context: prd | stg | pipeline. es: --context stack=pipeline")

app.synth()
