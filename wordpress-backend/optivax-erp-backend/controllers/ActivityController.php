<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\DepartmentMapper;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Repositories\ActivityRepository;
use OptivaxERP\Repositories\AttendanceRepository;
use OptivaxERP\Repositories\UserProfileRepository;
use OptivaxERP\Services\AuthService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/activity/*. Every endpoint here is inherently self-scoped —
 * every authenticated user manages their own login/logout/break session, so
 * these gate on "authenticated at all" (no RBAC domain), matching
 * AttendanceController's self-check-in reasoning.
 */
final class ActivityController
{
    private ActivityRepository $repo;

    public function __construct()
    {
        $this->repo = new ActivityRepository();
    }

    /** GET /activity/current */
    public function current(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $userId = (string) AuthMiddleware::currentUserId();
        $session = $this->resolveAndTouchSession($userId);
        $sessionDto = $session ? $this->repo->toSessionDto($session) : null;
        $activeBreakRow = $session ? $this->repo->findActiveBreak($session['id']) : null;

        return ApiResponse::ok([
            'session' => $sessionDto,
            'activeBreak' => $activeBreakRow ? [
                'sessionId' => $session['id'],
                'userId' => $userId,
                'breakId' => $activeBreakRow['id'],
                'type' => $activeBreakRow['type'],
                'startTime' => $activeBreakRow['start_time'],
                'allowedMinutes' => (int) $activeBreakRow['allowed_minutes'],
            ] : null,
            'breakStatus' => $session ? $this->buildBreakStatus($userId, $session, $activeBreakRow) : null,
        ]);
    }

    /**
     * POST /activity/heartbeat — dedicated keep-alive endpoint, called every
     * ~30s while the app is open (ActivityContext.tsx's recurring poll).
     * Functionally the same self-healing/heartbeat behavior current() offers
     * as a side effect (resolveAndTouchSession() is shared by both) —
     * exposed as its own endpoint so "Heartbeat Updated" shows up as its own
     * distinct log entry from "Session Found", and so the client's recurring
     * poll doesn't need to look like a full page-load read.
     */
    public function heartbeat(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $userId = (string) AuthMiddleware::currentUserId();
        $session = $this->resolveAndTouchSession($userId);
        $activeBreakRow = $session ? $this->repo->findActiveBreak($session['id']) : null;

        return ApiResponse::ok([
            'session' => $session ? $this->repo->toSessionDto($session) : null,
            'activeBreak' => $activeBreakRow ? [
                'sessionId' => $session['id'],
                'userId' => $userId,
                'breakId' => $activeBreakRow['id'],
                'type' => $activeBreakRow['type'],
                'startTime' => $activeBreakRow['start_time'],
                'allowedMinutes' => (int) $activeBreakRow['allowed_minutes'],
            ] : null,
            'breakStatus' => $session ? $this->buildBreakStatus($userId, $session, $activeBreakRow) : null,
        ]);
    }

    /**
     * Combines ActivityRepository::computeBreakStatus() (elapsed time,
     * balances, overdue/warning state, remaining shift time — all derived
     * from activity_sessions/activity_breaks) with a read-only lookup of
     * today's attendance status from AttendanceRepository. This is the only
     * place this controller reads attendance_records, and it never writes to
     * it — attendanceStatus is informational/display-only, it never gates
     * whether a break can start (biometric attendance aggregation lags
     * real-time, so hard-blocking on it would risk wrongly refusing a break
     * to a genuinely-working employee).
     */
    private function buildBreakStatus(string $userId, array $session, ?array $activeBreakRow): array
    {
        $status = $this->repo->computeBreakStatus($session, $activeBreakRow);
        $attendance = (new AttendanceRepository())->findByUserAndDate($userId, current_time('Y-m-d'));
        $status['attendanceStatus'] = $attendance['status'] ?? null;
        return $status;
    }

    /**
     * Shared by current()/heartbeat() — both are passive "what's my state /
     * keep me alive" pings, never a deliberate re-authentication event, so
     * both resolve today's session via findOrCreateTodaySession() (which
     * never reopens an already-closed row — see that method's doc comment
     * for why) rather than login() (which does reopen). Only touches the
     * heartbeat timestamp when the resulting session is genuinely still
     * open; a closed row (manual or 8-hour auto-logout) is returned as-is,
     * untouched, so the frontend's auto-logout transition detection still
     * sees it. If the closed row is specifically an 8-hour auto-logout that
     * no client has observed yet, this is also where that discovery gets
     * acknowledged (logs SESSION_TIMEOUT exactly once, however many tabs are
     * polling concurrently — see acknowledgeSessionTimeout()'s doc comment).
     */
    private function resolveAndTouchSession(string $userId): ?array
    {
        $session = $this->repo->findSessionToday($userId);

        if (!$session) {
            // No row for today yet — today's row is otherwise only ever
            // created by the login-form submit flow, so a browser session
            // that's still validly authenticated but crossed midnight
            // without resubmitting the form (or was restored from a
            // long-lived cookie on page load) would otherwise have no
            // session row at all — the user is clearly authenticated and
            // using the app, but Start Break would spuriously 409
            // NO_ACTIVE_SESSION. findOrCreateTodaySession() is idempotent
            // (guarded by the user_date UNIQUE KEY), so calling it here is safe.
            $profile = (new UserProfileRepository())->findById((int) $userId);
            $this->repo->findOrCreateTodaySession(
                $userId,
                $profile['full_name'] ?? '',
                $profile['role'] ?? AuthMiddleware::currentRole() ?? '',
                $profile['departmentId'] ?? null,
                self::requestUserAgent(),
                self::requestIp()
            );
            return $this->repo->findSessionToday($userId);
        }

        if ($session['logout_time'] === null) {
            $this->repo->touchHeartbeat($userId);
            return $this->repo->findSessionToday($userId);
        }

        if (($session['session_status'] ?? null) === 'auto_logout') {
            $this->repo->acknowledgeSessionTimeout($session);
        }

        return $session;
    }

    /**
     * GET /activity/sessions — cross-user, date-ranged view for
     * LiveActivityDashboard.tsx / ActivityReports.tsx. Roles with
     * cross-department visibility (DepartmentMapper::hasAllDepartmentAccess:
     * super_admin, management, hr_admin, hr_member) see every department;
     * everyone else is scoped server-side to their own department_id —
     * never trusted from a query param, since this is the same
     * "server is the sole authority" rule the rest of this module follows.
     */
    public function sessions(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $dateFrom = $request->get_param('dateFrom') ?: null;
        $dateTo = $request->get_param('dateTo') ?: null;

        $role = AuthMiddleware::currentRole() ?? '';
        // it_admin gets company-wide session visibility here specifically
        // (IT Support's "who's logged in" use case) — a local exception to
        // this one endpoint's own scoping, not a change to
        // DepartmentMapper::hasAllDepartmentAccess() itself, which other
        // controllers also consult and must keep its existing meaning for.
        $orgWideRoles = ['it_admin'];
        $departmentId = null;
        if (!DepartmentMapper::hasAllDepartmentAccess($role) && !in_array($role, $orgWideRoles, true)) {
            $mapping = AuthService::mappingFor((int) AuthMiddleware::currentUserId());
            $departmentId = $mapping['department_id'] ?? DepartmentMapper::deptSlugForRole($role);
        }

        $sessions = $this->repo->listSessions($dateFrom, $dateTo, $departmentId);
        return ApiResponse::ok(['sessions' => $sessions]);
    }

    /** POST /activity/login */
    public function login(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $userId = (string) AuthMiddleware::currentUserId();
        $profile = (new UserProfileRepository())->findById((int) $userId);

        $session = $this->repo->login(
            $userId,
            $profile['full_name'] ?? '',
            $profile['role'] ?? AuthMiddleware::currentRole() ?? '',
            $profile['departmentId'] ?? null,
            self::requestUserAgent(),
            self::requestIp(),
            'web'
        );

        return ApiResponse::ok($session, [], 201);
    }

    /** Same inline capture pattern SecurityAuditLog::record() already uses elsewhere in this plugin — no new IP-resolution helper, no X-Forwarded-For handling (not used anywhere else in this codebase). */
    private static function requestIp(): ?string
    {
        return isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : null;
    }

    private static function requestUserAgent(): ?string
    {
        return isset($_SERVER['HTTP_USER_AGENT'])
            ? substr(sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])), 0, 255)
            : null;
    }

    /** POST /activity/logout */
    public function logout(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $this->repo->logout((string) AuthMiddleware::currentUserId());
        return ApiResponse::ok(null);
    }

    /** POST /activity/break/start */
    public function breakStart(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'type' => ['required', ['in', ['meal_dinner', 'casual_5']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $userId = (string) AuthMiddleware::currentUserId();
        $result = $this->repo->startBreak($userId, $data['type']);
        if (!$result['ok']) {
            // INVALID_ALLOWED_MINUTES means the server refused to create a
            // break it could never correctly judge overdue/not-overdue for —
            // a validation failure (422), distinct from the other reasons
            // here (409 conflicts against existing state: no session,
            // already on a break, meal already taken, balance exhausted).
            if ($result['reason'] === 'INVALID_ALLOWED_MINUTES') {
                return ApiResponse::validationError('Unable to start break: invalid break duration configuration', ['reason' => $result['reason']]);
            }
            return ApiResponse::error($result['reason'], 409, ['reason' => $result['reason']]);
        }

        $freshSession = $this->repo->findSessionToday($userId);
        $activeBreakRow = $freshSession ? $this->repo->findActiveBreak($freshSession['id']) : null;
        $breakStatus = $freshSession ? $this->buildBreakStatus($userId, $freshSession, $activeBreakRow) : null;

        return ApiResponse::ok(['session' => $result['session'], 'breakRecord' => $result['breakRecord'], 'breakStatus' => $breakStatus], [], 201);
    }

    /** POST /activity/break/end */
    public function breakEnd(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $userId = (string) AuthMiddleware::currentUserId();
        $result = $this->repo->endBreak($userId);
        if (!$result['ok']) {
            return ApiResponse::error($result['reason'], 409, ['reason' => $result['reason']]);
        }

        $freshSession = $this->repo->findSessionToday($userId);
        $breakStatus = $freshSession ? $this->buildBreakStatus($userId, $freshSession, null) : null;

        return ApiResponse::ok(['session' => $result['session'], 'breakRecord' => $result['breakRecord'], 'breakStatus' => $breakStatus]);
    }
}
