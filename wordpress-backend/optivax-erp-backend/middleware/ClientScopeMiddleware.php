<?php

namespace OptivaxERP\Middleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Resolves the effective ?clientId= a `client`-role session is allowed to use.
 * The frontend (ClientService.getByEmail -> getByClientId) trusts its own
 * ?clientId= query param, but a malicious client-role session could pass
 * someone else's id — this middleware re-resolves it server-side instead of
 * trusting the request.
 */
final class ClientScopeMiddleware
{
    /**
     * A syntactically-valid but unassignable id, forced into an equality
     * filter when a `client`-role caller has no matching client record. Using
     * this (instead of leaving the filter empty) keeps every repository's
     * "empty filter value -> no restriction" fallback from silently turning
     * into "return every client's rows" — the query still runs with a WHERE
     * clause, it just matches nothing.
     */
    public const NO_MATCH_SENTINEL = '00000000-0000-0000-0000-000000000000';

    /** Per-request memo so a controller calling effectiveClientId() and forcedFilter() in the same request only hits the DB once. */
    private static array $ownClientIdCache = [];

    /**
     * @return string|null The resolved clientId, or null if this user has no
     * client record (server should then return an empty list, not an error).
     */
    public static function resolveOwnClientId(int $userId, string $email): ?string
    {
        if (array_key_exists($email, self::$ownClientIdCache)) {
            return self::$ownClientIdCache[$email];
        }

        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'clients';

        $clientId = $wpdb->get_var(
            $wpdb->prepare("SELECT id FROM {$table} WHERE email = %s LIMIT 1", $email)
        );

        return self::$ownClientIdCache[$email] = ($clientId ?: null);
    }

    /**
     * For non-client roles, the requested clientId is passed through as-is
     * (foundation-only — no cross-role data-visibility restriction beyond
     * RBAC's domain/action check is implemented in Phase 2A).
     */
    public static function effectiveClientId(string $role, ?string $requestedClientId, int $userId, string $email): ?string
    {
        if ($role === 'client') {
            return self::resolveOwnClientId($userId, $email);
        }
        return $requestedClientId;
    }

    /**
     * Forced-filter helper for list endpoints: when the caller is a `client`
     * role, returns a one-element array pinning the given column to their own
     * resolved clientId (or the sentinel, if they have no client record) so
     * the caller can never see another client's rows regardless of what
     * filter value the request itself supplied. Returns an empty array for
     * every other role (no forced restriction).
     */
    public static function forcedFilter(string $column, string $role, int $userId, string $email): array
    {
        if ($role !== 'client') {
            return [];
        }
        $clientId = self::resolveOwnClientId($userId, $email);
        return [$column => $clientId ?? self::NO_MATCH_SENTINEL];
    }
}
