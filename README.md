# SaaS Admin Dashboard

![Dashboard Mockup](file:///C:/Users/Arbaz%20Khan/.gemini/antigravity/brain/564bc502-5333-4d8f-b4f0-c86f0d287886/dashboard_mockup_1780607915491.png)

## Overview
A modern, premium‑looking **SaaS admin dashboard** built with:
- **WordPress** as a headless backend (custom plugin `saas‑core.php`).
- **React + TypeScript** front‑end using **Tailwind CSS** for a sleek dark‑mode UI.
- Full REST API (`/wp-json/saas/v1/...`) exposing CRUD for profiles, organizations, clients, projects, invoices, payments, subscriptions, notifications, files, calendar events, email templates & automations.
- Integrated **Stripe** support for payment intents.
- Rich UI components (cards, tables, charts, calendar, email campaign builder) with micro‑animations and glass‑morphism aesthetics.

## Features
- Multi‑role authentication (`super_admin`, `client`, etc.).
- Role‑based data filtering (clients only see their own projects/invoices).
- Data seeding on plugin activation (demo super‑admin and client). 
- CORS for local development (localhost:5173 & 3000).
- Extensible API for future SaaS features.
- Premium UI with dark mode, gradients, smooth hover effects.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Backend | WordPress (PHP), MySQL, custom tables (`saas_*`) |
| API | WordPress REST API (`/wp-json/saas/v1/`) |
| Frontend | React, TypeScript, Tailwind CSS, Axios (`api` client) |
| Auth | WordPress user system with role stored in `saas_profiles` |
| Payments | Stripe (publishable key via `/config/stripe`) |
| Build | Vite (React dev server) |

## Installation
### 1. Backend (WordPress plugin)
1. Clone the repo and copy the `saas-core` folder into your WordPress `wp-content/plugins/` directory.
2. Activate **SaaS Core Backend** from the WordPress admin → Plugins.
3. On activation the plugin creates all required tables and seeds demo data.
4. (Optional) Update the Stripe publishable key in `wp-config.php`:
   ```php
   define('SAAS_STRIPE_PUBLISHABLE_KEY', 'pk_test_************************');
   ```

### 2. Frontend
```bash
# From the project root
cd src
npm install   # installs React, Tailwind, Axios, etc.
npm run dev   # starts Vite dev server on http://localhost:5173
```
The frontend expects the WordPress site to be reachable at the same origin (or configure proxy in `vite.config.ts`).

## Development Workflow
- **Backend**: edit `saas-core/saas-core.php`. After changes, deactivate/reactivate the plugin or run `wp db query` to apply DB schema updates.
- **Frontend**: edit React components under `src/`. Hot‑module replacement refreshes the UI instantly.
- **API**: use the defined routes in `saas-core.php`. See **API Reference** below.

## API Reference (selected)
| Resource | Endpoints | Description |
|----------|-----------|-------------|
| Auth | `POST /saas/v1/auth/signup`<br>`GET /saas/v1/auth/session` | Register a new WordPress user and fetch the current session (role, email, avatar, company). |
| Projects | `GET /projects/list`<br>`POST /projects/create`<br>`PUT /projects/update`<br>`DELETE /projects/delete` | CRUD for SaaS projects. `list` supports `clientId` filter for client users. |
| Invoices | `GET /invoices/list`<br>`POST /invoices/create`<br>`POST /invoices/mark-paid` | Manage invoices and mark them as paid. |
| Payments | `GET /payments/list`<br>`POST /payments/create` | Record payments; integrates with Stripe via `create-payment-intent`. |
| Subscriptions | `GET /subscriptions/list`<br>`POST /subscriptions/create` | Org‑level subscription data. |
| Notifications | `GET /notifications/list`<br>`PUT /notifications/mark-all-read`<br>`DELETE /notifications/delete-all` | In‑app alerts. |
| Files | `GET /files/list`<br>`POST /files/create` | Metadata for uploaded files (URL stored). |
| Calendar Events | `GET /calendar-events/list`<br>`POST /calendar-events/create` | Simple event schedule. |
| Email Templates / Campaigns / Automations | CRUD for each email‑related entity. |
| Stripe Config | `GET /config/stripe` | Returns the publishable key for the front‑end. |

All routes require authentication (`is_user_logged_in()`) except signup and the public Stripe config.

## Front‑end Usage
```tsx
import { useAuth } from './context/AuthContext';
import { useProjects } from './hooks/useProjects';

function Dashboard() {
  const { user } = useAuth();
  const { projects, isLoading, error, refreshProjects } = useProjects();

  // Render premium cards, project table, etc.
}
```
The hook automatically selects the correct data based on `user.role`.

## Styling & Design Guidelines
- **Dark mode** is the default; colors are derived from a custom HSL palette.
- **Tailwind** utilities are used throughout; avoid ad‑hoc inline styles.
- **Micro‑animations** (hover, focus, table row fade‑in) are implemented with `transition` utilities.
- **Responsive** layout – sidebar collapses on <640px, tables become scrollable.
- **Typography** – Google Font **Inter** (`font-inter` class) for a modern look.

## Contributing
1. Fork the repo.
2. Create a feature branch.
3. Follow the existing code style (PHP PSR‑12, TypeScript strict mode, Tailwind conventions).
4. Submit a pull request with a clear description.

## License
MIT License – feel free to use, modify, and distribute.
