<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Logger;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Uuid;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/activity/*. Deliberately NOT an AbstractRepository — this is
 * two related tables (activity_sessions, activity_breaks) with server-side
 * business rules (break balances, warnings, timing), not a plain per-row CRUD
 * resource. The server is the sole authority on every rule enforced here —
 * the frontend never computes any of it, only displays whatever comes back.
 *
 * Business rules (mirrors src/types/activity.ts exactly):
 *  - One session row per (user, calendar day) — UNIQUE KEY user_date.
 *  - meal_dinner: 60 allowed minutes, only once per session.
 *  - casual_5: a 15-minute total daily pool shared across any number of
 *    casual breaks that day (CASUAL_DAILY_BALANCE_MINUTES) — each individual
 *    break's allowedMinutes is capped at min(5, remaining pool at start time).
 *  - A break exceeding its own allowedMinutes is flagged status=warning and
 *    increments the session's warning_count.
 *  - A session past MAX_SHIFT_HOURS since login_time is force-closed by the
 *    hourly ActivitySessionCronWorker (auto_logout=1), independent of any
 *    activity — see closeStaleOpenSessions().
 *  - is_online is a separate, lightweight live-presence flag maintained by
 *    the per-minute ActivityHeartbeatCronWorker — it never ends a session or
 *    touches attendance, it only reflects "has this client pinged recently."
 *
 * Every mutating method (login/logout/startBreak/endBreak/
 * closeStaleOpenSessions) wraps its critical section in Transaction::run(),
 * locking the day's session row with SELECT ... FOR UPDATE before re-checking
 * conditions and writing — this is what makes double-clicks, multiple open
 * tabs, and duplicate network retries safe (idempotent) rather than merely
 * "usually fine."
 */
final class ActivityRepository
{
    private const CASUAL_DAILY_BALANCE_MINUTES = 15;
    private const BREAK_ALLOWED_MINUTES = ['meal_dinner' => 60, 'casual_5' => 5];
    private const BREAK_LABELS = ['meal_dinner' => 'Dinner Break', 'casual_5' => 'Casual Break (5 min)'];
    private const BREAK_CATEGORY = ['meal_dinner' => 'meal', 'casual_5' => 'casual'];
    /** Mirrors ActivitySessionCronWorker::MAX_SESSION_HOURS — kept as an independent constant here (same convention this codebase already uses elsewhere) so remainingShiftTime can never disagree with the real auto-logout cutoff. */
    private const MAX_SHIFT_HOURS = 8;
    /** A break overdue by more than this many minutes is 'critical' instead of just 'warning'. */
    private const CRITICAL_OVERDUE_MINUTES = 5;

    /**
     * ROOT CAUSE FIX: every DATETIME column in this table is written via
     * current_time('mysql', true) — an explicit UTC wall-clock string with no
     * timezone marker. Parsing that string with a bare strtotime() makes PHP
     * interpret it using the server's *ambient default timezone*
     * (date.timezone in php.ini / date_default_timezone_set()), not UTC. On
     * any host where that default isn't UTC, a bare strtotime() silently
     * shifts the result by the timezone offset — e.g. a break that started
     * seconds ago gets read back as having started hours ago, so it appears
     * "Overdue" immediately. Appending the literal 'UTC' marker forces PHP to
     * interpret the string correctly regardless of the server's configured
     * default timezone, so elapsed-time math is always
     * (true UTC now) - (true UTC start) — this is the ONLY correct way to
     * parse a value written by current_time('mysql', true) back into a Unix
     * timestamp. Every strtotime() call on a stored session/break timestamp
     * in this file must go through this helper, not call strtotime() directly.
     */
    private static function toUtcTimestamp(?string $mysqlDateTime): ?int
    {
        if (!$mysqlDateTime) {
            return null;
        }
        $ts = strtotime($mysqlDateTime . ' UTC');
        return $ts !== false ? $ts : null;
    }

    private function sessionsTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'activity_sessions';
    }

    private function breaksTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'activity_breaks';
    }

    /**
     * Backs GET /activity/sessions (LiveActivityDashboard.tsx, ActivityReports.tsx)
     * — a cross-user, date-ranged view, unlike every other method here (which
     * are self-scoped). $departmentId is optional and narrows to one
     * department; passing null returns every department's sessions, so the
     * controller — not this method — decides whether the caller is allowed
     * to omit it.
     */
    public function listSessions(?string $dateFrom, ?string $dateTo, ?string $departmentId = null): array
    {
        global $wpdb;
        $where = [];
        $values = [];

        if ($dateFrom) {
            $where[] = 'date >= %s';
            $values[] = $dateFrom;
        }
        if ($dateTo) {
            $where[] = 'date <= %s';
            $values[] = $dateTo;
        }
        if ($departmentId) {
            $where[] = 'department_id = %s';
            $values[] = $departmentId;
        }

        $sql = "SELECT * FROM {$this->sessionsTable()}";
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY date DESC, login_time DESC';

        $rows = $values ? $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A) : $wpdb->get_results($sql, ARRAY_A);
        if (!$rows) {
            return [];
        }

        // toSessionDto() normally issues its own listBreaks() query — fine
        // for the single-session call sites (login/logout/startBreak/
        // endBreak), but this method returns many sessions at once
        // (LiveActivityDashboard.tsx, ActivityReports.tsx), so mapping
        // through it as-is would run one breaks query per session (N+1).
        // Batch-fetch every session's breaks in one query instead, grouped
        // by session_id, and hand each session its own slice.
        $sessionIds = array_column($rows, 'id');
        $placeholders = implode(',', array_fill(0, count($sessionIds), '%s'));
        $breakRows = $wpdb->get_results(
            $wpdb->prepare("SELECT * FROM {$this->breaksTable()} WHERE session_id IN ({$placeholders}) ORDER BY start_time ASC", $sessionIds),
            ARRAY_A
        );
        $breaksBySession = [];
        foreach ($breakRows ?: [] as $breakRow) {
            $breaksBySession[$breakRow['session_id']][] = $this->toBreakDto($breakRow);
        }

        return array_map(
            fn (array $row) => $this->toSessionDto($row, $breaksBySession[$row['id']] ?? []),
            $rows
        );
    }

    public function findSessionToday(string $userId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->sessionsTable()} WHERE user_id = %s AND date = CURDATE()",
            $userId
        ), ARRAY_A);
        return $row ?: null;
    }

    /** Same lookup as findSessionToday() but locks the row (SELECT ... FOR UPDATE) for the duration of the caller's enclosing transaction — used by every mutating method below to serialize concurrent calls for the same user/day. */
    private function lockSessionToday(string $userId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->sessionsTable()} WHERE user_id = %s AND date = CURDATE() FOR UPDATE",
            $userId
        ), ARRAY_A);
        return $row ?: null;
    }

    /**
     * The deliberate-authentication-event path: guarantees the caller ends
     * up with an ACTIVE session no matter what today's row currently looks
     * like — "if login succeeded, an active session must exist" is enforced
     * structurally here, not left to the caller to have called anything
     * else first.
     *   - no row for today yet            -> create one (Session Created)
     *   - row exists and is already open  -> refresh its device/IP/heartbeat
     *                                        snapshot (Session Found)
     *   - row exists but is closed        -> REOPEN the same row (Session
     *     (manual or 8h auto-logout)         Reopened): the UNIQUE KEY
     *                                        (user_id, date) makes a second
     *                                        row for today impossible, so a
     *                                        fresh login must reuse it.
     *                                        login_time resets to now (a
     *                                        fresh login gets a fresh 8-hour
     *                                        window) but the row's id — and
     *                                        therefore today's already-taken
     *                                        breaks/warning_count — is kept,
     *                                        so logging out and back in can't
     *                                        be used to reset the daily
     *                                        break-balance pool.
     *
     * Wrapped in Transaction::run() with the session row locked for its
     * duration, so two near-simultaneous login calls (double-submit, two
     * tabs racing on page load) can't both fall through to conflicting
     * writes — this is the "duplicate login must be impossible" guarantee.
     */
    public function login(string $userId, string $userName, string $userRole, ?string $departmentId, ?string $userAgent = null, ?string $ipAddress = null, string $loginSource = 'web'): array
    {
        return \OptivaxERP\Helpers\Transaction::run(function () use ($userId, $userName, $userRole, $departmentId, $userAgent, $ipAddress, $loginSource) {
            global $wpdb;
            $now = current_time('mysql', true);
            $existing = $this->lockSessionToday($userId);

            if (!$existing) {
                $session = $this->createSession($userId, $userName, $userRole, $departmentId, $userAgent, $ipAddress, $loginSource);
                $this->logAudit('ACTIVITY_LOGIN', $userId, $userName, $userRole, "{$userName} logged in (session created)");
                return $session;
            }

            if ($existing['logout_time'] === null && $existing['session_status'] === 'active') {
                $refreshed = ['ip_address' => $ipAddress, 'user_agent' => $userAgent, 'last_heartbeat' => $now, 'is_online' => 1];
                $wpdb->update($this->sessionsTable(), $refreshed, ['id' => $existing['id']]);
                Logger::info('activity-session', "Session found (already active) for user {$userId}", ['sessionId' => $existing['id']]);
                $this->logAudit('ACTIVITY_LOGIN', $userId, $userName, $userRole, "{$userName} logged in (session already active)");
                return $this->toSessionDto(array_merge($existing, $refreshed));
            }

            $reopened = [
                'login_time' => $now,
                'logout_time' => null,
                'auto_logout' => 0,
                'session_status' => 'active',
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'last_heartbeat' => $now,
                'login_source' => Sanitize::text($loginSource),
                'is_online' => 1,
            ];
            $wpdb->update($this->sessionsTable(), $reopened, ['id' => $existing['id']]);
            Logger::info('activity-session', "Session reopened for user {$userId}", ['sessionId' => $existing['id']]);
            $this->logAudit('ACTIVITY_LOGIN', $userId, $userName, $userRole, "{$userName} logged in (session reopened)");
            return $this->toSessionDto(array_merge($existing, $reopened));
        });
    }

    /**
     * The passive "just make sure something exists" path used by current()/
     * heartbeat() polling — unlike login(), this NEVER reopens an
     * already-closed session. A row closed by the 8-hour auto-logout cron
     * must stay visibly closed here, because the frontend's auto-logout
     * detection (ActivityContext.tsx) compares consecutive poll results to
     * notice that exact transition and react to it (by really logging the
     * user out) — silently reviving the row underneath it would hide that
     * transition forever. Only creates a row when none exists at all yet.
     * Not a "deliberate login event" — does not write an ACTIVITY_LOGIN
     * audit entry (mirrors this method's own pre-existing distinction).
     */
    public function findOrCreateTodaySession(string $userId, string $userName, string $userRole, ?string $departmentId, ?string $userAgent = null, ?string $ipAddress = null, string $loginSource = 'web'): array
    {
        $existing = $this->findSessionToday($userId);
        if ($existing) {
            Logger::info('activity-session', "Session found for user {$userId}", ['sessionId' => $existing['id']]);
            return $this->toSessionDto($existing);
        }
        return $this->createSession($userId, $userName, $userRole, $departmentId, $userAgent, $ipAddress, $loginSource);
    }

    private function createSession(string $userId, string $userName, string $userRole, ?string $departmentId, ?string $userAgent, ?string $ipAddress, string $loginSource): array
    {
        global $wpdb;
        $now = current_time('mysql', true);
        $row = [
            'id' => Uuid::v4(),
            'user_id' => $userId,
            'user_name' => Sanitize::text($userName),
            'user_role' => Sanitize::text($userRole),
            'department_id' => $departmentId ? Sanitize::text($departmentId) : null,
            'date' => current_time('Y-m-d'),
            'login_time' => $now,
            'warning_count' => 0,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'last_heartbeat' => $now,
            'auto_logout' => 0,
            'session_status' => 'active',
            'login_source' => Sanitize::text($loginSource),
            'is_online' => 1,
            'timeout_acknowledged' => 0,
        ];
        $wpdb->insert($this->sessionsTable(), $row);
        Logger::info('activity-session', "Session created for user {$userId}", ['sessionId' => $row['id']]);
        return $this->toSessionDto($row);
    }

    /** Only touches an open session (no-ops for a closed one, so viewing/pinging after logout never revives a row). Also flips is_online back to 1 — recovery from any prior heartbeat-loss flag. */
    public function touchHeartbeat(string $userId): void
    {
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            "UPDATE {$this->sessionsTable()} SET last_heartbeat = %s, is_online = 1 WHERE user_id = %s AND date = CURDATE() AND logout_time IS NULL",
            current_time('mysql', true),
            $userId
        ));
        Logger::info('activity-session', "Heartbeat updated for user {$userId}");
    }

    /**
     * Closes today's session and, if a break is left active, auto-closes it
     * too (an employee shouldn't be able to leave a break dangling by
     * logging out mid-break) — both writes must land together. Locked +
     * transactional so a duplicate logout call (closing tab firing a beacon
     * while the user also clicked Logout) safely no-ops on the second call.
     */
    public function logout(string $userId): void
    {
        \OptivaxERP\Helpers\Transaction::run(function () use ($userId) {
            global $wpdb;
            $session = $this->lockSessionToday($userId);
            if (!$session || $session['logout_time'] !== null) {
                return;
            }

            $this->autoCloseActiveBreakIfAny($session['id']);

            $wpdb->update(
                $this->sessionsTable(),
                ['logout_time' => current_time('mysql', true), 'session_status' => 'completed'],
                ['id' => $session['id']]
            );
            Logger::info('activity-session', "Logout for user {$userId}", ['sessionId' => $session['id']]);
            $this->logAudit('ACTIVITY_LOGOUT', $userId, $session['user_name'], $session['user_role'], "{$session['user_name']} logged out");
        });
    }

    /** Shared by logout() and closeStaleOpenSessions() — an employee (or the 8-hour cron cutoff) shouldn't be able to leave a break dangling when a session closes. */
    private function autoCloseActiveBreakIfAny(string $sessionId): void
    {
        $activeBreak = $this->findActiveBreak($sessionId);
        if ($activeBreak) {
            $this->closeBreak($activeBreak['id']);
        }
    }

    /**
     * Cron-driven (ActivitySessionCronWorker, hourly): force-closes any
     * session still open $maxHours after its login_time, flagging
     * auto_logout=1 so the frontend/reports can distinguish this from a
     * real manual logout. Cutoff is computed in PHP/UTC
     * (current_time('mysql', true) is what every other timestamp in this
     * table is written with) rather than SQL NOW(), which would silently
     * drift by the DB server's own timezone offset if it isn't UTC.
     * timeout_acknowledged is reset to 0 on every closure, re-arming the
     * one-time SESSION_TIMEOUT notice (see acknowledgeSessionTimeout()) for
     * this specific closure event.
     *
     * @return int number of sessions closed, for cron logging.
     */
    public function closeStaleOpenSessions(int $maxHours): int
    {
        global $wpdb;
        $cutoff = gmdate('Y-m-d H:i:s', time() - ($maxHours * 3600));

        $stale = $wpdb->get_results($wpdb->prepare(
            "SELECT id, user_id, user_name, user_role FROM {$this->sessionsTable()} WHERE logout_time IS NULL AND login_time <= %s",
            $cutoff
        ), ARRAY_A);
        if (!$stale) {
            return 0;
        }

        $closedAt = current_time('mysql', true);
        foreach ($stale as $row) {
            \OptivaxERP\Helpers\Transaction::run(function () use ($row, $closedAt, $maxHours) {
                global $wpdb;
                $this->autoCloseActiveBreakIfAny($row['id']);
                $wpdb->update(
                    $this->sessionsTable(),
                    ['logout_time' => $closedAt, 'auto_logout' => 1, 'session_status' => 'auto_logout', 'timeout_acknowledged' => 0],
                    ['id' => $row['id']]
                );
                Logger::info('activity-session', "Auto-logout for user {$row['user_id']}", ['sessionId' => $row['id']]);
                $this->logAudit('AUTO_LOGOUT', $row['user_id'], $row['user_name'], $row['user_role'], "{$row['user_name']}'s session was automatically closed after reaching the {$maxHours}-hour cap");
            });
        }

        return count($stale);
    }

    /**
     * Live-presence sweep (ActivityHeartbeatCronWorker, every minute): flags
     * any still-open session whose last_heartbeat is older than $maxMinutes
     * as is_online=0. Purely a presence indicator for IT Support's Live
     * Activity Dashboard — never touches logout_time/session_status/
     * attendance. Naturally idempotent: once flagged offline, a session
     * drops out of this WHERE clause, so it can't log HEARTBEAT_LOST again
     * until a real heartbeat (touchHeartbeat()) flips it back online and it
     * later goes stale again.
     *
     * @return int number of sessions newly flagged offline, for cron logging.
     */
    public function markStaleHeartbeatsOffline(int $maxMinutes): int
    {
        global $wpdb;
        $cutoff = gmdate('Y-m-d H:i:s', time() - ($maxMinutes * 60));

        $stale = $wpdb->get_results($wpdb->prepare(
            "SELECT id, user_id, user_name, user_role FROM {$this->sessionsTable()} WHERE logout_time IS NULL AND is_online = 1 AND last_heartbeat IS NOT NULL AND last_heartbeat <= %s",
            $cutoff
        ), ARRAY_A);
        if (!$stale) {
            return 0;
        }

        foreach ($stale as $row) {
            $wpdb->update($this->sessionsTable(), ['is_online' => 0], ['id' => $row['id']]);
            Logger::info('activity-session', "Heartbeat lost for user {$row['user_id']}", ['sessionId' => $row['id']]);
            $this->logAudit('HEARTBEAT_LOST', $row['user_id'], $row['user_name'], $row['user_role'], "{$row['user_name']}'s session went inactive (no heartbeat for {$maxMinutes} minute(s))");
        }

        return count($stale);
    }

    /**
     * Called from ActivityController's polling path when it finds an
     * already-closed session with session_status='auto_logout'. The atomic
     * `WHERE timeout_acknowledged = 0` flip means only the first of possibly
     * several concurrently-polling browser tabs actually logs SESSION_TIMEOUT
     * — distinct from AUTO_LOGOUT (the cron's own authoritative closure
     * record), this marks the moment a client first discovered it happened.
     */
    public function acknowledgeSessionTimeout(array $session): void
    {
        global $wpdb;
        $updated = $wpdb->query($wpdb->prepare(
            "UPDATE {$this->sessionsTable()} SET timeout_acknowledged = 1 WHERE id = %s AND timeout_acknowledged = 0",
            $session['id']
        ));
        if ((int) $updated > 0) {
            Logger::info('activity-session', "Session timeout acknowledged for user {$session['user_id']}", ['sessionId' => $session['id']]);
            $this->logAudit('SESSION_TIMEOUT', $session['user_id'], $session['user_name'], $session['user_role'], "{$session['user_name']}'s auto-logged-out session was first observed by a client poll");
        }
    }

    public function findActiveBreak(string $sessionId): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$this->breaksTable()} WHERE session_id = %s AND end_time IS NULL",
            $sessionId
        ), ARRAY_A);
        return $row ?: null;
    }

    private function hasTakenMeal(string $sessionId): bool
    {
        global $wpdb;
        $count = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->breaksTable()} WHERE session_id = %s AND type = 'meal_dinner'",
            $sessionId
        ));
        return $count > 0;
    }

    private function casualMinutesUsedToday(string $sessionId): int
    {
        global $wpdb;
        $sum = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(actual_minutes) FROM {$this->breaksTable()} WHERE session_id = %s AND category = 'casual' AND actual_minutes IS NOT NULL",
            $sessionId
        ));
        return (int) ($sum ?? 0);
    }

    /**
     * @return array{ok:true,session:array,breakRecord:array}|array{ok:false,reason:string}
     */
    public function startBreak(string $userId, string $type): array
    {
        if (!isset(self::BREAK_ALLOWED_MINUTES[$type])) {
            return ['ok' => false, 'reason' => 'INVALID_TYPE'];
        }

        return \OptivaxERP\Helpers\Transaction::run(function () use ($userId, $type) {
            global $wpdb;
            // Lock this user's today-row for the duration of the check+write
            // so two near-simultaneous start-break calls (double-click, two
            // open tabs) can't both pass the "no active break" check before
            // either INSERTs — this is the "duplicate break must be
            // impossible" guarantee.
            $session = $this->lockSessionToday($userId);

            if (!$session || $session['logout_time'] !== null) {
                $reason = ($session && $session['session_status'] === 'auto_logout') ? 'AUTO_LOGOUT' : 'NO_ACTIVE_SESSION';
                return ['ok' => false, 'reason' => $reason];
            }

            if ($this->findActiveBreak($session['id'])) {
                return ['ok' => false, 'reason' => 'ALREADY_ACTIVE'];
            }

            if ($type === 'meal_dinner' && $this->hasTakenMeal($session['id'])) {
                return ['ok' => false, 'reason' => 'MEAL_ALREADY_TAKEN'];
            }

            $allowedMinutes = self::BREAK_ALLOWED_MINUTES[$type];
            if ($type === 'casual_5') {
                $remaining = self::CASUAL_DAILY_BALANCE_MINUTES - $this->casualMinutesUsedToday($session['id']);
                if ($remaining <= 0) {
                    return ['ok' => false, 'reason' => 'CASUAL_BALANCE_EXHAUSTED'];
                }
                $allowedMinutes = min($allowedMinutes, $remaining);
            }

            // Defensive validation (never trust a computed value blindly): a
            // break must never be created with a null/zero/negative allowed
            // duration — that would make it appear "Overdue" the instant it
            // starts. This is unreachable today (BREAK_ALLOWED_MINUTES is a
            // fixed positive map and the casual branch above already rejects
            // remaining<=0 before this point), but a future change to either
            // must not be able to silently create a broken break record.
            if ($allowedMinutes === null || $allowedMinutes <= 0) {
                Logger::error('activity-session', "Refusing to start break with invalid allowedMinutes for user {$userId}", ['type' => $type, 'allowedMinutes' => $allowedMinutes]);
                return ['ok' => false, 'reason' => 'INVALID_ALLOWED_MINUTES'];
            }

            $breakRow = [
                'id' => Uuid::v4(),
                'session_id' => $session['id'],
                'user_id' => $userId,
                'type' => $type,
                'label' => self::BREAK_LABELS[$type],
                'category' => self::BREAK_CATEGORY[$type],
                'start_time' => current_time('mysql', true),
                'allowed_minutes' => $allowedMinutes,
            ];
            $wpdb->insert($this->breaksTable(), $breakRow);
            Logger::info('activity-session', "Break started for user {$userId}", ['sessionId' => $session['id'], 'type' => $type]);
            $this->logAudit('BREAK_STARTED', $userId, $session['user_name'], $session['user_role'], "{$session['user_name']} started " . self::BREAK_LABELS[$type]);

            return [
                'ok' => true,
                'session' => $this->toSessionDto($session),
                'breakRecord' => $this->toBreakDto($breakRow),
            ];
        });
    }

    /** @return array{ok:true,session:array,breakRecord:array}|array{ok:false,reason:string} */
    public function endBreak(string $userId): array
    {
        return \OptivaxERP\Helpers\Transaction::run(function () use ($userId) {
            global $wpdb;
            $session = $this->lockSessionToday($userId);
            if (!$session || $session['logout_time'] !== null) {
                $reason = ($session && $session['session_status'] === 'auto_logout') ? 'AUTO_LOGOUT' : 'NO_ACTIVE_SESSION';
                return ['ok' => false, 'reason' => $reason];
            }

            $active = $this->findActiveBreak($session['id']);
            if (!$active) {
                // Already-ended (or never started) — returned as a clean
                // rejection rather than reprocessing, so a duplicate
                // break/end call (retry, double-click) is a safe no-op.
                return ['ok' => false, 'reason' => 'NO_ACTIVE_BREAK'];
            }

            $closed = $this->closeBreak($active['id']);

            if ($closed['status'] === 'warning') {
                $wpdb->query($wpdb->prepare(
                    "UPDATE {$this->sessionsTable()} SET warning_count = warning_count + 1 WHERE id = %s",
                    $session['id']
                ));
            }
            Logger::info('activity-session', "Break ended for user {$userId}", ['sessionId' => $session['id'], 'status' => $closed['status']]);
            $this->logAudit('BREAK_ENDED', $userId, $session['user_name'], $session['user_role'], "{$session['user_name']} ended {$closed['label']} ({$closed['status']}, {$closed['actual_minutes']}m)");

            return [
                'ok' => true,
                'session' => $this->toSessionDto($this->findSessionToday($userId) ?? $session),
                'breakRecord' => $this->toBreakDto($closed),
            ];
        });
    }

    /** Closes a break row (sets end_time, actual/exceeded minutes, status) and returns the updated row. */
    private function closeBreak(string $breakId): array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->breaksTable()} WHERE id = %s", $breakId), ARRAY_A);
        $endTime = current_time('mysql', true);
        $startTs = self::toUtcTimestamp($row['start_time']);
        $endTs = self::toUtcTimestamp($endTime);
        $actualMinutes = max(0, (int) round(($endTs - $startTs) / 60));
        $exceededMinutes = max(0, $actualMinutes - (int) $row['allowed_minutes']);
        $status = $exceededMinutes > 0 ? 'warning' : 'normal';

        $wpdb->update($this->breaksTable(), [
            'end_time' => $endTime,
            'actual_minutes' => $actualMinutes,
            'exceeded_minutes' => $exceededMinutes,
            'status' => $status,
        ], ['id' => $breakId]);

        return array_merge($row, [
            'end_time' => $endTime,
            'actual_minutes' => $actualMinutes,
            'exceeded_minutes' => $exceededMinutes,
            'status' => $status,
        ]);
    }

    private function listBreaks(string $sessionId): array
    {
        global $wpdb;
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->breaksTable()} WHERE session_id = %s ORDER BY start_time ASC",
            $sessionId
        ), ARRAY_A);
        return array_map([$this, 'toBreakDto'], $rows ?: []);
    }

    /**
     * Pure computation over an already-fetched session/activeBreak pair —
     * the single source of truth for every number/decision the Break widget
     * needs (elapsed time, remaining casual balance, meal-taken flag,
     * overdue/warning state, remaining shift time). React never recomputes
     * any of this; it only displays whatever this returns. elapsedSeconds is
     * derived fresh from the DB's start_time on every call (never from a
     * client-held timestamp), which is what makes the timer immune to a
     * browser refresh and consistent across multiple open tabs.
     *
     * attendanceStatus is deliberately NOT computed here — this repository
     * has no business reading attendance_records — the controller merges
     * that in separately (read-only) from AttendanceRepository.
     */
    public function computeBreakStatus(array $session, ?array $activeBreakRow): array
    {
        $now = time();

        $elapsedSeconds = 0;
        $allowedMinutes = 0;
        $isOverdue = false;
        $warningLevel = 'none';
        $invalidBreakData = false;

        if ($activeBreakRow) {
            $startTs = self::toUtcTimestamp($activeBreakRow['start_time'] ?? null);
            $allowedMinutes = isset($activeBreakRow['allowed_minutes']) ? (int) $activeBreakRow['allowed_minutes'] : 0;

            // Defensive validation: a break can only be judged overdue against
            // a genuinely valid start time and a positive allowed-minutes
            // value. If either is missing/invalid (corrupt row, migration
            // gap, etc.) we must NEVER mark it overdue — that would display a
            // false "Overdue" on data we can't actually trust. startBreak()
            // itself already refuses to create a break with allowedMinutes<=0
            // (see its own validation), so this only guards against
            // already-stored bad data, not new writes.
            if ($startTs === null || $allowedMinutes <= 0) {
                $invalidBreakData = true;
                Logger::error('activity-session', 'Invalid break timing data — refusing to mark overdue', [
                    'sessionId' => $session['id'] ?? null,
                    'breakId' => $activeBreakRow['id'] ?? null,
                    'startTime' => $activeBreakRow['start_time'] ?? null,
                    'allowedMinutes' => $allowedMinutes,
                ]);
            } else {
                $elapsedSeconds = max(0, $now - $startTs);
                $overdueSeconds = max(0, $elapsedSeconds - ($allowedMinutes * 60));
                $isOverdue = $overdueSeconds > 0;
                if ($isOverdue) {
                    $warningLevel = $overdueSeconds > (self::CRITICAL_OVERDUE_MINUTES * 60) ? 'critical' : 'warning';
                }
            }

            // TEMPORARY DEBUG LOGGING — added to diagnose the "break shows
            // Overdue immediately on start" production bug (root cause: a
            // bare strtotime() on a UTC-stored timestamp was silently
            // reinterpreted using the server's ambient default timezone).
            // Remove this Logger::info call once the fix is confirmed on the
            // live site.
            Logger::info('activity-session-debug', 'computeBreakStatus', [
                'breakType' => $activeBreakRow['type'] ?? null,
                'startTime' => $activeBreakRow['start_time'] ?? null,
                'currentServerTimeUtc' => gmdate('Y-m-d H:i:s', $now),
                'allowedMinutes' => $allowedMinutes,
                'elapsedSeconds' => $elapsedSeconds,
                'isOverdue' => $isOverdue,
            ]);
        }

        $loginTs = self::toUtcTimestamp($session['login_time'] ?? null);
        $remainingShiftTime = (!empty($session['logout_time']) || $loginTs === null)
            ? 0
            : max(0, (self::MAX_SHIFT_HOURS * 3600) - ($now - $loginTs));

        return [
            'currentBreak' => $activeBreakRow ? $this->toBreakDto($activeBreakRow) : null,
            'elapsedSeconds' => $elapsedSeconds,
            'allowedMinutes' => $allowedMinutes,
            'remainingBalance' => max(0, self::CASUAL_DAILY_BALANCE_MINUTES - $this->casualMinutesUsedToday($session['id'])),
            'mealTaken' => $this->hasTakenMeal($session['id']),
            'casualDailyLimitMinutes' => self::CASUAL_DAILY_BALANCE_MINUTES,
            'warningLevel' => $warningLevel,
            'isOverdue' => $isOverdue,
            'remainingShiftTime' => $remainingShiftTime,
            'invalidBreakData' => $invalidBreakData,
        ];
    }

    public function toSessionDto(array $row, ?array $breaksOverride = null): array
    {
        $breaks = $breaksOverride ?? $this->listBreaks($row['id']);
        $loginTs = self::toUtcTimestamp($row['login_time']);
        $logoutTs = self::toUtcTimestamp($row['logout_time'] ?? null);
        $sessionMinutes = $logoutTs ? max(0, (int) round(($logoutTs - $loginTs) / 60)) : null;
        $totalBreakMinutes = array_sum(array_map(fn ($b) => $b['actualMinutes'] ?? 0, $breaks));
        $activeMinutes = $sessionMinutes !== null ? max(0, $sessionMinutes - $totalBreakMinutes) : null;
        [$browser, $device] = self::parseUserAgent($row['user_agent'] ?? null);

        return [
            'id' => $row['id'],
            'userId' => $row['user_id'],
            'userName' => $row['user_name'],
            'userRole' => $row['user_role'],
            'departmentId' => $row['department_id'] ?: null,
            'date' => $row['date'],
            'loginTime' => $row['login_time'],
            'logoutTime' => $row['logout_time'] ?: null,
            'sessionMinutes' => $sessionMinutes,
            'totalBreakMinutes' => $totalBreakMinutes,
            'activeMinutes' => $activeMinutes,
            'warningCount' => (int) $row['warning_count'],
            'breaks' => $breaks,
            'ipAddress' => $row['ip_address'] ?? null,
            'browser' => $browser,
            'device' => $device,
            'lastHeartbeat' => $row['last_heartbeat'] ?? null,
            'autoLogout' => !empty($row['auto_logout']),
            'sessionStatus' => $row['session_status'] ?? ($row['logout_time'] ?? null ? 'completed' : 'active'),
            'loginSource' => $row['login_source'] ?? 'web',
            'isOnline' => !array_key_exists('is_online', $row) || !empty($row['is_online']),
        ];
    }

    /**
     * Lightweight substring heuristic — not a full UA-parsing library
     * dependency. Good enough for the IT Support "what is this user on"
     * display use case; not meant to be exhaustive or bot-detecting.
     * @return array{0: ?string, 1: ?string} [browser, device]
     */
    private static function parseUserAgent(?string $ua): array
    {
        if (!$ua) {
            return [null, null];
        }

        $browser = 'Other';
        if (stripos($ua, 'Edg/') !== false) {
            $browser = 'Edge';
        } elseif (stripos($ua, 'OPR/') !== false || stripos($ua, 'Opera') !== false) {
            $browser = 'Opera';
        } elseif (stripos($ua, 'Firefox') !== false) {
            $browser = 'Firefox';
        } elseif (stripos($ua, 'Chrome') !== false) {
            $browser = 'Chrome';
        } elseif (stripos($ua, 'Safari') !== false) {
            $browser = 'Safari';
        }

        $device = (stripos($ua, 'Mobile') !== false || stripos($ua, 'Android') !== false || stripos($ua, 'iPhone') !== false)
            ? 'Mobile'
            : 'Desktop';

        return [$browser, $device];
    }

    public function toBreakDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'type' => $row['type'],
            'label' => $row['label'],
            'category' => $row['category'],
            'startTime' => $row['start_time'],
            'endTime' => $row['end_time'] ?? null,
            'allowedMinutes' => (int) $row['allowed_minutes'],
            'actualMinutes' => isset($row['actual_minutes']) ? (int) $row['actual_minutes'] : null,
            'exceededMinutes' => isset($row['exceeded_minutes']) ? (int) $row['exceeded_minutes'] : null,
            'status' => $row['status'] ?? null,
        ];
    }

    /**
     * Direct backend-authored audit trail for this module's lifecycle events
     * (login/logout/break start/break end/heartbeat-lost/session-timeout/
     * auto-logout) — writes straight to AuditLogRepository rather than going
     * through the /audit-logs/create HTTP endpoint (which, before this
     * module became backend-driven, was the only way any of these events got
     * logged — from the frontend). entityType is always 'activity' and the
     * action strings match what the frontend previously wrote for the
     * overlapping events (BREAK_STARTED/BREAK_ENDED/AUTO_LOGOUT), so anything
     * already filtering on those strings elsewhere stays correct.
     */
    private function logAudit(string $action, string $userId, string $userName, string $userRole, string $description): void
    {
        (new AuditLogRepository())->create([
            'action' => $action,
            'entityType' => 'activity',
            'entityId' => $userId,
            'entityName' => $userName,
            'performedBy' => $userId,
            'performedByName' => $userName,
            'performedByRole' => $userRole,
            'description' => $description,
        ]);
    }
}
