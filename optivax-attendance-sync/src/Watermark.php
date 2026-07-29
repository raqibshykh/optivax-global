<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * Picks the safest available progress marker for CHECKINOUT and never
 * silently guesses. Preferred: a real unique incrementing row id (CHECKID /
 * ID / RecordID) — insertion order, so even a backdated/offline punch that
 * lands in the table late still gets a new, larger id and is never missed.
 * Only those three exact names are trusted; a column that merely LOOKS like
 * an id (e.g. VERIFYCODE, SN) is not, because treating a non-monotonic
 * column as a watermark could silently drop rows, which is the one thing
 * this class must never do.
 *
 * Fallback (no such column exists): a composite CHECKTIME+USERID watermark.
 * Rows strictly after the last-seen CHECKTIME are always new. Rows AT
 * exactly the last-seen CHECKTIME are only skipped if their USERID was
 * already recorded as seen at that exact timestamp — so two+ punches
 * sharing one timestamp (same second, different people) can never be
 * skipped. This mode also re-queries a configurable overlap window before
 * the watermark as extra insurance against write-visibility lag; any
 * resulting re-send is absorbed by the ERP's own duplicate protection.
 */
final class Watermark
{
    private const ID_CANDIDATES = ['CHECKID', 'ID', 'RECORDID'];

    private string $mode;
    private ?string $idColumn;

    public function __construct(MdbReader $mdb, Logger $logger)
    {
        $this->idColumn = $this->detectIdColumn($mdb, $logger);
        $this->mode = $this->idColumn !== null ? 'id' : 'composite';
        $logger->info('Watermark strategy selected', ['mode' => $this->mode, 'idColumn' => $this->idColumn]);
    }

    public function mode(): string
    {
        return $this->mode;
    }

    private function detectIdColumn(MdbReader $mdb, Logger $logger): ?string
    {
        try {
            $columns = $mdb->columns('CHECKINOUT');
        } catch (\Throwable $e) {
            $logger->warn('Could not introspect CHECKINOUT columns, falling back to composite watermark', ['error' => $e->getMessage()]);
            return null;
        }

        foreach (self::ID_CANDIDATES as $candidate) {
            foreach ($columns as $col) {
                if (strcasecmp($col, $candidate) === 0) {
                    return $col;
                }
            }
        }
        return null;
    }

    /** @return array{0:string, 1:array} [sql, params] */
    public function buildQuery(array $state, int $overlapMinutes): array
    {
        if ($this->mode === 'id') {
            $lastId = (int) ($state['lastId'] ?? 0);
            return [
                "SELECT {$this->idColumn} AS ROWKEY, USERID, CHECKTIME, CHECKTYPE FROM CHECKINOUT WHERE {$this->idColumn} > ? ORDER BY {$this->idColumn} ASC",
                [$lastId],
            ];
        }

        $lastCheckTime = $state['lastCheckTime'] ?? null;
        if ($lastCheckTime === null) {
            $since = '1970-01-01 00:00:00';
        } else {
            $since = (new \DateTimeImmutable((string) $lastCheckTime))
                ->sub(new \DateInterval('PT' . max(0, $overlapMinutes) . 'M'))
                ->format('Y-m-d H:i:s');
        }
        return [
            'SELECT NULL AS ROWKEY, USERID, CHECKTIME, CHECKTYPE FROM CHECKINOUT WHERE CHECKTIME >= ? ORDER BY CHECKTIME ASC, USERID ASC',
            [$since],
        ];
    }

    /**
     * Composite mode only: drops rows already accounted for at the exact
     * watermark boundary. No-op in id mode (id > lastId already guarantees
     * no repeats).
     */
    public function filterRows(array $rows, array $state): array
    {
        if ($this->mode === 'id') {
            return $rows;
        }

        $lastCheckTime = $state['lastCheckTime'] ?? null;
        if ($lastCheckTime === null) {
            return $rows;
        }
        $seenKeys = $state['seenKeysAtLastCheckTime'] ?? [];

        return array_values(array_filter($rows, static function (array $row) use ($lastCheckTime, $seenKeys): bool {
            $rowTime = (string) $row['CHECKTIME'];
            if ($rowTime > $lastCheckTime) {
                return true;
            }
            if ($rowTime < $lastCheckTime) {
                return false; // strictly older than the watermark: already handled by a prior run
            }
            return !in_array((string) $row['USERID'], $seenKeys, true);
        }));
    }

    /**
     * Computes the next watermark after $processedBatch (a slice of
     * PunchMapper::resolvePunchTypes() output, in original fetch order) has
     * been successfully uploaded. Only ever called after a batch succeeds —
     * see sync.php — so the watermark never advances past a failed batch.
     */
    public function advance(array $state, array $processedBatch): array
    {
        if (empty($processedBatch)) {
            return $state;
        }

        if ($this->mode === 'id') {
            $maxId = max(array_column($processedBatch, 'rowKey'));
            return ['lastId' => max((int) ($state['lastId'] ?? 0), (int) $maxId)];
        }

        $maxTime = max(array_column($processedBatch, 'checkTime'));
        $usersAtMax = array_column(
            array_filter($processedBatch, static fn (array $r): bool => $r['checkTime'] === $maxTime),
            'biometricUserId'
        );
        if (($state['lastCheckTime'] ?? null) === $maxTime) {
            $usersAtMax = array_merge($state['seenKeysAtLastCheckTime'] ?? [], $usersAtMax);
        }
        return ['lastCheckTime' => $maxTime, 'seenKeysAtLastCheckTime' => array_values(array_unique($usersAtMax))];
    }
}
