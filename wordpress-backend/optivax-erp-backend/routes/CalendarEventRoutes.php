<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\BaseCrudController;
use OptivaxERP\Repositories\CalendarEventRepository;

if (!defined('ABSPATH')) {
    exit;
}

final class CalendarEventRoutes
{
    public static function register(): void
    {
        $controller = new BaseCrudController(new CalendarEventRepository(), 'system');
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/calendar-events/list', [
            'methods' => 'GET',
            // Needs a closure (not [$controller, 'listHandler']) because
            // listHandler takes an optional $filterParamMap arg to support
            // GET /calendar-events/list?id= (EventService.getById()).
            'callback' => function (\WP_REST_Request $request) use ($controller) {
                return $controller->listHandler($request, ['id' => 'id']);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/calendar-events/create', [
            'methods' => 'POST',
            'callback' => [$controller, 'createHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/calendar-events/update', [
            'methods' => 'PUT',
            'callback' => [$controller, 'updateByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/calendar-events/delete', [
            'methods' => 'DELETE',
            'callback' => [$controller, 'deleteByBodyIdHandler'],
            'permission_callback' => '__return_true',
        ]);
    }
}
