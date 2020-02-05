#!/bin/bash

# Update / Install dependencies
composer install
yarn install

# Dump static assets
php bin/console assets:install --symlink public

# Dump WebPack Encore Assets
yarn encore dev
yarn encore production

# Create ENV cache file (better performance)
composer dump-env prod

# Clear and warmup cache
php bin/console cache:clear --env=dev
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod

# Make sure www-data can always write to var directory
chown -R www-data.www-data /var/www/docfab
