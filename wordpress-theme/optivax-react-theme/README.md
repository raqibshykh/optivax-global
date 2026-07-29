# OptiVax React Theme

A production WordPress theme that does exactly one thing: load and mount the
OptiVax Global React ERP application (built with Vite). It contains **no**
business logic, REST APIs, JWT/SMTP handling, RBAC, payroll, attendance,
budget, or database queries — all of that lives in the companion
**OptiVax ERP Backend** plugin and is untouched by this theme.

## How it works

- `functions.php` requires a handful of small files under `inc/`: theme
  setup (menus/widgets/supports), asset enqueue (reads the Vite manifest and
  enqueues the built JS/CSS), `wp_localize_script` config, baseline SEO meta
  tags, and page-level security headers.
- `front-page.php` (and the optional `templates/template-app.php` page
  template) render a `<div id="root">` — exactly what the React bundle
  expects (`src/main.tsx`) — and nothing else.
- The app uses **HashRouter** (`src/App.tsx`), so every in-app screen is a
  client-side `#/...` fragment. WordPress never needs to know about any of
  those routes; it only ever serves the one page that hosts the app. This is
  why there are no BrowserRouter-style rewrite/fallback rules here — reload
  or bookmark any in-app screen and it works, because the browser re-requests
  the exact same WordPress URL and React Router reads the `#` fragment
  client-side.

## Deploying a new build

The theme ships with a real build already copied into `build/` (from the
project's `dist/` output at the time this theme was generated). To deploy a
newer build after making changes to the React app:

```bash
# from the project root
npm run build
rm -rf wordpress-theme/optivax-react-theme/build/*
cp -r dist/. wordpress-theme/optivax-react-theme/build/
```

Then re-zip `wordpress-theme/optivax-react-theme/` and re-upload, or copy it
directly into `wp-content/themes/` on the server. `functions.php` reads
`build/.vite/manifest.json` at runtime — no theme code changes are needed
for a new build, only the file copy above.

If `build/.vite/manifest.json` is missing, the theme shows an admin notice
(logged-in administrators only) instead of a blank page or a PHP error.

## The one thing to know about configuration

`inc/localize.php` exposes `window.optivaxWpConfig` (site URL, theme URL,
plugin URL, REST URL + nonce, current WP user if logged in, etc.) via
`wp_localize_script()`. **This does not change which API the compiled React
app calls.** The existing frontend (`src/config/environment.ts`) resolves its
API base URL exclusively from `VITE_API_URL`/`VITE_API_BASE`, baked into the
bundle at `npm run build` time by whatever `.env`/`.env.production` file was
present during that build — it does not read any `window` global. Point the
frontend at the right backend by setting `VITE_API_URL` before running
`npm run build`, not by editing this theme.

## Root-relative static assets

The React build's compiled bundle hardcodes a few asset paths as
root-absolute (e.g. `/images/error/404.svg`, `/favicon.png`) — correct when
served from a document root, not automatically correct when the build lives
at `wp-content/themes/optivax-react-theme/build/`. `inc/assets.php` registers
WordPress rewrite rules so requests for `/assets/*`, `/images/*`, and
`/favicon.png` at the site root are transparently served from this theme's
`build/` folder. This requires no Vite config change and no web-server-specific
setup — it works on both Apache (WordPress's own root `.htaccess` already
falls through to `index.php` for any path that isn't a real file) and Nginx,
as long as the standard WordPress block is in place:

```nginx
location / {
    try_files $uri $uri/ /index.php?$args;
}
```

If you customize permalinks or rewrite rules elsewhere, re-save Permalinks
in wp-admin (or call `flush_rewrite_rules()`) so these rules take effect —
this already happens automatically on theme activation.

## Installation

1. Zip this folder (`optivax-react-theme/`) or copy it directly into
   `wp-content/themes/` on the target server.
2. Activate **OptiVax React Theme** in **Appearance → Themes**.
3. Install/activate the **OptiVax ERP Backend** plugin (separately — this
   theme does not require or bundle it, but the React app needs a real
   backend at the URL baked into its build to do anything useful).
4. Visit the site. The homepage mounts the React app.

## Requirements

WordPress 6.4+, PHP 8.2+, MySQL 8+. No other plugins/theme dependencies.
