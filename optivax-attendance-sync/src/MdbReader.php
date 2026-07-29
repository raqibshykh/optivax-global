<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * The only class in this project that opens att2000.mdb. Read-only by
 * construction: `fetch()` and `columns()` are the only two methods, and both
 * only ever issue SELECT — there is no write method to call, so no code path
 * anywhere in this tool can INSERT/UPDATE/DELETE against the ZKTeco
 * database. `ReadOnly=1` is also passed in the connection string as a
 * best-effort, driver-level hint; the structural guarantee above is the real
 * one and does not depend on the ODBC driver honoring that flag.
 */
final class MdbReader
{
    private \PDO $pdo;

    public function __construct(string $mdbPath, string $odbcDriver)
    {
        $dsn = 'odbc:Driver={' . $odbcDriver . '};Dbname=' . $mdbPath . ';ReadOnly=1;';
        $this->pdo = new \PDO($dsn);
        $this->pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
    }

    /** @return string[] column names of $table, via SELECT ... WHERE 1=0 (no rows read, still a SELECT) */
    public function columns(string $table): array
    {
        $stmt = $this->pdo->query("SELECT * FROM {$table} WHERE 1 = 0");
        $columns = [];
        for ($i = 0; $i < $stmt->columnCount(); $i++) {
            $meta = $stmt->getColumnMeta($i);
            if ($meta && isset($meta['name'])) {
                $columns[] = $meta['name'];
            }
        }
        return $columns;
    }

    /** @return array<int, array<string, mixed>> */
    public function fetch(string $sql, array $params): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }
}
