FROM nginx:alpine

ARG DOCKER_DIR=./docker/web
ARG FCGI_HOST=127.0.0.1

COPY $DOCKER_DIR/nginx.conf /etc/nginx/nginx.conf

RUN sed -i 's/\@FCGI_HOST\@/'"$FCGI_HOST"'/' /etc/nginx/nginx.conf