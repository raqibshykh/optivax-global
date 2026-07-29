# Optivax Attendance Sync (PHP)

Standalone PHP CLI tool that reads new punches from the ZKTeco Attendance
Management 2011 database (`att2000.mdb`) and pushes them into the existing
ERP through its existing, unmodified biometric ingestion endpoint:

```
POST {erp_base_url}/it/devices/{device_id}/punches/import
```

This tool only replaces the *source* of punches. Every other part of the
pipeline — auth (`X-Device-Key`), request/response shape, `Idempotency-Key`
handling, duplicate protection, employee mapping, attendance aggregation,
late/shift rules, and payroll — is the ERP's existing, unchanged code.

## Folder structure

```
optivax-attendance-sync/
  sync.php              entry point — run this
  config.php            real, per-machine config (secret, gitignored)
  config.sample.php     checked-in template — copy to config.php
  src/                  implementation classes (see below)
  logs/sync.log         append-only run log
  state/state.json      watermark (progress) + state.json.bak + sync.lock
  README.md             this file
```

## Setup

1. Copy `config.sample.php` to `config.php` and fill in:
   - `erp_base_url`, `device_id`, `api_key` (from IT Support → Devices →
     "Generate API Key" for this K70's device row)
   - `mdb_path` (full path to `att2000.mdb` on this machine)
   - `odbc_driver` (only change this if your Access ODBC driver is
     registered under a different name — check via `odbc_drivers()` or
     ODBC Data Source Administrator)
   - `timezone` (must match the ERP's site timezone)
2. Ensure PHP CLI on this machine has `pdo_odbc` enabled and the Microsoft
   Access Database Engine ODBC driver installed (same bitness as this PHP —
   32-bit PHP needs the 32-bit driver, even on 64-bit Windows).
3. Run once manually to confirm: `php.exe sync.php`
4. Schedule it in Windows Task Scheduler (e.g. every 5 minutes).

## What each part of `src/` does

- **`Watermark.php`** — decides how progress is tracked. If `CHECKINOUT` has
  a real unique incrementing id column (`CHECKID`, `ID`, or `RecordID`),
  that's used — insertion order, so even a backdated/offline punch that
  lands late still gets picked up. Otherwise falls back to a composite
  `CHECKTIME + USERID` watermark, which guarantees punches sharing an exact
  timestamp are never skipped.
- **`MdbReader.php`** — the only class that opens `att2000.mdb`. Read-only
  by construction: it has no write method at all, only `fetch()` (SELECT)
  and `columns()` (SELECT ... WHERE 1=0, for schema introspection).
- **`PunchMapper.php`** — converts raw rows into the
  `{biometricUserId, timestamp, punchType}` shape the ERP already expects,
  using the same ambiguous-CHECKTYPE chronological-order fallback
  convention the ERP's own `AttendanceParser.php` uses.
- **`ErpClient.php`** — sends batches to the existing endpoint. Retries
  transient failures (network errors, 429, 5xx) with exponential backoff;
  does not retry permanent failures (401/403/404/422 — retrying an invalid
  request just delays noticing the real problem).
- **`StateStore.php`** — atomic state writes (temp file + rename), with a
  `.bak` copy made before every overwrite and automatic fallback to that
  backup (or a clean start) if `state.json` is ever unreadable/corrupted.
- **`LockFile.php`** — `flock()`-based single-instance guard so two
  scheduled runs can never overlap. Released in a `finally` block in
  `sync.php`, so it's freed even if the run throws.
- **`StartupValidator.php`** — checks the MDB file, log/state directories,
  state file readability, `pdo_odbc`/Access driver availability, and ERP
  reachability, all before touching the database or making an upload
  request.

## Safety notes

- **Never advances past a failed batch.** `sync.php` only calls
  `Watermark::advance()` + persists state *after* a batch's HTTP call
  succeeds. A failed batch stops the run entirely; the next scheduled run
  re-fetches from the last successful point.
- **Duplicate-safe by design, not by accident.** Because the ERP already
  guarantees duplicate protection (exact-match unique key, near-duplicate
  window, and idempotency-key replay), this tool is free to err on the side
  of re-sending a punch (e.g. the composite watermark's overlap window)
  without any risk of double-counting.
- **Read-only against the MDB.** No `INSERT`/`UPDATE`/`DELETE` statement
  exists anywhere in this codebase — `MdbReader` only exposes SELECT-based
  methods.
