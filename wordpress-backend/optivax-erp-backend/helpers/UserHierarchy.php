<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Answers "who may create/assign a login account with role X" — orthogonal
 * to RbacMatrix (business-data permissions). Kept separate deliberately:
 * this plugin has no PermissionDomain for "user management", and folding
 * hierarchy rules into the business-domain matrix would blur two distinct
 * concerns. Do not repurpose RbacMatrix for this.
 */
final class UserHierarchy
{
    /** creatorRole => the exact set of roles that creator may create/assign. */
    private static function creatableRoles(): array
    {
        return [
            'super_admin'      => RbacMatrix::ROLES,
            // Each department admin may create only their own department's
            // Employee (*_member) role. sales_admin and management are
            // additionally allowed to create `client` accounts, preserving
            // the existing client-onboarding workflow (Admin/Clients.tsx).
            'sales_admin'      => ['sales_member', 'client'],
            'production_admin' => ['production_member'],
            'marketing_admin'  => ['marketing_member'],
            'hr_admin'         => ['hr_member'],
            'it_admin'         => ['it_member'],
            'management'       => ['client'],
        ];
    }

    public static function canCreate(?string $creatorRole, string $targetRole): bool
    {
        if (!$creatorRole || !RbacMatrix::isValidRole($targetRole)) {
            return false;
        }
        return in_array($targetRole, self::creatableRoles()[$creatorRole] ?? [], true);
    }
}
