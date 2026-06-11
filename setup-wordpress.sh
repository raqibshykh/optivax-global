#!/bin/bash

# SaaS Core WordPress Setup Script
# This script runs inside the Docker container to set up WordPress

set -e

echo "=== SaaS Core WordPress Setup ==="

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until nc -z db 3306; do
  sleep 1
done
echo "MySQL is ready!"

# Navigate to WordPress root
cd /var/www/html

# Install Composer dependencies for SaaS Core plugin
if [ -f "saas-core/composer.json" ]; then
    echo "Installing SaaS Core plugin dependencies..."
    cd saas-core
    composer install --no-dev --optimize-autoloader
    cd ..
    echo "SaaS Core dependencies installed!"
fi

# Install WP-CLI if not already installed
if ! command -v wp &> /dev/null; then
    echo "Installing WP-CLI..."
    curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
    chmod +x wp-cli.phar
    mv wp-cli.phar /usr/local/bin/wp
fi

# Check if WordPress is already installed
if wp core is-installed --allow-root 2>/dev/null; then
    echo "WordPress is already installed!"
else
    echo "Setting up WordPress..."
    
    # Install WordPress core
    wp core install \
        --url="${WP_SITEURL:-http://localhost:8080}" \
        --title="SaaS Dashboard" \
        --admin_user="${WP_ADMIN_USER:-admin}" \
        --admin_password="${WP_ADMIN_PASSWORD:-Admin@123456}" \
        --admin_email="${WP_ADMIN_EMAIL:-admin@example.com}" \
        --skip-email \
        --allow-root
    
    echo "WordPress installed!"
fi

# Activate SaaS Core plugin if it exists
if [ -d "wp-content/plugins/saas-core" ]; then
    echo "Activating SaaS Core plugin..."
    wp plugin activate saas-core --allow-root || echo "SaaS Core plugin already active or not found"
fi

# Set up authentication keys and salts if not already set
if ! grep -q "AUTH_KEY" wp-config.php; then
    echo "Generating WordPress security keys..."
    curl -s https://api.wordpress.org/secret-key/1.1/salt/ >> wp-config.php
fi

# Flush WordPress cache and rewrite rules
echo "Flushing WordPress cache..."
wp cache flush --allow-root
wp rewrite flush --allow-root

echo "=== WordPress Setup Complete ==="
echo "WordPress URL: ${WP_SITEURL:-http://localhost:8080}"
echo "Admin User: ${WP_ADMIN_USER:-admin}"
echo "API Endpoint: ${WP_SITEURL:-http://localhost:8080}/wp-json/saas/v1"
