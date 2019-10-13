FROM ubuntu:18.04

ENV debian_frontend=noninteractive

RUN apt -y update && apt -y upgrade && apt autoremove && apt autoclean
RUN apt -y install nginx

RUN mkdir -p /var/www/html
WORKDIR /var/www/html
COPY . /var/www/html/

CMD ["nginx", "-g", "daemon off;"]

EXPOSE 80
