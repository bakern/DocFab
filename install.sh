#!/bin/bash

set -e
if [ "$EUID" -ne 0 ]; then
    echo "Error: The installation script must be run as root" >&2
    exit 1
fi

# Install Apache & PHP
apt-get -y install apache2 libapache2-mod-php php

PHP_VERSION=$(php -v | head -1 | cut -d " " -f 2 | cut -c 1-3)
echo "Detected PHP version $PHP_VERSION"

# Install QPDF for encryption & optimization purposes
apt-get -y install qpdf

# Install Yarn and NodeJS for Webpack Encore
apt-get install nodejs
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
apt-get update && apt-get install yarn
