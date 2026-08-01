<?php

namespace OptivaxERP\Services;

use OptivaxERP\Helpers\DepartmentMapper;
use OptivaxERP\Helpers\Logger;
use OptivaxERP\Repositories\DepartmentRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Resolves the department a user's role should automatically be assigned to — the fix for
 * "Management users never get linked to the Management department" (and, generally, any
 * department reference that was previously left as an unresolved legacy slug string instead
 * of a real `departments.id`). Two independent resolution paths, mirroring DepartmentMapper's
 * own two lookup conventions:
 *  - Domain-scoped roles (sales_admin, production_member, ...) -> DepartmentMapper::domainForRole()
 *    -> match a real `departments` row by its `domain` column.
 *  - Domain-less roles (currently only "management" — DepartmentMapper::ROLE_TO_DEPARTMENT_NAME)
 *    -> match by `name` instead, since there's no RBAC domain to key off.
 * Both paths auto-create the department if it doesn't exist yet (gated by AUTO_CREATE_ENABLED,
 * a single named switch) so a fresh install, or a role introduced after initial setup, never
 * silently leaves users unassigned. Every decision — resolved, auto-created, or failed to
 * resolve — is logged to the `department-auto-assign` channel so a future "why didn't this
 * assign" is diagnosable from the log instead of requiring a repeat investigation.
 */
final class DepartmentAutoAssignService
{
    private const AUTO_CREATE_ENABLED = true;

    private const LOG_CHANNEL = 'department-auto-assign';

    /**
     * Use when no departmentId was supplied at all — an empty employee-creation form field, or
     * a role change with no accompanying department change. Returns null only if the role isn't
     * recognized at all (neither domainForRole() nor departmentNameForRole() match it) —
     * callers must leave department_id untouched in that case, never clear it. Every real role
     * (including super_admin/client, resolved by name via departmentNameForRole()) now resolves
     * to something.
     */
    public static function resolveOrCreateDepartmentId(string $role): ?string
    {
        $domain = DepartmentMapper::domainForRole($role);
        $name = DepartmentMapper::departmentNameForRole($role);

        if (!$domain && !$name) {
            return null;
        }

        $repo = new DepartmentRepository();
        $existing = $domain
            ? self::firstMatch($repo->list(['domain' => $domain]))
            : self::firstMatch($repo->list(['name' => $name]));

        if ($existing) {
            Logger::info(self::LOG_CHANNEL, 'Resolved department for role', [
                'role' => $role, 'domain' => $domain, 'name' => $name, 'departmentId' => $existing['id'],
            ]);
            return $existing['id'];
        }

        if (!self::AUTO_CREATE_ENABLED) {
            Logger::error(self::LOG_CHANNEL, 'No matching department for role and auto-create is disabled', [
                'role' => $role, 'domain' => $domain, 'name' => $name,
            ]);
            return null;
        }

        $created = $repo->create([
            'name' => $name ?? DepartmentMapper::deptLabelForRole($role),
            'domain' => $domain ?? 'system',
        ]);
        Logger::info(self::LOG_CHANNEL, 'Auto-created missing department for role', [
            'role' => $role, 'departmentId' => $created['id'], 'name' => $created['name'], 'domain' => $created['domain'],
        ]);
        return $created['id'];
    }

    /**
     * Use when a departmentId WAS supplied but may be a legacy pre-Department-Master
     * "dept-<domain>" slug (src/pages/HR/Employees.tsx's DEPARTMENTS fallback dropdown still
     * submits these literal strings as its option value, not a real id) rather than a real
     * `departments.id`. Returns the input unchanged if it's already a real row, or if it
     * doesn't look like a slug this class recognizes — never silently discards a value it
     * doesn't understand.
     */
    public static function normalizeSlug(string $rawValue): string
    {
        $repo = new DepartmentRepository();
        if ($repo->find($rawValue)) {
            return $rawValue;
        }

        if (!str_starts_with($rawValue, 'dept-')) {
            return $rawValue;
        }

        $segment = substr($rawValue, 5);

        // "dept-management" is the one slug with no matching RBAC domain (domainForRole() is
        // null for "management" by design) — resolve it the same name-based way role-based
        // resolution does, instead of the domain match every other slug uses below.
        if ($segment === 'management') {
            $resolved = self::resolveOrCreateDepartmentId('management');
            Logger::info(self::LOG_CHANNEL, 'Resolved legacy "dept-management" slug by name', ['departmentId' => $resolved]);
            return $resolved ?? $rawValue;
        }

        $domain = str_replace('-', '_', $segment);
        $existing = self::firstMatch($repo->list(['domain' => $domain]));
        if ($existing) {
            Logger::info(self::LOG_CHANNEL, 'Resolved legacy department slug by domain', [
                'slug' => $rawValue, 'domain' => $domain, 'departmentId' => $existing['id'],
            ]);
            return $existing['id'];
        }

        Logger::error(self::LOG_CHANNEL, 'Legacy department slug did not resolve to any real department', [
            'slug' => $rawValue, 'domain' => $domain,
        ]);
        return $rawValue;
    }

    private static function firstMatch(array $rows): ?array
    {
        return $rows[0] ?? null;
    }
}
