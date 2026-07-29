<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ConversationController;

if (!defined('ABSPATH')) {
    exit;
}

final class ConversationRoutes
{
    public static function register(): void
    {
        $controller = new ConversationController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/conversations/list', [
            'methods' => 'GET',
            'callback' => [$controller, 'list'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/conversations/save', [
            'methods' => 'PUT',
            'callback' => [$controller, 'save'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/conversations/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'create'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/conversations/(?P<conversationId>[^/]+)/messages', [
            'methods' => 'POST',
            'callback' => [$controller, 'addMessage'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/conversations/(?P<conversationId>[^/]+)/status', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateStatus'],
            'permission_callback' => '__return_true',
        ]);
    }
}
