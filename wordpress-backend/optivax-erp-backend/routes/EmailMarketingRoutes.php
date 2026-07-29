<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\EmailMarketingController;

if (!defined('ABSPATH')) {
    exit;
}

/** Backs /saas/v1/email/* (src/services/emailService.ts) — templates, campaigns, automations. */
final class EmailMarketingRoutes
{
    public static function register(): void
    {
        $controller = new EmailMarketingController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        // ── Templates ─────────────────────────────────────────────────────
        register_rest_route($ns, '/email/templates/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listTemplates'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/templates/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'createTemplate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/templates/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateTemplate'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/templates/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteTemplate'],
            'permission_callback' => '__return_true',
        ]);

        // ── Campaigns ─────────────────────────────────────────────────────
        register_rest_route($ns, '/email/campaigns/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listCampaigns'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/campaigns/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'createCampaign'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/campaigns/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateCampaign'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/campaigns/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteCampaign'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/campaigns/send', [
            'methods' => 'POST',
            'callback' => [$controller, 'sendCampaign'],
            'permission_callback' => '__return_true',
        ]);

        // ── Automations ───────────────────────────────────────────────────
        // No delete route — src/services/emailService.ts has no deleteAutomation().
        register_rest_route($ns, '/email/automations/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'listAutomations'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/automations/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'createAutomation'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/email/automations/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateAutomation'],
            'permission_callback' => '__return_true',
        ]);
    }
}
