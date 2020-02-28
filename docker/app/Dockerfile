FROM python:alpine

ARG CODE_DIR=./code
ARG DOCKER_DIR=./app

RUN mkdir -p /var/www/app

WORKDIR /var/www/app

COPY $CODE_DIR /var/www/app

RUN pip install -r requirements.txt

CMD /usr/local/bin/gunicorn -w 4 --bind :8080 --access-logfile - --error-logfile - main:app