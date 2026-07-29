<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ProfileMeController;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Self-service profile endpoints — /profile/me*. Separate from ProfileRoutes
 * (/profiles/*, the admin-managed employee CRUD) and ClientRoutes
 * (/clients/*, the admin-managed client CRUD); neither of those is touched
 * by this feature. permission_callback is '__return_true' for the same
 * reason as every other route in this plugin (see AuthRoutes's doc comment)
 * — auth happens inside the controller so 401 responses use this plugin's
 * exact envelope shape instead of WP core's.
 */
final class ProfileMeRoutes
{
    public static function register(): void
    {
        $controller = new ProfileMeController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/profile/me', [
            [
                'methods' => 'GET',
                'callback' => [$controller, 'getMe'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'PUT',
                'callback' => [$controller, 'updateMe'],
                'permission_callback' => '__return_true',
            ],
        ]);

        register_rest_route($ns, '/profile/me/avatar', [
            [
                'methods' => 'POST',
                'callback' => [$controller, 'uploadAvatar'],
                'permission_callback' => '__return_true',
            ],
            [
                'methods' => 'DELETE',
                'callback' => [$controller, 'removeAvatar'],
                'permission_callback' => '__return_true',
            ],
        ]);
    }
}
