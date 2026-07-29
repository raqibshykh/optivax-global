// Pure department-name resolution — the single place "given a departmentId (or a legacy
// dept-<domain> slug), what's the human-readable name to show" is decided. Every UI surface
// must go through this (directly, or via DepartmentContext's getDepartmentName) instead of
// rendering a raw departmentId/slug — that was the bug: the ID is the correct thing to store
// and send over the API, it was never the correct thing to *display*.

import type { Department } from "../../services/departmentService";

export const UNKNOWN_DEPARTMENT = "Unknown Department";

/**
 * Resolves a stored department reference to its display name.
 * - `null`/`undefined`/`""` -> "Unknown Department" (never render blank/undefined either).
 * - A real `departments.id` match -> that department's `name`.
 * - A legacy pre-Department-Master slug (`"dept-sales"`, from before the real Department
 *   Master table existed — see ProfileController.php/DepartmentMapper.php) -> matched by
 *   domain (`dept-${d.domain}`) instead, so old data still resolves to a real name rather
 *   than falling through to "Unknown Department".
 * - No match at all -> "Unknown Department", never the raw id/slug string.
 */
export function resolveDepartmentName(
  departmentIdOrSlug: string | null | undefined,
  departments: Department[],
): string {
  if (!departmentIdOrSlug) return UNKNOWN_DEPARTMENT;

  const byId = departments.find((d) => d.id === departmentIdOrSlug);
  if (byId) return byId.name;

  if (departmentIdOrSlug.startsWith("dept-")) {
    const segment = departmentIdOrSlug.slice("dept-".length);

    // "dept-management" has no matching RBAC domain — "management" was never added to the
    // PermissionDomain set (it's a cross-cutting role, not department-scoped the way
    // sales/production/... are), so it can't be resolved by domain like every other slug
    // below. Resolved by NAME instead, mirroring the backend's DepartmentAutoAssignService
    // (the actual fix for "management users never link to the Management department").
    if (segment === "management") {
      const byName = departments.find((d) => d.name.toLowerCase() === "management");
      if (byName) return byName.name;
      return UNKNOWN_DEPARTMENT;
    }

    // "dept-it-support" -> "it_support" — the slug's domain segment is hyphenated, but
    // Department.domain (PermissionDomain) uses underscores; mirrors DepartmentMapper::
    // domainForRole()/ShiftResolver's same conversion on the backend.
    const domain = segment.replace(/-/g, "_");
    const byDomain = departments.find((d) => d.domain === domain);
    if (byDomain) return byDomain.name;
  }

  return UNKNOWN_DEPARTMENT;
}
