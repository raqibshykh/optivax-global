# Project Architecture

## Structure Overview

This project is organized into three independent components:

### 1. **saas-core/** (WordPress Plugin)
A complete, standalone WordPress plugin that provides:
- REST API endpoints for SaaS operations (`/saas/v1/*`)
- Database schema and migrations
- Authentication (JWT + cookies)
- User role management
- Core business logic (tasks, projects, leads, invoices, etc.)
- Email notifications and automation

**Location:** `saas-core/`
**Dependencies:** WordPress
**Can be:** Installed independently in any WordPress site

**Key Files:**
- `saas-core.php` - Plugin header and loader
- `helpers.php` - Core utilities and helpers
- `migration.php` - Database schema setup
- `api-routes.php` - REST API route registration
- `hooks/` - Feature-specific route hooks (auth, tasks, projects, etc.)
- `sse.php` - Real-time notifications

### 2. **react-saas-dashboard/** (WordPress Theme Integration)
A WordPress theme/plugin integration layer that:
- Loads the compiled React frontend
- Connects React to WordPress user session
- Injects global configuration to frontend
- Handles CORS and authentication headers
- Provides template structure

**Location:** `react-saas-dashboard/`
**Dependencies:** WordPress, saas-core plugin
**Can be:** Used as a theme or mu-plugin alongside saas-core

**Key Files:**
- `functions.php` - React app loader and session handler
- `header.php` - WordPress theme header
- `index.php` - Theme template
- `assets/react/` - Built React app output directory

### 3. **src/** (React Frontend)
The React TypeScript application source code:
- Admin dashboards (super_admin, sales_admin, production_admin, marketing_admin)
- Client interface
- Components, hooks, services, pages
- Built with Vite, Tailwind CSS

**Build Output:** Compiled to `react-saas-dashboard/assets/react/dist/`
**Build Command:** `npm run build`
**Dev Server:** `npm run dev`

## Separation Benefits

✅ **Independent Deployment**
- saas-core can be used with any frontend
- react-saas-dashboard can be replaced with custom UI
- src/ React app can be deployed separately (SPA, mobile, etc.)

✅ **Easier Maintenance**
- Backend logic isolated from theme
- Frontend code doesn't depend on WordPress directly
- Clear API contracts via REST endpoints

✅ **Flexible Distribution**
- saas-core → WordPress plugin repository
- react-saas-dashboard → Theme or custom plugin
- src/ → npm package or standalone SPA

✅ **Development Workflow**
- Backend devs work on PHP without touching React
- Frontend devs use dev server independently
- API contract defined in REST routes

## Installation Steps

### Step 1: Install saas-core Plugin
```bash
# Copy saas-core/ to wp-content/plugins/
cp -r saas-core /path/to/wordpress/wp-content/plugins/

# Activate via WP Admin or CLI
wp plugin activate saas-core
```

### Step 2: Install react-saas-dashboard Theme/Integration
```bash
# Option A: As a theme
cp -r react-saas-dashboard /path/to/wordpress/wp-content/themes/

# Option B: As a mu-plugin (optional)
mkdir -p /path/to/wordpress/wp-content/mu-plugins/
cp -r react-saas-dashboard /path/to/wordpress/wp-content/mu-plugins/
```

### Step 3: Build and Deploy Frontend
```bash
# From project root
npm install
npm run build

# Output goes to: react-saas-dashboard/assets/react/dist/
```

## API Communication

The frontend communicates with the WordPress site via REST API:

**Base URL:** `{WordPress URL}/wp-json/saas/v1`

**Authentication:** 
- JWT token via `Authorization: Bearer {token}` header
- HttpOnly cookie `saas_jwt` for session persistence

**Example Endpoints:**
- `POST /saas/v1/auth/login` - User login
- `POST /saas/v1/auth/signup` - User registration
- `GET /saas/v1/auth/me` - Current user info
- `GET /saas/v1/tasks/list` - List all tasks
- `POST /saas/v1/tasks` - Create task

See `saas-core/api-routes.php` and `saas-core/hooks/` for full API reference.

## Development Workflow

### Backend Development (saas-core)
```bash
# Make changes to saas-core/hooks/*.php
# Plugin auto-loads on WordPress initialization
# No rebuild needed - changes take effect immediately
```

### Frontend Development (src + react-saas-dashboard)
```bash
# Start dev server
npm run dev

# Frontend connects to WordPress REST API
# Changes hot-reload in browser

# When ready to deploy
npm run build
# Output → react-saas-dashboard/assets/react/dist/
```

### Database Changes
Migrations are run automatically when plugin activates:
- See `saas-core/migration.php`
- Tables prefixed with `wp_saas_*`

## File Organization Reference

```
project-root/
├── saas-core/                    # WordPress Plugin (Backend)
│   ├── saas-core.php            # Plugin header
│   ├── helpers.php              # Core utilities
│   ├── migration.php            # Database schema
│   ├── api-routes.php           # Route registration
│   ├── sse.php                  # Real-time events
│   ├── hooks/                   # REST route handlers
│   │   ├── auth.php
│   │   ├── tasks.php
│   │   ├── projects.php
│   │   └── ... (feature hooks)
│   └── README.md                # Plugin documentation
│
├── react-saas-dashboard/        # WordPress Theme/Integration
│   ├── functions.php            # React loader
│   ├── header.php               # WP theme header
│   ├── index.php                # WP theme template
│   ├── assets/
│   │   └── react/
│   │       └── dist/            # Built React app (from npm run build)
│   └── README.md                # Theme documentation
│
├── src/                         # React Source Code
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── context/
│   ├── lib/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/                      # Static assets
│   └── images/
│
└── package.json                 # Node.js config (for React build)
```

## Environment Configuration

### WordPress (.env in WordPress root)
```
SAAS_DB_STRIPE_LIVE_SECRET_KEY=sk_live_...
SAAS_DB_STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
SAAS_SMTP_FROM_EMAIL=noreply@example.com
SAAS_SMTP_HOST=mail.example.com
SAAS_SMTP_PORT=587
```

### React (.env.example in project root)
```
VITE_API_URL=http://localhost/optivax-global/wp-json
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Next Steps

See individual README files:
- `saas-core/README.md` - Backend plugin guide
- `react-saas-dashboard/README.md` - Frontend integration guide
- Root `README.md` - Project overview
