#!/usr/bin/env python3

from aws_cdk import core
from awsomepipeline.application_stack import WebAppStack
from awsomepipeline.pipeline_stack import PipelineStack
from awsomepipeline.vpc_stack import VpcStack
import os

env=core.Environment(
    account=os.environ["CDK_DEFAULT_ACCOUNT"],
    region=os.environ["CDK_DEFAULT_REGION"])

app = core.App()

context = app.node.try_get_context("stack")

stack_vpc = VpcStack(app,"awsome-vpc", env=env)

if context == "prd":
    WebAppStack(app, "awsome-prd", vpc=stack_vpc.vpc, env=env)
elif context == "stg":
    WebAppStack(app, "awsome-stg", vpc=stack_vpc.vpc, env_level="stg", env=env)
elif context == "pipeline":
    PipelineStack(
        app,
        "AWSome-pipeline",
        git_token_key="my_secret_token",
        github_branch="master",
        github_owner="enricopesce",
        github_repo="AWSome-pipeline",
        env=env
    )
else:
    print("Please define the stack context: prd | stg | pipeline. es: --context stack=pipeline")

app.synth()
