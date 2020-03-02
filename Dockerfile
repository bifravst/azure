FROM ubuntu:18.04 as base
WORKDIR /workdir
# Update system
RUN apt-get -y update
RUN apt-get -y upgrade
# Install Node.js 12
RUN apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs
RUN node -v
# Azure Functions Core Tools
RUN apt -y install wget
RUN wget -q https://packages.microsoft.com/config/ubuntu/18.10/packages-microsoft-prod.deb
RUN dpkg -i packages-microsoft-prod.deb
RUN apt-get -y update
RUN apt -y install azure-functions-core-tools
RUN func
ENV FUNCTIONS_CORE_TOOLS_TELEMETRY_OPTOUT=1
EXPOSE 7071/tcp