# Phase 3 — Complete Database Audit Report

**Scope:** all 67 tables across the 14 migration files in `wordpress-backend/optivax-erp-backend/database/migrations/`, plus every repository that queries them. No UI changes, no API renames. **No existing data was deleted or destructively modified** — every schema change is additive (new nullable columns, new indexes, new constraints defended against failure); every migration file was read directly (not sampled).

**Method:** read `Migrator.php` and all 14 migration files to build a complete table/column/index inventory; grepped and read every repository for query patterns (N+1, missing `$wpdb->prepare()`, duplicate logic); cross-referenced index coverage against how each table is actually queried by its controller/repository.

---

## Critical infrastructure gap found and fixed first

Everything else in this report depends on this: **`Migrator::runOnActivation()` only ever ran on the WordPress `register_activation_hook` — never on a normal code-deploy update.** A site updated by `git pull`/zip-overwrite (not deactivate-then-reactivate) would never receive any schema change shipped after its initial install, including every fix below. Added `Migrator::maybeUpgrade()`, called directly from the plugin bootstrap on every load, which compares the stored `db_version` option against the current version constant and re-runs the (fully idempotent) schema pass only on a mismatch. `OPTIVAX_ERP_DB_VERSION` bumped `1.0.0` → `1.1.0` so this phase's changes actually reach an already-installed site. `dbDelta()` — used for every column/index/table change in this phase — only ever adds what's missing; it never drops a column, table, or row, so this path is safe to re-run.

---

## Findings & fixes

### 1. Duplicate `activity_sessions`/`break_records` table definitions (schema drift risk)
- **Root cause:** `HrAttendanceMigration.php` and `ActivityMigration.php` each defined a `CREATE TABLE activity_sessions` with different columns (the older one lacking the `UNIQUE KEY user_date` the repository actually relies on to reject duplicate check-ins), plus a `break_records` table nothing in the plugin queries (confirmed: `grep -r "break_records"` across the whole plugin returns nothing outside the migration files themselves).
- **Fix:** removed the stale `activity_sessions`/`break_records` definitions from `HrAttendanceMigration.php`, keeping only `ActivityMigration.php`'s versions (which `ActivityRepository` actually reads/writes). Left in place (not dropped): on a site that already ran the old migration, the extra `session_minutes`/`total_break_minutes`/`active_minutes` columns and the `break_records` table itself remain as harmless unused leftovers — `dbDelta` never drops columns, and this report's "do not lose existing data" mandate means no destructive `DROP` was issued to clean them up either.
- **Files modified:** `database/migrations/HrAttendanceMigration.php`.

### 2. N+1 queries — `InvoiceRepository::list()` and `ConversationRepository::list()`
- **Root cause:** both repositories' `toDto()` queried a child table (`invoice_items` / `conversation_messages`) **per row**. Listing N invoices or N conversations ran 1 + N queries every single call — with no pagination on either endpoint (per Phase 2's audit), this scaled linearly with total table size on every page load.
- **Fix:** both `list()` methods now batch-fetch every row's children in **one** query each (`WHERE invoice_id IN (...)` / `WHERE conversation_id IN (...)`), grouped in PHP and handed to `toDto()` as a parameter instead of `toDto()` querying internally. `find()` (single-row reads) is unaffected — a single row's children in one extra query was never the problem.
- **Files modified:** `repositories/InvoiceRepository.php`, `repositories/ConversationRepository.php`.
- **How to test:** seed 20 invoices with 3 line items each, call `GET /invoices/list`, and confirm (via a query logger or `SAVEQUERIES`) exactly 2 queries run for the invoice+items portion, not 21. Same test for `GET /conversations/list` with 20 conversations.
- Spot-checked every other repository for the same pattern (`toDto()` calling a per-row query) — no other instance found; the rest either don't have child tables or already batch correctly (e.g. `AbstractRepository::list()` itself never had this problem, being single-table).

### 3. Missing indexes on columns that are actually queried
| Table.column | Queried by | Fix |
|---|---|---|
| `tasks.assignee_id` | `?assigneeId=` filter (`TaskRoutes.php`) | Added `KEY assignee_id` |
| `budget_audit.department` | Phase 1's department-scoping fix to `BudgetController::listAudit()` | Added `KEY department` |
| `commissions.invoice_id`, `commissions.project_id` | `?invoiceId=`/`?projectId=` filters (`CommissionController.php`) | Added both keys |
| `notifications.(user_id, created_at)` | Every notification list/SSE-poll query filters by `user_id` and sorts/filters by `created_at` | Added composite `KEY user_id_created_at` alongside the existing single-column key |
| `audit_logs.department` | Phase 3's new department-scoping fix to `AuditLogController` (finding 6 below) | Added `KEY department` |
| `clients.deleted_at`, `projects.deleted_at`, `tasks.deleted_at`, `invoices.deleted_at` | Every list/find query now filters `deleted_at IS NULL` (finding 5) | Added `KEY deleted_at` on all four |
- **Files modified:** `database/migrations/ProjectTaskMigration.php`, `BudgetMigration.php`, `BillingMigration.php`, `CrossCuttingMigration.php`, `ClientMigration.php`.

### 4. No foreign-key constraints anywhere (real referential integrity, cascade deletes)
- **Root cause:** all 67 tables use plain `KEY` indexes for relationships — zero `FOREIGN KEY`/`REFERENCES` clauses anywhere. WordPress's `dbDelta()` does not reliably parse `FOREIGN KEY` clauses inside a `CREATE TABLE` statement (a documented core limitation), which is almost certainly why none exist — they can't be added the same way every other column/index in this schema was.
- **Fix:** new `database/migrations/ForeignKeyMigration.php`, applying real InnoDB constraints via plain `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` (run once after the `dbDelta` pass, both on activation and on `maybeUpgrade()`). Ten genuine parent-child relationships now have real constraints:

  | Child.column | → Parent.column | On delete |
  |---|---|---|
  | `invoice_items.invoice_id` | `invoices.id` | CASCADE |
  | `payments.invoice_id` | `invoices.id` | CASCADE |
  | `client_ownership.client_id` | `clients.id` | CASCADE |
  | `production_assignments.client_id` | `clients.id` | CASCADE |
  | `tasks.project_id` | `projects.id` | SET NULL |
  | `it_device_logs.device_id` | `it_devices.id` | CASCADE |
  | `social_click_events.link_id` | `social_links.id` | CASCADE |
  | `social_account_metrics.link_id` | `social_links.id` | CASCADE |
  | `conversation_messages.conversation_id` | `conversations.id` | CASCADE |
  | `activity_breaks.session_id` | `activity_sessions.id` | CASCADE |

- **Deliberately excluded:** audit/history/log tables (`client_ownership_history`, `audit_logs`, `security_audit_logs`, `budget_audit`, `advance_salary_audit`, `attendance_audit`) — these must outlive the record they describe even after it's deleted, so constraining them would be actively wrong. Also excluded: anything referencing `wp_users`/`users_mapping` directly — that's core WordPress's table, and user deletion goes through `wp_delete_user()`'s own path, not this plugin's.
- **Data-loss safety:** each constraint is applied defensively. `ForeignKeyMigration::apply()` checks `information_schema` first (skip if already applied — idempotent), and if adding a constraint fails at the database level (the realistic failure mode: a pre-existing orphaned row with no matching parent, on a site with older data), it's **logged and skipped**, never resolved by deleting or modifying rows. A future version bump re-attempts anything that was skipped, e.g. once an admin cleans up orphaned rows.
- **Files created:** `database/migrations/ForeignKeyMigration.php`. **Files modified:** `database/Migrator.php` (wires it in after the `dbDelta` pass on both activation and upgrade).
- **Not yet verified live:** whether any of these ten constraints actually fails to apply on the real, currently-deployed database depends on data this environment has no access to. Check the `migrator` log channel after deploying — any `"Skipped foreign key ... — likely orphaned data"` entry names the exact table/column/error to clean up.

### 5. No soft delete anywhere
- **Root cause:** zero `deleted_at`/`deleted_by` columns existed on any of the 67 tables; every `delete()` call was a real, unrecoverable `DELETE FROM`.
- **Fix:** added `deleted_at DATETIME NULL` + `deleted_by VARCHAR(36) NULL` to the four highest-value, most "undo-worthy" business tables — **clients, projects, tasks, invoices** — plus a shared, opt-in mechanism in `AbstractRepository`: a `protected bool $softDeletes` flag (`false` by default, so every other repository is completely unaffected) that, when `true`, makes `list()`/`count()` exclude soft-deleted rows, `find()` return null for one, and `delete()` stamp `deleted_at`/`deleted_by` (from the authenticated caller) instead of issuing a real `DELETE`. `ClientRepository`/`ProjectRepository` override `list()`/`count()` for an unrelated `JSON_CONTAINS` reason, so their own copies of the filtering logic were updated to match; `InvoiceRepository` is fully bespoke (not `AbstractRepository`-based) and was updated by hand the same way — including leaving `invoice_items` untouched on a soft-deleted invoice, since the invoice is hidden, not gone.
- **Why only these four, not all 67 tables:** universal soft-delete would mean auditing and changing every one of the ~20 other CRUD resources' delete semantics, several of which are joins/logs/widgets where "undo a delete" has no product meaning (e.g. `production_assignments`, `sales_widget_deals`). Scoped to the tables where an accidental delete would be genuinely costly to a business user.
- **Files modified:** `repositories/AbstractRepository.php`, `repositories/ClientRepository.php`, `repositories/ProjectRepository.php`, `repositories/TaskRepository.php`, `repositories/InvoiceRepository.php`, plus the four tables' migrations (finding 3's table).
- **How to test:** `DELETE` a client via the API, confirm it disappears from `/clients/list` and `GET /clients/list?id=<id>` returns 404 — then check the database directly and confirm the row still exists with `deleted_at`/`deleted_by` populated, not actually gone.

### 6. Department isolation gap — `audit_logs` had a `department` column nobody used
- **Root cause:** `audit_logs.department` exists (purpose-built for exactly this) but `AuditLogController::list()`/`search()` never read or filtered by it — any role holding `reports:VIEW` (a broad grant) saw the entire company's action log regardless of department, the same class of gap Phase 1 fixed for the Budget module.
- **Fix:** `AuditLogController` now applies the same `DepartmentScopeMiddleware::hasAllDepartmentAccess()` check Phase 1 established for Budget — company-wide roles (super_admin/management/hr_admin/hr_member) see everything; every other role is scoped to their own department, resolved server-side, never trusted from the request. `AuditLogRepository::list()`/`search()` gained `department` filter support to make this possible.
- **Files modified:** `controllers/AuditLogController.php`, `repositories/AuditLogRepository.php`.
- **Organization isolation — re-confirmed N/A, not a gap:** re-verified Phase 1's finding that this is a genuinely single-tenant deployment (no `organization_id` anywhere in the JWT claims, `CompanySettingsRepository` is a hardcoded singleton row). The `organizations`/`subscriptions` tables exist but nothing threads an org boundary through the rest of the schema. Adding real multi-tenancy would be a ground-up architecture change, not a database-audit fix — left untouched, documented again here so it isn't mistaken for an oversight.

### 7. `created_by`/`updated_by` gaps on core business tables
- **Root cause:** `projects` and `invoices` had no `created_by` column at all; `clients`, `projects`, `tasks`, and `invoices` all had `updated_at` but no `updated_by` — every edit was timestamped but not attributed.
- **Fix:** added `created_by VARCHAR(36) NULL` to `projects`/`invoices`, and `updated_by VARCHAR(36) NULL` to all four soft-deleted tables. Unlike `created_by` elsewhere in this codebase (an established pattern of trusting a client-supplied value), `updated_by` is **always server-stamped from the authenticated caller** inside each repository's `fromDtoForUpdate()` — never trusted from the request body, so it can't be spoofed. Existing rows correctly stay `NULL` for both (there's no way to know who created/last-edited historical data before this column existed) — only new writes going forward populate them.
- **Files modified:** same repository files as finding 5, plus `database/migrations/ProjectTaskMigration.php`, `ClientMigration.php`, `BillingMigration.php`.

### 8. `clients.email` has no UNIQUE constraint — flagged, not force-fixed
- **Found while verifying unique keys:** `clients` has only a plain (non-unique) `KEY email`. This matters beyond simple data hygiene: `ClientScopeMiddleware::resolveOwnClientId()` (Phase 1's client-ownership scoping fix) resolves a `client`-role user's own client record via `SELECT id FROM clients WHERE email = %s LIMIT 1` — if two client rows ever share an email, this silently picks one arbitrarily, which could resolve a client-role session to the *wrong* client's data.
- **Why not fixed here:** adding a `UNIQUE KEY` via `dbDelta()` to a table that may already contain duplicate emails (unknown — no access to live data) would either fail outright or behave inconsistently depending on MySQL version/mode, and resolving it by merging/deleting "duplicate" client rows is exactly the kind of destructive judgment call this phase's "do not lose existing data" mandate says not to make unilaterally.
- **Recommended path:** run `SELECT email, COUNT(*) FROM {prefix}clients GROUP BY email HAVING COUNT(*) > 1` against the live database; if it returns nothing, add `UNIQUE KEY email (email)` in a follow-up migration (trivial, safe once confirmed clean); if it returns rows, those need a product decision (merge? flag one as canonical?) before a constraint can be added.
- **Every other UNIQUE key already in the schema was checked and is correct**: `refresh_tokens.token_hash`, `client_ownership.client_id`, `social_links.tracking_id`, `company_holidays.holiday_date`, `attendance_records.(user_id, date)`, `activity_sessions.(user_id, date)`.

---

## Verified correct — no change needed

- **Transactions**: `helpers/Transaction.php` wraps multi-step writes in a real `START TRANSACTION`/`COMMIT`/`ROLLBACK`, and — read closely, this is a genuinely non-obvious correctness detail — correctly handles **reentrancy**: MySQL has no true nested transactions, so a naive implementation would have a composite operation like `BudgetController::resetCompany()` (which calls three repository methods that each independently wrap themselves in `Transaction::run()`) silently break atomicity, because a second `START TRANSACTION` implicitly commits the first. A depth counter makes nested calls a no-op passthrough so only the outermost call actually issues the SQL transaction statements. Used consistently everywhere a multi-step write needs atomicity (budget resets, invoice/payment roll-ups, bulk payroll saves, user account creation).
- **SQL injection**: re-swept every repository (not just the ones modified this phase) for raw query construction with interpolated variables outside `$wpdb->prepare()` — zero matches, consistent with Phase 1's exhaustive security-focused pass. Table/column names in dynamic SQL are always hardcoded constants, never user input.
- **Duplicate queries**: no case found (beyond the two N+1s already fixed) of the same data being fetched twice redundantly within one request.
- **Slow queries**: the missing-index and N+1 fixes above were the concrete, evidenced instances found; no other repository showed an unindexed WHERE/ORDER BY column against a table this codebase treats as high-volume.
- **Existing indexes/constraints**: the ~66 pre-existing `KEY`/`UNIQUE KEY` declarations across all 67 tables (client/project/task ids, statuses, foreign-key-shaped columns) were reviewed table-by-table while building this report's inventory — all correctly target the columns their repositories actually filter/sort by, aside from the gaps listed in finding 3.

## Summary of files created/modified (17 total)

**Created:** `database/migrations/ForeignKeyMigration.php`

**Modified:** `database/Migrator.php` · `database/migrations/HrAttendanceMigration.php` · `database/migrations/ProjectTaskMigration.php` · `database/migrations/ClientMigration.php` · `database/migrations/BillingMigration.php` · `database/migrations/BudgetMigration.php` · `database/migrations/CrossCuttingMigration.php` · `optivax-erp-backend.php` · `repositories/AbstractRepository.php` · `repositories/TaskRepository.php` · `repositories/ClientRepository.php` · `repositories/ProjectRepository.php` · `repositories/InvoiceRepository.php` · `repositories/ConversationRepository.php` · `repositories/AuditLogRepository.php` · `controllers/AuditLogController.php`

All 17 verified with `php -l` (no syntax errors). Every schema change is additive (`dbDelta`-applied new nullable columns/indexes, defensively-applied FK constraints) — nothing drops a table, column, or row anywhere in this phase.

## Not yet verified

No live WordPress + MySQL instance was available in this environment — only `php -l` syntax checking and manual SQL review. Before this reaches production:
1. Deploy to a staging copy of the real database first, not production directly — this is schema work, the highest-consequence category of change in this whole project.
2. Check the `migrator` log channel immediately after deploy for any skipped foreign key (finding 4) and investigate the named orphaned rows.
3. Run the `clients.email` duplicate check from finding 8 before ever adding that constraint.
4. Confirm `Migrator::maybeUpgrade()` actually fires and bumps `db_version` on a real code-deploy (not just plugin reactivation) — this is the mechanism every future migration will depend on.
