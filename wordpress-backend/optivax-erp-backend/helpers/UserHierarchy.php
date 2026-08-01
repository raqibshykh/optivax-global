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
            // Member-tier (individual contributor) roles across every
            // department, plus the existing client-onboarding grant — this
            // is what "Management can create new employees" (RBAC spec)
            // actually requires. Deliberately NOT any *_admin role,
            // super_admin, or management itself: creating admin-tier/peer
            // accounts is an org-structure decision, which stays
            // super_admin-only (matches the spec's "no user role/permission
            // management" restriction for this role).
            'management'       => ['client', 'sales_member', 'production_member', 'marketing_member', 'hr_member', 'it_member'],
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
