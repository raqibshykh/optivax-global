<?php

namespace OptivaxERP\Connectors\ZKTeco;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @deprecated Bridge-Ready architecture: only used by the legacy, opt-in-only
 * DeviceSyncService/ZKTecoConnector direct-TCP path — see those classes'
 * doc comments. Not part of the production Bridge-push flow.
 *
 * Pure wire-format helpers for the ZKTeco/ZKSoftware "standalone" TCP
 * protocol used by CMD_* commands on port 4370 — no socket I/O here, only
 * byte packing/unpacking, so it can be unit-tested without a real device.
 * This is the same reverse-engineered protocol implemented by the
 * widely-deployed pyzk (Python) and zkteco-js/node-zklib libraries; command
 * codes and the packet/checksum layout below are ported from that shared,
 * publicly documented protocol rather than any single vendor SDK.
 *
 * IMPORTANT — the two areas of this protocol with the most firmware-to-
 * firmware variance (and therefore the most likely to need adjustment
 * against a real K40) are: the attendance-log record struct size in
 * AttendanceParser (some firmwares use 8/16/40-byte records) and whether a
 * comm-key password handshake is required in ZKTecoConnector::connect().
 * Both are implemented defensively (auto-detect / graceful failure) — see
 * their own doc comments.
 */
final class ZKProtocol
{
    // ── Connection / session ────────────────────────────────────────────
    public const CMD_CONNECT = 1000;
    public const CMD_EXIT = 1001;
    public const CMD_ENABLEDEVICE = 1002;
    public const CMD_DISABLEDEVICE = 1003;
    public const CMD_RESTART = 1004;
    public const CMD_POWEROFF = 1005;
    public const CMD_AUTH = 1102;

    // ── Data read/write ──────────────────────────────────────────────────
    public const CMD_USER_WRQ = 8;
    public const CMD_USERTEMP_RRQ = 9;
    public const CMD_OPTIONS_RRQ = 11;
    public const CMD_OPTIONS_WRQ = 12;
    public const CMD_ATTLOG_RRQ = 13;
    public const CMD_CLEAR_ATTLOG = 15;
    public const CMD_DELETE_USER = 18;

    // ── Multi-packet data transfer ──────────────────────────────────────
    public const CMD_PREPARE_DATA = 1500;
    public const CMD_DATA = 1501;
    public const CMD_FREE_DATA = 1502;

    // ── Device state / time ─────────────────────────────────────────────
    public const CMD_STATE_RRQ = 64;
    public const CMD_GET_TIME = 201;
    public const CMD_SET_TIME = 202;

    // ── Acknowledgements ─────────────────────────────────────────────────
    public const CMD_ACK_OK = 2000;
    public const CMD_ACK_ERROR = 2001;
    public const CMD_ACK_DATA = 2002;
    public const CMD_ACK_RETRY = 2003;
    public const CMD_ACK_REPEAT = 2004;
    public const CMD_ACK_UNAUTH = 2005;

    /** 4 magic bytes prefixing every TCP-framed packet, followed by a 4-byte LE payload length (8-byte prefix total). */
    private const TCP_MAGIC = "\x50\x50\x82\x7d";

    /**
     * Builds one protocol packet: 8-byte header (command, checksum, session,
     * reply — all unsigned 16-bit little-endian) + $data. The checksum is
     * computed over the full header+data with the checksum field zeroed,
     * then baked into the returned bytes — i.e. this is a pure, self-
     * consistent function of its own output (no dependency on how the
     * caller manages reply-id sequencing), which sidesteps the ordering
     * ambiguity some reference implementations have around when reply_id
     * gets incremented relative to the checksum calculation.
     */
    public static function buildPacket(int $command, int $sessionId, int $replyId, string $data = ''): string
    {
        $zeroChecksum = pack('v4', $command, 0, $sessionId, $replyId) . $data;
        $checksum = self::checksum($zeroChecksum);
        return pack('v4', $command, $checksum, $sessionId, $replyId) . $data;
    }

    /** Wraps a packet (from buildPacket()) in the TCP transport framing: 4 magic bytes + 4-byte LE length + packet. */
    public static function wrapTcp(string $packet): string
    {
        return self::TCP_MAGIC . pack('V', strlen($packet)) . $packet;
    }

    /** @return int|null the payload length declared by the TCP prefix, or null if $bytes isn't a valid 8-byte TCP prefix. */
    public static function readTcpPrefix(string $bytes): ?int
    {
        if (strlen($bytes) < 8 || substr($bytes, 0, 4) !== self::TCP_MAGIC) {
            return null;
        }
        $unpacked = unpack('Vlen', substr($bytes, 4, 4));
        return $unpacked['len'] ?? null;
    }

    public const TCP_PREFIX_LEN = 8;

    /** @return array{command:int, checksum:int, sessionId:int, replyId:int, data:string} */
    public static function parsePacket(string $payload): array
    {
        $head = unpack('vcommand/vchecksum/vsessionId/vreplyId', substr($payload, 0, 8));
        return [
            'command' => $head['command'],
            'checksum' => $head['checksum'],
            'sessionId' => $head['sessionId'],
            'replyId' => $head['replyId'],
            'data' => substr($payload, 8),
        ];
    }

    /**
     * Ported verbatim (byte-for-byte behavior, not just "a" checksum) from
     * the reverse-engineered algorithm every working ZK client library
     * uses — a 16-bit one's-complement-style sum with a `USHRT_MAX` (65535,
     * not 65536) wraparound quirk. This is NOT a textbook Internet checksum;
     * do not "fix" the arithmetic to look more standard, the device expects
     * exactly this.
     */
    public static function checksum(string $bytes): int
    {
        $arr = array_values(unpack('C*', $bytes));
        $len = count($arr);
        $checksum = 0;
        $i = 0;
        while ($len > 1) {
            $checksum += $arr[$i] | ($arr[$i + 1] << 8);
            if ($checksum > 0xFFFF) {
                $checksum -= 0xFFFF;
            }
            $i += 2;
            $len -= 2;
        }
        if ($len) {
            $checksum += $arr[$i];
        }
        while ($checksum > 0xFFFF) {
            $checksum -= 0xFFFF;
        }
        $checksum = ~$checksum;
        while ($checksum < 0) {
            $checksum += 0xFFFF;
        }
        return $checksum & 0xFFFF;
    }

    /**
     * Comm-key handshake used only if CMD_CONNECT comes back CMD_ACK_UNAUTH
     * (device has a non-zero "Comm Key" / communication password set in its
     * menu — distinct from the admin PIN). Most K40 deployments leave this
     * at 0 (disabled), in which case ZKTecoConnector::connect() never calls
     * this. Ported from the same reverse-engineered bit-mixing algorithm
     * used by every ZK client library that supports password-protected
     * devices — if a real device rejects this, the fix is almost always to
     * clear the Comm Key in the device's own menu rather than the code.
     */
    public static function commKey(int $password, int $sessionId, int $ticks = 50): string
    {
        $k = 0;
        for ($i = 0; $i < 32; $i++) {
            $k = ($password & (1 << $i)) ? (($k << 1) | 1) : ($k << 1);
        }
        $k = ($k + $sessionId) & 0xFFFFFFFF;
        $bytes = array_values(unpack('C4', pack('V', $k)));
        $bytes = [$bytes[0] ^ ord('Z'), $bytes[1] ^ ord('K'), $bytes[2] ^ ord('S'), $bytes[3] ^ ord('O')];
        $halves = array_values(unpack('v2', pack('C4', ...$bytes)));
        $swapped = pack('v2', $halves[1], $halves[0]);
        $b = $ticks & 0xFF;
        $final = array_map(static fn (int $byte): int => $byte ^ $b, array_values(unpack('C4', $swapped)));
        return pack('C4', ...$final);
    }

    /**
     * ZKTeco's proprietary bit-packed timestamp (NOT unix epoch) used inside
     * attendance records and CMD_GET_TIME/CMD_SET_TIME payloads. Decodes to
     * a naive (no timezone attached) DateTimeImmutable representing exactly
     * what the device's own real-time clock reads — see AttendanceParser's
     * doc comment for why that naive value must be paired with the site's
     * configured timezone, not treated as UTC, before being handed to
     * ingestBatch().
     */
    public static function decodeTime(int $encoded): \DateTimeImmutable
    {
        $t = $encoded;
        $second = $t % 60;
        $t = intdiv($t, 60);
        $minute = $t % 60;
        $t = intdiv($t, 60);
        $hour = $t % 24;
        $t = intdiv($t, 24);
        $day = ($t % 31) + 1;
        $t = intdiv($t, 31);
        $month = ($t % 12) + 1;
        $t = intdiv($t, 12);
        $year = $t + 2000;

        return (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))
            ->setDate($year, $month, $day)
            ->setTime($hour, $minute, $second);
    }

    /** Inverse of decodeTime() — used by ZKTecoConnector::setDeviceTime(). */
    public static function encodeTime(\DateTimeImmutable $dt): int
    {
        $year = ((int) $dt->format('Y')) - 2000;
        $month = (int) $dt->format('n');
        $day = (int) $dt->format('j');
        $hour = (int) $dt->format('G');
        $minute = (int) $dt->format('i');
        $second = (int) $dt->format('s');

        return (($year * 12 * 31) + (($month - 1) * 31) + ($day - 1)) * 86400
            + ($hour * 3600) + ($minute * 60) + $second;
    }
}
