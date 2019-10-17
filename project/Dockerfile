FROM ubuntu:18.04

ENV PYTHONUNBUFFERED 1
ENV DEBIAN_FRONTEND=noninteractive

RUN apt -y update && apt -y upgrade && apt autoremove && apt autoclean

RUN apt -y install python3.7 python3-pip python3-psycopg2 postgresql

RUN mkdir /app
WORKDIR /app
COPY . /app/

RUN pip3 install -r /app/requirements.txt
