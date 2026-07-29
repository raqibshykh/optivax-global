<?php
/**
 * Vite build integration: manifest parsing, JS/CSS enqueue, cache-busting,
 * and a root-relative static-asset passthrough for the handful of paths the
 * React build hardcodes as absolute (e.g. `/images/...` from files that
 * live in the React project's `public/` folder, referenced in source as
 * literal root paths — confirmed present in the current build's compiled
 * bundle). No business logic — this file's only job is "find the built
 * files and get bytes to the browser correctly."
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Vite (>=5) writes the manifest to `<outDir>/.vite/manifest.json`; older
 * Vite/other tooling may still write `<outDir>/manifest.json` directly —
 * both are checked so this keeps working if the frontend's Vite version
 * changes without anyone updating this theme.
 *
 * @return array|null Parsed manifest, or null if no build has been deployed yet.
 */
function optivax_theme_get_manifest(): ?array
{
    static $manifest = null;
    static $loaded = false;

    if ($loaded) {
        return $manifest;
    }
    $loaded = true;

    $candidates = [
        get_template_directory() . '/build/.vite/manifest.json',
        get_template_directory() . '/build/manifest.json',
    ];

    foreach ($candidates as $path) {
        if (is_readable($path)) {
            $contents = file_get_contents($path);
            $decoded = $contents ? json_decode($contents, true) : null;
            if (is_array($decoded)) {
                $manifest = $decoded;
                return $manifest;
            }
        }
    }

    return null;
}

/**
 * The manifest is keyed by the Rollup input path — vite.config.ts declares
 * `rollupOptions.input: "index.html"`, so that's the entry key to read.
 */
function optivax_theme_get_entry(): ?array
{
    $manifest = optivax_theme_get_manifest();
    return $manifest['index.html'] ?? null;
}

/**
 * True once a real Vite build has been copied into build/ — lets templates
 * show a clear message instead of a blank page or a PHP notice when the
 * theme has just been installed and no build has been deployed yet.
 */
function optivax_theme_has_build(): bool
{
    return optivax_theme_get_entry() !== null;
}

/**
 * Enqueues the React app's compiled JS/CSS. No `wp_enqueue_scripts` version
 * query string is added — Vite's own content-hashed filenames
 * (index-<hash>.js) already provide correct cache-busting, and adding a
 * WP `?ver=` on top would just be redundant.
 */
function optivax_theme_enqueue_app_assets(): void
{
    $entry = optivax_theme_get_entry();
    if (!$entry) {
        return; // optivax_theme_maybe_show_build_notice() surfaces this instead of a fatal error.
    }

    $base_uri = get_template_directory_uri() . '/build/';

    if (!empty($entry['css'])) {
        foreach ($entry['css'] as $index => $cssFile) {
            $handle = $index === 0 ? 'optivax-react-app' : "optivax-react-app-{$index}";
            wp_enqueue_style($handle, $base_uri . $cssFile, [], null);
        }
    }

    if (!empty($entry['file'])) {
        wp_enqueue_script('optivax-react-app', $base_uri . $entry['file'], [], null, true);
        // Vite's output is an ES module — WP core doesn't support type="module"
        // natively on wp_enqueue_script(), so it's added via the filter below.
        add_filter('script_loader_tag', 'optivax_theme_module_script_tag', 10, 3);
    }

    // Preload any additional chunks Vite split out (dynamic imports), so the
    // browser fetches them in parallel instead of waterfalling after the
    // entry module parses its first import() call.
    if (!empty($entry['imports'])) {
        $manifest = optivax_theme_get_manifest();
        foreach ($entry['imports'] as $importKey) {
            if (!empty($manifest[$importKey]['file'])) {
                $chunkUrl = $base_uri . $manifest[$importKey]['file'];
                printf(
                    '<link rel="modulepreload" href="%s" crossorigin>' . "\n",
                    esc_url($chunkUrl)
                );
            }
        }
    }
}
add_action('wp_enqueue_scripts', 'optivax_theme_enqueue_app_assets');

/** Adds type="module" + crossorigin to exactly the app bundle's <script> tag. */
function optivax_theme_module_script_tag(string $tag, string $handle, string $src): string
{
    if ($handle !== 'optivax-react-app') {
        return $tag;
    }
    return sprintf(
        '<script type="module" crossorigin src="%s"></script>' . "\n",
        esc_url($src)
    );
}

/**
 * Admin-only notice when the theme is active but no Vite build has been
 * copied into build/ yet — prevents a silent blank page from looking like a
 * bug, per "no PHP warnings, no fatal errors" in the verification spec.
 */
function optivax_theme_maybe_show_build_notice(): void
{
    if (optivax_theme_has_build() || !current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="notice notice-warning">
        <p>
            <?php esc_html_e(
                'OptiVax React Theme: no build found. Run "npm run build" in the React project and copy the contents of its dist/ folder into this theme\'s build/ directory (see README.md).',
                'optivax-react-theme'
            ); ?>
        </p>
    </div>
    <?php
}
add_action('admin_notices', 'optivax_theme_maybe_show_build_notice');

// ─────────────────────────────────────────────────────────────────────────
// Root-relative static asset passthrough
// ─────────────────────────────────────────────────────────────────────────

/**
 * The React source tree references a handful of static files (under
 * src/../public/images/*, favicon.png) using root-absolute paths like
 * "/images/error/404.svg" — correct when Vite's dev server or a
 * document-root deploy serves the build, but the theme's build/ output
 * physically lives at wp-content/themes/optivax-react-theme/build/, not at
 * the site root. Rather than touch the React source or the Vite `base`
 * config (out of scope — "DO NOT change React UI"), this registers rewrite
 * rules so requests for /images/*, /assets/*, and /favicon.png at the site
 * root are transparently served from the theme's build/ folder, exactly as
 * if they lived at the domain root. Works unmodified on both Apache
 * (via WP's own root .htaccess falling through to index.php for any path
 * that isn't a real file) and Nginx (given the standard WordPress
 * `try_files $uri $uri/ /index.php?$args;` block) — no server-specific
 * config needed.
 */
function optivax_theme_register_asset_rewrites(): void
{
    add_rewrite_rule('^(assets|images)/(.+)$', 'index.php?optivax_static_asset=$matches[1]/$matches[2]', 'top');
    add_rewrite_rule('^favicon\.png$', 'index.php?optivax_static_asset=favicon.png', 'top');
}
add_action('init', 'optivax_theme_register_asset_rewrites');

function optivax_theme_query_vars(array $vars): array
{
    $vars[] = 'optivax_static_asset';
    return $vars;
}
add_filter('query_vars', 'optivax_theme_query_vars');

/** MIME types for the file extensions Vite/the public/ folder actually emit. */
function optivax_theme_static_mime_types(): array
{
    return [
        'js'    => 'application/javascript',
        'mjs'   => 'application/javascript',
        'css'   => 'text/css',
        'json'  => 'application/json',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'webp'  => 'image/webp',
        'svg'   => 'image/svg+xml',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'eot'   => 'application/vnd.ms-fontobject',
        'map'   => 'application/json',
    ];
}

/**
 * Serves the requested file straight out of the theme's build/ directory.
 * Runs on `template_redirect` (after query vars are parsed, before any
 * template file loads) so it can `exit` early without WordPress rendering
 * a page around it.
 */
function optivax_theme_serve_static_asset(): void
{
    $requested = get_query_var('optivax_static_asset');
    if (!$requested) {
        return;
    }

    $buildDir = realpath(get_template_directory() . '/build');
    if (!$buildDir) {
        status_header(404);
        exit;
    }

    // Reject path traversal / null bytes before ever touching the filesystem.
    if (strpos($requested, '..') !== false || strpos($requested, "\0") !== false) {
        status_header(403);
        exit;
    }

    $fullPath = realpath($buildDir . '/' . $requested);

    // realpath() also fails closed if the file doesn't exist, which is the
    // common case for e.g. sourcemap requests not present in a build.
    if (!$fullPath || strpos($fullPath, $buildDir) !== 0 || !is_file($fullPath)) {
        status_header(404);
        exit;
    }

    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    $mimeTypes = optivax_theme_static_mime_types();
    $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($fullPath));
    // Vite's assets/*.<hash>.ext filenames are content-addressed and never
    // reused for different content, so these are safe to cache forever;
    // images/favicon are not hashed, so they get a shorter, still-useful TTL.
    if (strpos($requested, 'assets/') === 0) {
        header('Cache-Control: public, max-age=31536000, immutable');
    } else {
        header('Cache-Control: public, max-age=86400');
    }

    readfile($fullPath);
    exit;
}
add_action('template_redirect', 'optivax_theme_serve_static_asset', 0);

/**
 * Flush rewrite rules exactly on activation/deactivation of this theme —
 * never on every request (that would be a real performance problem, not
 * "add_rewrite_rule + flush on init", which is a well-known anti-pattern).
 */
function optivax_theme_flush_rewrites_on_activation(): void
{
    optivax_theme_register_asset_rewrites();
    flush_rewrite_rules();
}
add_action('after_switch_theme', 'optivax_theme_flush_rewrites_on_activation');

function optivax_theme_flush_rewrites_on_deactivation(): void
{
    flush_rewrite_rules();
}
add_action('switch_theme', 'optivax_theme_flush_rewrites_on_deactivation');
