<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * Converts normalized CHECKINOUT rows into the {biometricUserId, timestamp,
 * punchType} shape the ERP's punches/import endpoint already expects —
 * unchanged from before this hardening pass.
 *
 * Direction ambiguity handling mirrors the same convention the ERP's own
 * (deprecated) AttendanceParser.php uses: per (user, calendar day), if every
 * punch maps to the same direction (or CHECKTYPE is unusable), the
 * checktype is treated as carrying no signal and direction is instead
 * inferred from chronological order within that day (1st = in, 2nd = out,
 * ...). Row order in the returned array always matches input order (the
 * watermark-defined fetch order) — this is required so batches can be
 * chunked and the watermark advanced per-batch without reordering rows.
 */
final class PunchMapper
{
    /** @param array<int, array{rowKey:mixed, userId:string, timestamp:\DateTimeImmutable, checkTime:string, rawType:?string}> $rawRows */
    public static function resolvePunchTypes(array $rawRows): array
    {
        $byUserAndDate = [];
        foreach ($rawRows as $idx => $row) {
            $day = $row['timestamp']->format('Y-m-d');
            $byUserAndDate[$row['userId']][$day][] = $idx;
        }

        $resolvedType = array_fill(0, count($rawRows), null);
        foreach ($byUserAndDate as $byDate) {
            foreach ($byDate as $indices) {
                usort($indices, static fn (int $a, int $b): int => $rawRows[$a]['timestamp'] <=> $rawRows[$b]['timestamp']);

                $mappedTypes = array_values(array_unique(array_map(
                    static fn (int $i): ?string => self::mapCheckType($rawRows[$i]['rawType']),
                    $indices
                )));
                $ambiguous = count($indices) > 1 && count($mappedTypes) <= 1;

                foreach ($indices as $pos => $i) {
                    $resolvedType[$i] = $ambiguous
                        ? ($pos % 2 === 0 ? 'in' : 'out')
                        : (self::mapCheckType($rawRows[$i]['rawType']) ?? ($pos % 2 === 0 ? 'in' : 'out'));
                }
            }
        }

        $punches = [];
        foreach ($rawRows as $idx => $row) {
            $punches[] = [
                'rowKey' => $row['rowKey'],
                'checkTime' => $row['checkTime'],
                'biometricUserId' => $row['userId'],
                'timestamp' => $row['timestamp']->format(DATE_ATOM),
                'punchType' => $resolvedType[$idx],
            ];
        }
        return $punches;
    }

    /** Standard att2000.mdb CHECKTYPE values; some deployments store them numerically instead. */
    private static function mapCheckType(?string $rawType): ?string
    {
        $normalized = strtoupper(trim((string) $rawType));
        return match ($normalized) {
            'I', '0' => 'in',
            'O', '1' => 'out',
            default => null,
        };
    }
}
