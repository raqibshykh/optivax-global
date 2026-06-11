# Separation & Organization Guide

This guide explains how the project is organized into independent components and how to work with each.

## Current Architecture

The project consists of three independent but interconnected layers:

```
┌─────────────────────────────────────────────────────────────┐
│  src/                                                        │
│  React Frontend (TypeScript, Vite, Tailwind)                │
│  - Components, pages, hooks, services                       │
│  - Builds to: react-saas-dashboard/assets/react/dist/       │
└────────────────────┬────────────────────────────────────────┘
                     │ npm run build
                     │
┌────────────────────▼────────────────────────────────────────┐
│  react-saas-dashboard/                                       │
│  WordPress Theme/Integration Layer                          │
│  - Loads React app in WordPress                             │
│  - Injects global config & API URL                          │
│  - functions.php, index.php, header.php                     │
│  - assets/react/dist/ (built app)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ API calls to
                     │
┌────────────────────▼────────────────────────────────────────┐
│  saas-core/                                                  │
│  WordPress Plugin (REST API Backend)                        │
│  - /saas/v1/* REST endpoints                                │
│  - Authentication, permissions, business logic             │
│  - Database migrations, helpers                            │
│  - hooks/, api-routes.php, helpers.php, etc.              │
└─────────────────────────────────────────────────────────────┘
```

## Component Independence

### saas-core (Plugin)
**Can be used standalone** ✅

The plugin can be installed in any WordPress site and used by:
- Custom PHP applications
- Mobile apps
- Third-party integrations
- Multiple different frontends

**Installation:**
```bash
cp -r saas-core /path/to/wordpress/wp-content/plugins/
wp plugin activate saas-core
```

**Provides:** REST API at `/wp-json/saas/v1/*`

### react-saas-dashboard (Theme Integration)
**Depends on saas-core** ⚠️

The theme requires the saas-core plugin to be active. It cannot function independently.

**Installation:**
```bash
# Ensure saas-core is active first
cp -r react-saas-dashboard /path/to/wordpress/wp-content/themes/
wp theme activate react-saas-dashboard

# Then build & deploy React app
npm run build
```

**Provides:** WordPress admin dashboard interface

### src/ (React App)
**Can be deployed anywhere** ✅

The React source code can be:
- Deployed as standalone SPA (non-WordPress)
- Built and hosted on Netlify, Vercel, etc.
- Used with any backend (REST API)
- Modified for custom use cases

**Build:**
```bash
npm install
npm run build
# Output → react-saas-dashboard/assets/react/dist/
```

## File Organization

### saas-core/ (WordPress Plugin)

**Must have:**
```
saas-core/
├── saas-core.php              ← Plugin entry point (REQUIRED)
├── helpers.php                ← Core functions
├── migration.php              ← Database schema
├── api-routes.php             ← Route registration
└── hooks/                     ← Feature implementations
    ├── auth.php
    ├── users.php
    ├── tasks.php
    └── ... (one file per feature)
```

**Plugin Header Requirements:**

```php
<?php
/**
 * Plugin Name: SaaS Core
 * Description: WordPress REST API for SaaS operations
 * Version: 1.0.0
 * Author: Your Name
 * Text Domain: saas-core
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

// Activation hook
register_activation_hook(__FILE__, 'saas_plugin_activate');

function saas_plugin_activate() {
    // Run migrations
    require_once plugin_dir_path(__FILE__) . 'migration.php';
    saas_run_migrations();
}

// Load plugin
require_once plugin_dir_path(__FILE__) . 'helpers.php';
require_once plugin_dir_path(__FILE__) . 'api-routes.php';
```

### react-saas-dashboard/ (WordPress Theme)

**Must have:**
```
react-saas-dashboard/
├── functions.php              ← WordPress integration (REQUIRED)
├── index.php                  ← Theme template (REQUIRED)
├── header.php                 ← Theme header
├── style.css                  ← Theme metadata (REQUIRED)
├── screenshot.png             ← Theme screenshot (optional)
└── assets/react/dist/         ← Built React app (REQUIRED)
    ├── index.html
    └── assets/
        ├── index.js
        └── index.css
```

**Theme Header Requirements (style.css):**

```css
/*
Theme Name: React SaaS Dashboard
Theme URI: https://github.com/your-org/react-saas-dashboard
Author: Your Name
Author URI: https://yoursite.com
Description: React admin dashboard for WordPress SaaS platform
Version: 1.0.0
Requires at least: 5.0
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: react-saas-dashboard
Domain Path: /languages
*/
```

**functions.php Requirements:**

```php
<?php
// Check if saas-core plugin is active
if (!function_exists('saas_response')) {
    wp_die('SaaS Core plugin is required. Please activate it first.');
}

// Enqueue React app
add_action('wp_enqueue_scripts', 'load_react_dashboard_theme');

function load_react_dashboard_theme() {
    $manifest_path = get_template_directory() . '/assets/react/manifest.json';
    
    if (!file_exists($manifest_path)) {
        wp_die('React app not built. Run: npm run build');
    }
    
    // Load React from manifest
    $manifest = json_decode(file_get_contents($manifest_path), true);
    
    // ... (rest of enqueue logic)
}
```

## Development Setup

### For Backend Development (saas-core)

**No build needed!** PHP changes take effect immediately.

```bash
# 1. Edit saas-core/hooks/*.php
# 2. WordPress auto-loads the plugin
# 3. Changes visible immediately (refresh browser)

# Example: Add new endpoint
# Edit: saas-core/hooks/my-new-feature.php
# Include in: saas-core/api-routes.php
# Test: POST /wp-json/saas/v1/my-new-feature
```

### For Frontend Development (React)

```bash
# 1. Start dev server
npm run dev

# 2. Dev server runs at http://localhost:5173
# 3. Hot-reload on file changes
# 4. Proxies API to WordPress site

# 5. When ready to deploy:
npm run build

# 6. Built app → react-saas-dashboard/assets/react/dist/
# 7. Commit changes
# 8. Deploy to production
```

### For Integration Changes

```bash
# Edit react-saas-dashboard/functions.php
# Changes take effect after page reload (no build needed)

# Examples:
# - Add new global variable
# - Change API route
# - Add new WordPress hook
# - Adjust CORS headers
```

## Separation Checklist

Use this checklist when setting up the separated components:

### Plugin Setup (saas-core)
- [ ] Plugin file has correct header comment
- [ ] Activation hook runs migrations
- [ ] All hooks are included in api-routes.php
- [ ] Permission callbacks are defined
- [ ] Database tables created on activation
- [ ] Plugin can be deactivated without errors

### Theme Setup (react-saas-dashboard)
- [ ] style.css has theme header
- [ ] functions.php checks for saas-core plugin
- [ ] React app is built and in assets/react/dist/
- [ ] index.php renders the React app mount point
- [ ] Global variables injected via wp_localize_script()
- [ ] CORS headers configured correctly

### React App Setup (src/)
- [ ] Builds without errors: npm run build
- [ ] Output goes to react-saas-dashboard/assets/react/dist/
- [ ] API URL resolution works in src/lib/client.ts
- [ ] All environment variables documented

## Deployment Workflow

### Local Development

```bash
# Terminal 1: React dev server
npm run dev

# Terminal 2: WordPress site (already running)
# http://localhost/optivax-global

# Browser: http://localhost:5173 (dev server proxy)
```

### Staging

```bash
# 1. Build React app
npm run build

# 2. Commit to staging branch
git checkout staging
git add react-saas-dashboard/assets/react/dist/
git commit -m "Build: React dashboard update"
git push origin staging

# 3. Deploy to staging server
# Pull staging branch
# No additional build needed on server
```

### Production

```bash
# 1. Test on staging first
# Verify all features work

# 2. Build React app
npm run build

# 3. Create release
git checkout main
git merge staging
git tag v1.0.1
git push origin main --tags

# 4. Deploy to production
# Pull main branch
# Verify both plugin and theme are active
# Test dashboard loads correctly
```

## Troubleshooting Separation Issues

### "saas_response not found" error

**Problem:** Theme cannot find plugin functions

**Solution:**
```php
// In react-saas-dashboard/functions.php
if (!function_exists('saas_response')) {
    wp_die('Error: saas-core plugin must be activated first. '
        . 'Go to Plugins and activate "SaaS Core".');
}
```

### React app not loading in WordPress

**Problem:** Built files not found

**Solution:**
```bash
# Verify build output
ls -la react-saas-dashboard/assets/react/dist/

# Rebuild if needed
npm run build

# Check WordPress logs
tail -f wp-content/debug.log
```

### API calls failing from React

**Problem:** Frontend cannot reach backend API

**Solution:**
Check in browser Dev Tools:
1. Network tab → see actual API URL being called
2. Check if API response has correct format
3. Verify JWT token in cookies

```javascript
// In src/lib/client.ts
const getBaseUrl = () => {
    console.log('API URL:', window.wpSaaSContext.apiUrl);
    // Use this to debug URL resolution
};
```

### Permission denied errors

**Problem:** User doesn't have access to endpoint

**Solution:**
Check in `saas-core/hooks/`:
```php
// Verify permission callback
'permission_callback' => 'saas_feature_permission'

// Debug: log user role
error_log('User role: ' . saas_get_user_role(get_current_user_id()));
```

## Migration from Monolith to Separation

If refactoring existing code:

### Step 1: Organize Plugin Files

```bash
# Create proper plugin structure
mkdir -p saas-core/hooks
mkdir -p saas-core/languages

# Move PHP files
mv api-routes.php saas-core/
mv migration.php saas-core/
mv helpers.php saas-core/
mv saas-core.php saas-core/ (or create new)

# Move hooks
mv hooks/*.php saas-core/hooks/
```

### Step 2: Create Plugin Header

```php
// saas-core/saas-core.php
<?php
/**
 * Plugin Name: SaaS Core
 * ...
 */
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/api-routes.php';
```

### Step 3: Organize Theme Files

```bash
# Create proper theme structure
mkdir -p react-saas-dashboard/assets/react/dist
mkdir -p react-saas-dashboard/languages

# Move theme files
mv functions.php react-saas-dashboard/
mv index.php react-saas-dashboard/
mv header.php react-saas-dashboard/

# Create style.css with theme header
touch react-saas-dashboard/style.css
```

### Step 4: Update Build Output

```bash
# Build React app
npm run build

# Verify output
ls -la react-saas-dashboard/assets/react/dist/
```

### Step 5: Test Separation

```bash
# Deactivate all plugins
wp plugin deactivate --all

# Activate only saas-core
wp plugin activate saas-core

# Test API endpoints
curl http://localhost/wp-json/saas/v1/auth/me

# Activate theme
wp theme activate react-saas-dashboard

# Verify dashboard loads
# http://localhost (should show React app)
```

## Version Management

When components are separated, version them independently:

```
saas-core/
  - Version: 1.0.0 (core API)

react-saas-dashboard/
  - Version: 1.0.0 (theme version)

src/ (package.json)
  - Version: 1.0.0 (app version)
```

Each can be updated independently!

## Documentation Structure

After separation, maintain docs:

```
docs/
├── ARCHITECTURE.md          ← This overview (in root)
├── saas-core/README.md      ← Plugin guide
├── react-saas-dashboard/README.md  ← Theme guide
├── API_REFERENCE.md         ← Endpoint documentation
├── DEPLOYMENT.md            ← Production guide
└── DEVELOPMENT.md           ← Dev workflow
```

See individual component READMEs for detailed information.
