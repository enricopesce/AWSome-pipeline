#!/usr/bin/env python3

import os

from aws_cdk import core
from pygit2 import Repository

from application_stack import WebAppStack
from pipeline_stack import PipelineStack

WORKING_BRANCH = os.environ.get('WORKING_BRANCH')

if WORKING_BRANCH is None:
    WORKING_BRANCH = Repository('../').head.shorthand

PROJECT_NAME = "awsome"


def name(suffix: str):
    return PROJECT_NAME + "-" + WORKING_BRANCH + "-" + suffix


env = core.Environment(
    account=os.environ["CDK_DEFAULT_ACCOUNT"],
    region=os.environ["CDK_DEFAULT_REGION"])

app = core.App()

context = app.node.try_get_context("stack")

if context == "prd":
    WebAppStack(app, name("prd"),
                env=env)
elif context == "stg":
    WebAppStack(app, name("stg"),
                env_level="stg",
                env=env)
elif context == "pipeline":
    PipelineStack(app, name("pipeline"),
                  git_token_key="my_secret_token",
                  github_branch=WORKING_BRANCH,
                  github_owner="enricopesce",
                  github_repo="AWSome-pipeline",
                  env=env)
else:
    print("Please define the stack context: prd | stg | pipeline. es: --context stack=pipeline")

app.synth()
