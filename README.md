# AWSome Pipeline

> Example how with [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) you can deploy a continuous delivery
> pipeline using [AWS CodePipeline](https://aws.amazon.com/codepipeline/), [AWS CodeBuild](https://aws.amazon.com/codebuild/) and
> [AWS Fargate](https://aws.amazon.com/fargate/).
> I have included all the best practices with a strong focus on the [KISS principle](https://en.wikipedia.org/wiki/KISS_principle).
> The infrastructure code is written in [TypeScript](https://www.typescriptlang.org/). The infrastructure is a [sidecar](https://aws.amazon.com/blogs/compute/nginx-reverse-proxy-sidecar-container-on-amazon-ecs/)
> with [Nginx](http://nginx.org/) as proxy and a [Flask](https://palletsprojects.com/p/flask/) "hello world" application on [Gunicorn](https://gunicorn.org/)

## Folder structure

```bash
code
docker
infrastructure
```

### code directory

dedicated to Flask code

### docker directory

dedicated to Docker definitions: sidecard of Nginx + Gunicorn

### infrastructure directory

dedicated to AWS CDK infrastructure definition

## Installation and requirements

```bash
cd infrastructure
```

### Install the CDK framework

```bash
npm install -g aws-cdk
```

### Install the dependencies

```bash
npm install
```

### Authenticate in your AWS account:

Follow this guide: [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

### Configure GitHub Token

Create a [personal access token in GitHub](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line)
and store it in [AWS SecretsManager](https://aws.amazon.com/secrets-manager/).
Needed to configure your repo webhooks.

```bash
aws secretsmanager create-secret \
    --name my_secret_token \
    --secret-string yourtokenhereyourtokenhere \
    --region eu-west-1
```

## Usage

The first step is to exporting the AWS variables to obtain the rights:

```bash
export AWS_PROFILE="profilename"
export AWS_DEFAULT_REGION="eu-west-1"
```

### Configuring the application

edit the app_config.json file for defining the project name and the existing VPC

```json
{
    "PROJECT_NAME": "awsome",
    "VPC_NAME": "default"
}
```

### Deploy the pipeline an get the codepipeline endpoint

You can create a continuous intergration service binded to your current git branch.

Suppose that you are in the master branch:

```bash
git branch --show-current
master
```

You can create the infrastructure based on the current master branch:

```bash
cdk deploy "*" --context tier=pipeline

 ✅  awsome-master-pipeline

Outputs:
awsome-master-pipeline.LinkCodePipelinePage = https://eu-west-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/awsome-master-pipeline-PipelineC660917D-11U99LG5Y4H4V/view?region=eu-west-1
```

The pipeline after the creation and after every commits in the branch assigned will be triggered. It launches the staging env end, after a manual approval, the production env.
<<<<<<< HEAD

Alternatively you can deploy staging env from your computer and get the staging http endpoints:

```bash
cdk deploy "*" --context tier=stg

 ✅  awsome-master-stg-app

Outputs:
awsome-master-stg-app.fargateLoadBalancerDNSB13ECB0B = awsom-farga-1KNVPTS0GNV8J-XXXXXXXXX.eu-west-1.elb.amazonaws.com
awsome-master-stg-app.LinkEcsClusterPage = https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/awsome-master-stg-app-cluster611F8AFF-okLxuoDdfc1o/fargateServices
awsome-master-stg-app.LinkCLoudWatchDashboard = https://eu-west-1.console.aws.amazon.com/cloudwatch//home?region=eu-west-1#dashboards:name=awsome-dashboard-stg-app
awsome-master-stg-app.fargateServiceURL145CCBE8 = http://awsom-farga-1KNVPTS0GNV8J-XXXXXXXXX.eu-west-1.elb.amazonaws.com
```

=======

Alternatively you can deploy staging env from your computer and get the staging http endpoints:

```bash
cdk deploy "*" --context tier=stg

 ✅  awsome-master-stg-app

Outputs:
awsome-master-stg-app.fargateLoadBalancerDNSB13ECB0B = awsom-farga-1KNVPTS0GNV8J-XXXXXXXXX.eu-west-1.elb.amazonaws.com
awsome-master-stg-app.LinkEcsClusterPage = https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/awsome-master-stg-app-cluster611F8AFF-okLxuoDdfc1o/fargateServices
awsome-master-stg-app.LinkCLoudWatchDashboard = https://eu-west-1.console.aws.amazon.com/cloudwatch//home?region=eu-west-1#dashboards:name=awsome-dashboard-stg-app
awsome-master-stg-app.fargateServiceURL145CCBE8 = http://awsom-farga-1KNVPTS0GNV8J-XXXXXXXXX.eu-west-1.elb.amazonaws.com
```

>>>>>>> master
or you can deploy the production env from your computer and get the production http endpoints:

```bash
cdk deploy "*" --context tier=prd
 ✅  awsome-master-prd-app

Outputs:
awsome-master-prd-app.fargateLoadBalancerDNSB13ECB0B = awsom-farga-1KNVPTS0GNV8J-XXXXXXXXX.eu-west-1.elb.amazonaws.com
awsome-master-prd-app.LinkEcsClusterPage = https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/awsome-master-prd-app-cluster611F8AFF-okLxuoDdfc1o/fargateServices
awsome-master-prd-app.LinkCLoudWatchDashboard = https://eu-west-1.console.aws.amazon.com/cloudwatch//home?region=eu-west-1#dashboards:name=awsome-master-prd-app
awsome-master-prd-app.fargateServiceURL145CCBE8 = http://awsom-farga-1KNVPTS0GNV8J-XXXXXXXXX.eu-west-1.elb.amazonaws.com
```

## Customize the application code

You can customize the code inside the docker/code directory

## PLEASE GIVE ME FEEDBACKS

## OPEN A GITHUB ISSUE FOR FIX OR REQUEST


env CDK_NEW_BOOTSTRAP=1 npx cdk bootstrap \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess