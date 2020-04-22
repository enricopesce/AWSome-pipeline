# AWSome Pipeline

> Example how with [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) you can deploy a Python continuous delivery
> pipeline using [AWS CodePipeline](https://aws.amazon.com/codepipeline/), [AWS CodeBuild](https://aws.amazon.com/codebuild/) and
> [AWS Fargate](https://aws.amazon.com/fargate/).
> I have included all the best practices with a strong focus on the [KISS principle](https://en.wikipedia.org/wiki/KISS_principle).

> The infrastructure code is written in [Python](https://www.python.org/). The infrastructure executes a [sidecar](https://aws.amazon.com/blogs/compute/nginx-reverse-proxy-sidecar-container-on-amazon-ecs/) 
> with [Nginx](http://nginx.org/) as proxy and a [Flask](https://palletsprojects.com/p/flask/) "hello world" application on [Gunicorn](https://gunicorn.org/)


### Installation and requirements:

> You need to install a minimal Python 3.7, Node 10 and AWS CLI as dependencies in you local environment

Install the CDK framework

```bash
npm install -g aws-cdk
```

Install the Python dependencies

```bash
pip install -r requirements.txt
```

Authenticate in your AWS account:

> Follow this guide: [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

Bootstrap AWS CDK

```bash
cdk bootstrap --region eu-west-1
```

Configure GitHub Token

> Create a [personal access token in GitHub](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line) 
> and store it in [AWS SecretsManager](https://aws.amazon.com/secrets-manager/). Needed to configure your repo webhooks.

```bash
aws secretsmanager create-secret \
    --name my_secret_token \
    --secret-string yourtokenhereyourtokenhere \
    --region eu-west-1
```

## Usage

Deploy the pipeline:

```bash
export AWS_PROFILE="profilename"
export AWS_DEFAULT_REGION="eu-west-1"
cdk deploy "*" --context stack=pipeline
```

Local test:

> You can try locally the docker sidecar with the following conmmands:

```bash
cd docker
docker-compose up
```

Customize the application code:

> You can customize the code inside the docker/code directory

Have fun!
