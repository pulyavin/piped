FROM node:10

ENV LANG            en_US.UTF-8
ENV LC_ALL          en_US.UTF-8

# installing packages
RUN apt-get update \
  && DEBIAN_FRONTEND="noninteractive" apt-get install -y \
  apt-transport-https \
  curl \
  htop \
  unzip \
  wget

# install yarn 
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
  && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
  && apt update && apt -y install yarn

WORKDIR /var/www

# permissions and owner files changes
RUN chown -R www-data:www-data .

EXPOSE 8070

RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

ENTRYPOINT ["./node_modules/.bin/nodemon", "./piped", "--port", "8070", "--nodeId", "1"]
