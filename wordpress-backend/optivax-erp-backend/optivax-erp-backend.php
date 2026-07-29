<?php
/**
 * Plugin Name: OptiVax ERP Backend
 * Plugin URI: https://optivaxglobal.com
 * Description: REST API backend foundation for the OptiVax Global ERP dashboard (Phase 2A). Provides auth, RBAC, database schema, SMTP, uploads, and notification infrastructure consumed by the React frontend at /wp-json/saas/v1/*.
 * Version: 2.0.0-phase2a
 * Author: OptiVax Global
 * Text Domain: optivax-erp-backend
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit; // Disallow direct access.
}

define('OPTIVAX_ERP_VERSION', '2.9.1-management-dept-fix');
define('OPTIVAX_ERP_DB_VERSION', '1.10.1');
define('OPTIVAX_ERP_DIR', plugin_dir_path(__FILE__));
define('OPTIVAX_ERP_URL', plugin_dir_url(__FILE__));
define('OPTIVAX_ERP_TABLE_PREFIX', 'optivax_');
define('OPTIVAX_ERP_NAMESPACE', 'saas/v1');

/**
 * Lightweight PSR-4-ish autoloader for our own classes.
 * OptivaxERP\Controllers\AuthController -> controllers/AuthController.php
 * OptivaxERP\Helpers\ApiResponse        -> helpers/ApiResponse.php
 * Every namespace segment except the last (the class name, which must match
 * its .php filename exactly) is lowercased to match the plugin's flat,
 * lowercase folder layout — including nested ones like
 * OptivaxERP\Database\Migrations\X -> database/migrations/X.php. Lowercasing
 * only the first segment would resolve that example to database/Migrations/X.php,
 * which happens to work on case-insensitive filesystems (Windows/Mac) but
 * 404s on a case-sensitive Linux production host.
 */
spl_autoload_register(function (string $class): void {
    $prefix = 'OptivaxERP\\';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $segments = explode('\\', $relative);
    if (count($segments) < 2) {
        return;
    }

    $className = array_pop($segments);
    $dirSegments = array_map('strtolower', $segments);
    $path = OPTIVAX_ERP_DIR . implode('/', $dirSegments) . '/' . $className . '.php';

    if (file_exists($path)) {
        require_once $path;
    }
});

// Composer-managed dependencies (firebase/php-jwt).
if (file_exists(OPTIVAX_ERP_DIR . 'vendor/autoload.php')) {
    require_once OPTIVAX_ERP_DIR . 'vendor/autoload.php';
}

/**
 * Bootstraps the plugin once all classes are autoloadable and WordPress core is ready.
 */
final class OptivaxErpBackend
{
    private static ?OptivaxErpBackend $instance = null;

    public static function instance(): OptivaxErpBackend
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
        add_action('init', [$this, 'loadTextDomain']);
        // Called directly (not re-registered on plugins_loaded) — we're
        // already executing inside that hook's callback right now, and
        // whether a callback appended to a hook mid-fire runs in the same
        // pass is a WordPress implementation detail not worth depending on.
        OptivaxERP\Database\Migrator::maybeUpgrade();
        add_action('admin_menu', [OptivaxERP\Admin\SettingsPage::class, 'registerMenu']);
        add_filter('rest_authentication_errors', [OptivaxERP\Middleware\AuthMiddleware::class, 'restAuthenticationErrors']);
        add_filter('rest_pre_dispatch', [OptivaxERP\Middleware\PasswordGateMiddleware::class, 'enforce'], 10, 3);
        OptivaxERP\Middleware\CsrfMiddleware::register();
        OptivaxERP\Middleware\ErrorBoundaryMiddleware::register();
        add_action('phpmailer_init', [OptivaxERP\Mail\MailService::class, 'configureSmtp']);
        OptivaxERP\Helpers\SecurityHeaders::register();

        OptivaxERP\Cron\EmailQueueWorker::registerSchedule();
        add_action('optivax_erp_email_queue_tick', [OptivaxERP\Cron\EmailQueueWorker::class, 'run']);

        OptivaxERP\Cron\AutomationCronWorker::registerSchedule();
        add_action('optivax_erp_automation_tick', [OptivaxERP\Cron\AutomationCronWorker::class, 'run']);

        OptivaxERP\Cron\BiometricAttendanceCronWorker::registerSchedule();
        add_action('optivax_erp_biometric_attendance_tick', [OptivaxERP\Cron\BiometricAttendanceCronWorker::class, 'run']);

        OptivaxERP\Cron\DeviceSyncCron::registerSchedule();
        add_action('optivax_erp_device_sync_tick', [OptivaxERP\Cron\DeviceSyncCron::class, 'run']);

        OptivaxERP\Cron\ActivitySessionCronWorker::registerSchedule();
        add_action('optivax_erp_activity_session_tick', [OptivaxERP\Cron\ActivitySessionCronWorker::class, 'run']);

        OptivaxERP\Cron\ActivityHeartbeatCronWorker::registerSchedule();
        add_action('optivax_erp_activity_heartbeat_tick', [OptivaxERP\Cron\ActivityHeartbeatCronWorker::class, 'run']);
    }

    public function loadTextDomain(): void
    {
        load_plugin_textdomain('optivax-erp-backend', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function registerRoutes(): void
    {
        foreach ($this->routeFiles() as $routeClass) {
            if (class_exists($routeClass) && method_exists($routeClass, 'register')) {
                $routeClass::register();
            }
        }
    }

    /**
     * Every module's route-registration class. Listed explicitly (not
     * globbed) so load order and coverage are auditable at a glance.
     */
    private function routeFiles(): array
    {
        return [
            OptivaxERP\Routes\AuthRoutes::class,
            OptivaxERP\Routes\ProfileRoutes::class,
            OptivaxERP\Routes\ProfileMeRoutes::class,
            OptivaxERP\Routes\SecurityAuditLogRoutes::class,
            OptivaxERP\Routes\StripeRoutes::class,
            OptivaxERP\Routes\DepartmentRoutes::class,
            OptivaxERP\Routes\ShiftRoutes::class,
            OptivaxERP\Routes\CompanyHolidayRoutes::class,
            OptivaxERP\Routes\OrganizationRoutes::class,
            OptivaxERP\Routes\SubscriptionRoutes::class,
            OptivaxERP\Routes\CompanySettingsRoutes::class,
            OptivaxERP\Routes\ClientRoutes::class,
            OptivaxERP\Routes\ClientOwnershipRoutes::class,
            OptivaxERP\Routes\ProjectRoutes::class,
            OptivaxERP\Routes\TaskRoutes::class,
            OptivaxERP\Routes\DeliverableRoutes::class,
            OptivaxERP\Routes\RevisionRoutes::class,
            OptivaxERP\Routes\ProductionAssignmentRoutes::class,
            OptivaxERP\Routes\FileRoutes::class,
            OptivaxERP\Routes\InvoiceRoutes::class,
            OptivaxERP\Routes\PaymentRoutes::class,
            OptivaxERP\Routes\CommissionRoutes::class,
            OptivaxERP\Routes\BudgetRoutes::class,
            OptivaxERP\Routes\AttendanceRoutes::class,
            OptivaxERP\Routes\AttendanceImportRoutes::class,
            OptivaxERP\Routes\ActivityRoutes::class,
            OptivaxERP\Routes\LeaveRequestRoutes::class,
            OptivaxERP\Routes\PayrollRoutes::class,
            OptivaxERP\Routes\EmployeeExtraRoutes::class,
            OptivaxERP\Routes\LeadRoutes::class,
            OptivaxERP\Routes\SalesOpsRoutes::class,
            OptivaxERP\Routes\SalesWidgetRoutes::class,
            OptivaxERP\Routes\MarketingCampaignRoutes::class,
            OptivaxERP\Routes\ContentCalendarRoutes::class,
            OptivaxERP\Routes\EmailMarketingRoutes::class,
            OptivaxERP\Routes\SocialTrackingRoutes::class,
            OptivaxERP\Routes\ItSupportRoutes::class,
            OptivaxERP\Routes\BiometricAttendanceRoutes::class,
            OptivaxERP\Routes\CalendarEventRoutes::class,
            OptivaxERP\Routes\ConversationRoutes::class,
            OptivaxERP\Routes\NotificationRoutes::class,
            OptivaxERP\Routes\AuditLogRoutes::class,
            OptivaxERP\Routes\AutomationRoutes::class,
        ];
    }
}

register_activation_hook(__FILE__, ['OptivaxERP\\Database\\Migrator', 'runOnActivation']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\EmailQueueWorker', 'clearSchedule']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\AutomationCronWorker', 'clearSchedule']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\BiometricAttendanceCronWorker', 'clearSchedule']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\DeviceSyncCron', 'clearSchedule']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\ActivitySessionCronWorker', 'clearSchedule']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\ActivityHeartbeatCronWorker', 'clearSchedule']);

add_action('plugins_loaded', ['OptivaxErpBackend', 'instance']);
