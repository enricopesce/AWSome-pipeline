#!/usr/bin/env python3

from aws_cdk import core
from awsomepipeline.application_stack import WebAppStack
from awsomepipeline.pipeline_stack import PipelineStack
from awsomepipeline.vpc_stack import VpcStack

app = core.App()

context = app.node.try_get_context("env")

stack_vpc = VpcStack(app,"awsome-vpc")

if context == "prd":
    WebAppStack(app, "awsome-prd", vpc=stack_vpc.vpc)
elif context == "stg":
    WebAppStack(app, "awsome-stg", vpc=stack_vpc.vpc, env_level="stg")
elif context == "pipeline":
    PipelineStack(
        app,
        "AWSome-pipeline",
        git_token_key="my_secret_token",
        github_branch="master",
        github_owner="enricopesce",
        github_repo="AWSome-pipeline"
    )
else:
    print("Please define the tier context: prd | stg | pipeline. es: --context env=pipeline")

app.synth()
