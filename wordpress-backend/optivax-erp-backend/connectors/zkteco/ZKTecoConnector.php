<?php

namespace OptivaxERP\Connectors\ZKTeco;

use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * @deprecated Bridge-Ready architecture: this is the low-level socket owner
 * behind DeviceSyncService, which is disabled by default (see its
 * isLanSyncEnabled() gate) precisely because this class's premise — a
 * direct TCP connection from the ERP to the device — does not hold on this
 * app's normal shared-hosting deployment. Kept only for the opt-in
 * on-premise/LAN case DeviceSyncService's doc comment describes; the
 * production path is the Bridge pushing to
 * POST /it/devices/{deviceId}/punches/import instead. Do not call this
 * class directly from new code.
 *
 * Low-level TCP client for one ZKTeco device (K40 and compatible
 * "standalone protocol" devices on port 4370). Owns exactly one socket for
 * its lifetime — connect() must be called before any other method,
 * disconnect() (or letting the object be destroyed) closes it. This class
 * only knows how to talk to a device that's already reachable on the
 * network; it has no idea whether that's via LAN, VPN, or a port-forward —
 * see DeviceSyncService's doc comment for that operational concern.
 *
 * Uses stream_socket_client()/fwrite()/fread() rather than the `sockets`
 * PECL extension, since the latter isn't always compiled into shared WP
 * hosting environments and streams need nothing beyond core PHP.
 */
final class ZKTecoConnector
{
    private const DEFAULT_CONNECT_TIMEOUT = 8;
    private const DEFAULT_READ_TIMEOUT = 15;

    /** @var resource|null */
    private $socket;
    private int $sessionId = 0;
    private int $replyId = -1;
    private bool $connected = false;

    /**
     * Plain (non-readonly) promoted properties — `readonly` requires PHP
     * 8.1, but this plugin declares `Requires PHP: 8.0` (composer.json:
     * "php": ">=8.0"). Using an 8.1-only keyword here would be a fatal
     * ParseError the moment this class loads on an 8.0 host — exactly the
     * kind of failure that produces a non-JSON response and shows up
     * frontend-side as an unhelpful generic error, which is what this class
     * must never cause.
     */
    private string $ip;
    private int $port;
    private int $connectTimeout;
    private int $readTimeout;
    private int $commKeyPassword;

    public function __construct(
        string $ip,
        int $port = 4370,
        int $connectTimeout = self::DEFAULT_CONNECT_TIMEOUT,
        int $readTimeout = self::DEFAULT_READ_TIMEOUT,
        int $commKeyPassword = 0
    ) {
        $this->ip = $ip;
        $this->port = $port;
        $this->connectTimeout = $connectTimeout;
        $this->readTimeout = $readTimeout;
        $this->commKeyPassword = $commKeyPassword;
    }

    public function isConnected(): bool
    {
        return $this->connected;
    }

    /**
     * Opens the TCP socket and performs the CMD_CONNECT handshake. If the
     * device replies CMD_ACK_UNAUTH (a non-zero "Comm Key" is set in its
     * menu), attempts the CMD_AUTH comm-key exchange automatically.
     * @throws \RuntimeException on any socket, timeout, or handshake failure — always with a specific, actionable message.
     */
    public function connect(): void
    {
        if ($this->connected) {
            return;
        }

        $address = "tcp://{$this->ip}:{$this->port}";

        Logger::info('device-sync-socket', 'Connecting...', [
            'ip' => $this->ip,
            'port' => $this->port,
            'timeout' => $this->connectTimeout,
        ]);

        // stream_socket_client()'s by-ref $errno/$errstr are the stream-API
        // equivalent of socket_last_error()/socket_strerror() from the
        // `sockets` PECL extension — used here instead of raw fsockopen()/
        // ext-sockets because streams need nothing beyond core PHP (see
        // class doc comment), but they carry the same OS-level errno/errstr
        // detail this log is meant to surface.
        $socket = @stream_socket_client($address, $errno, $errstr, $this->connectTimeout, STREAM_CLIENT_CONNECT);
        if ($socket === false) {
            Logger::error('device-sync-socket', 'Socket Error', [
                'ip' => $this->ip,
                'port' => $this->port,
                'errno' => $errno,
                'errstr' => $errstr,
            ]);
            throw new \RuntimeException("Cannot reach device at {$this->ip}:{$this->port} — {$errstr} (errno {$errno}). Verify the server has network access to the device (LAN/VPN/port-forward) and the device is powered on with TCP/IP enabled.");
        }

        Logger::info('device-sync-socket', 'Socket Connected', ['ip' => $this->ip, 'port' => $this->port]);

        stream_set_timeout($socket, $this->readTimeout);
        $this->socket = $socket;
        $this->sessionId = 0;
        $this->replyId = -1;

        $reply = $this->sendAndReceive(ZKProtocol::CMD_CONNECT);
        $this->sessionId = $reply['sessionId'];

        if ($reply['command'] === ZKProtocol::CMD_ACK_UNAUTH) {
            $authData = ZKProtocol::commKey($this->commKeyPassword, $this->sessionId);
            $authReply = $this->sendAndReceive(ZKProtocol::CMD_AUTH, $authData);
            if ($authReply['command'] !== ZKProtocol::CMD_ACK_OK) {
                $this->closeSocket();
                throw new \RuntimeException("Device at {$this->ip} requires a Comm Key password and the configured key was rejected. Check/clear the Comm Key in the device's own Communication menu.");
            }
        } elseif ($reply['command'] !== ZKProtocol::CMD_ACK_OK) {
            $this->closeSocket();
            throw new \RuntimeException("Device at {$this->ip} rejected CMD_CONNECT (command code {$reply['command']}).");
        }

        $this->connected = true;
    }

    /** Best-effort — sends CMD_EXIT so the device frees its session slot, then always closes the local socket regardless of whether the device replied. */
    public function disconnect(): void
    {
        if ($this->socket !== null) {
            try {
                if ($this->connected) {
                    $this->sendAndReceive(ZKProtocol::CMD_EXIT);
                }
            } catch (\Throwable $e) {
                // Device may not reply to EXIT (or may already be gone) — the socket close below is what actually matters.
            }
            $this->closeSocket();
        }
        $this->connected = false;
    }

    /** @return array{serialNumber:?string, platform:?string, deviceName:?string, firmwareVersion:?string} */
    public function getDeviceInfo(): array
    {
        return [
            'serialNumber' => $this->getOption('~SerialNumber'),
            'platform' => $this->getOption('~Platform'),
            'deviceName' => $this->getOption('~DeviceName'),
            'firmwareVersion' => $this->getOption('FirmVer'),
        ];
    }

    public function getFirmwareVersion(): ?string
    {
        return $this->getOption('FirmVer');
    }

    /**
     * @return array<int, array{uid:int, userId:string, name:string, privilege:int}>
     * BEST-EFFORT: the enrolled-user record struct varies by firmware more
     * than the attendance-log struct does, and reading users is not on the
     * attendance→payroll critical path (biometric-employee mapping is
     * managed explicitly via BiometricMapping.tsx, not auto-discovered from
     * this list) — treat this as a diagnostic/inventory helper, and verify
     * the parsed names/ids look sane against a real device before relying
     * on it for anything write-path.
     */
    public function getUsers(): array
    {
        $blob = $this->fetchBufferedData(ZKProtocol::CMD_USERTEMP_RRQ);
        if ($blob === '') {
            return [];
        }

        $recordSize = 72;
        $users = [];
        $count = intdiv(strlen($blob), $recordSize);
        for ($i = 0; $i < $count; $i++) {
            $record = substr($blob, $i * $recordSize, $recordSize);
            try {
                $uid = unpack('vuid', substr($record, 0, 2))['uid'];
                $privilege = ord(substr($record, 2, 1));
                $name = self::cleanString(substr($record, 11, 24));
                $userId = self::cleanString(substr($record, 48, 9));
                if ($userId === '') {
                    $userId = (string) $uid;
                }
                $users[] = ['uid' => $uid, 'userId' => $userId, 'name' => $name, 'privilege' => $privilege];
            } catch (\Throwable $e) {
                continue; // one malformed record must not abort the whole list
            }
        }
        return $users;
    }

    /**
     * @return array<int, array{uid:int, timestamp:\DateTimeImmutable, status:int, verifyType:int}>
     * Raw device-local (naive, no timezone attached) records — AttendanceParser
     * is responsible for turning these into ingestBatch()'s wire format,
     * including attaching the correct timezone offset. Uses the 40-byte
     * record layout, which is the layout used by the large majority of
     * currently-deployed network/TCP ZKTeco devices (including K40-class
     * hardware); see AttendanceParser's doc comment for what happens if a
     * specific unit's firmware disagrees.
     */
    public function getAttendanceLogs(): array
    {
        $blob = $this->fetchBufferedData(ZKProtocol::CMD_ATTLOG_RRQ);
        if ($blob === '') {
            return [];
        }

        $recordSize = 40;
        $records = [];
        $count = intdiv(strlen($blob), $recordSize);
        for ($i = 0; $i < $count; $i++) {
            $record = substr($blob, $i * $recordSize, $recordSize);
            if (strlen($record) < 30) {
                continue;
            }
            try {
                $userId = self::cleanString(substr($record, 0, 24));
                $status = ord(substr($record, 24, 1));
                $timeRaw = unpack('Vt', substr($record, 25, 4))['t'];
                $verifyType = ord(substr($record, 29, 1));
                if ($userId === '') {
                    continue;
                }
                $records[] = [
                    'uid' => ctype_digit($userId) ? (int) $userId : 0,
                    'userId' => $userId,
                    'timestamp' => ZKProtocol::decodeTime($timeRaw),
                    'status' => $status,
                    'verifyType' => $verifyType,
                ];
            } catch (\Throwable $e) {
                continue; // malformed single record — skip rather than corrupt the whole batch
            }
        }
        return $records;
    }

    /** Best-effort — many devices drop the connection immediately on reboot rather than replying, which is treated as success here, not an error. */
    public function restart(): void
    {
        try {
            $this->sendAndReceive(ZKProtocol::CMD_RESTART);
        } catch (\Throwable $e) {
            // Expected: device reboots instead of replying.
        }
        $this->connected = false;
        $this->closeSocket();
    }

    /** The device's own real-time clock reading, naive (see ZKProtocol::decodeTime()'s doc comment). */
    public function getDeviceTime(): \DateTimeImmutable
    {
        $reply = $this->sendAndReceive(ZKProtocol::CMD_GET_TIME);
        $encoded = unpack('Vt', substr($reply['data'], 0, 4))['t'];
        return ZKProtocol::decodeTime($encoded);
    }

    /**
     * Sets the device's RTC. $dt should be a naive DateTimeImmutable already
     * expressed in the site's local wall-clock time (wp_timezone()), NOT
     * UTC — the device has no concept of timezone, it only stores a local
     * wall-clock reading, which is exactly the assumption AttendanceParser
     * relies on when decoding attendance logs back out.
     */
    public function setDeviceTime(\DateTimeImmutable $dt): bool
    {
        $encoded = ZKProtocol::encodeTime($dt);
        $reply = $this->sendAndReceive(ZKProtocol::CMD_SET_TIME, pack('V', $encoded));
        return $reply['command'] === ZKProtocol::CMD_ACK_OK;
    }

    private function getOption(string $name): ?string
    {
        try {
            $reply = $this->sendAndReceive(ZKProtocol::CMD_OPTIONS_RRQ, $name . "\x00");
        } catch (\Throwable $e) {
            return null;
        }
        $raw = rtrim($reply['data'], "\x00");
        $eq = strpos($raw, '=');
        return $eq === false ? ($raw !== '' ? $raw : null) : substr($raw, $eq + 1);
    }

    /**
     * Sends a read command that triggers the device's CMD_PREPARE_DATA /
     * CMD_DATA multi-packet reply flow (used for anything whose payload can
     * exceed one TCP packet — user list, attendance log). Returns the
     * concatenated raw data bytes with no framing left in them. An empty
     * immediate CMD_ACK_OK reply (no CMD_PREPARE_DATA) means "no records",
     * which is a normal, valid outcome (e.g. a freshly reset device or one
     * whose log was already cleared) — not an error.
     */
    private function fetchBufferedData(int $command, string $requestData = ''): string
    {
        $reply = $this->sendAndReceive($command, $requestData);

        if ($reply['command'] === ZKProtocol::CMD_ACK_OK) {
            return ''; // no data to transfer
        }

        if ($reply['command'] !== ZKProtocol::CMD_PREPARE_DATA) {
            throw new \RuntimeException("Device rejected read command {$command} (replied with command code {$reply['command']}).");
        }

        $sizeUnpacked = unpack('Vsize', substr($reply['data'], 0, 4));
        $expected = $sizeUnpacked['size'] ?? 0;
        if ($expected <= 0) {
            return '';
        }

        $collected = '';
        $guardIterations = 0;
        while (strlen($collected) < $expected && $guardIterations < 100000) {
            $guardIterations++;
            $packet = $this->readFramedPacket();
            if ($packet['command'] === ZKProtocol::CMD_ACK_OK && $packet['data'] === '') {
                break; // trailing close-out ack some firmwares send after the last data chunk
            }
            $collected .= $packet['data'];
        }

        // Some firmwares send one extra trailing CMD_ACK_OK after the data is
        // fully delivered; drain it if present so it doesn't desync the next
        // command's reply, but never fail the transfer if it's absent.
        if (strlen($collected) >= $expected) {
            try {
                $this->readFramedPacket();
            } catch (\Throwable $e) {
                // No trailing ack — fine, the data itself already arrived complete.
            }
        }

        return substr($collected, 0, $expected);
    }

    private function sendAndReceive(int $command, string $data = ''): array
    {
        if ($this->socket === null) {
            throw new \RuntimeException('Not connected — call connect() first.');
        }
        $this->replyId++;
        if ($this->replyId > 0xFFFF) {
            $this->replyId = 0;
        }
        $packet = ZKProtocol::buildPacket($command, $this->sessionId, $this->replyId, $data);
        $wire = ZKProtocol::wrapTcp($packet);

        $written = @fwrite($this->socket, $wire);
        if ($written === false || $written < strlen($wire)) {
            throw new \RuntimeException("Failed writing to device socket ({$this->ip}:{$this->port}) — connection likely dropped.");
        }

        return $this->readFramedPacket();
    }

    private function readFramedPacket(): array
    {
        $prefix = $this->readExact(ZKProtocol::TCP_PREFIX_LEN);
        $length = ZKProtocol::readTcpPrefix($prefix);
        if ($length === null) {
            throw new \RuntimeException("Malformed reply from device at {$this->ip} — TCP framing prefix not recognized.");
        }
        $payload = $length > 0 ? $this->readExact($length) : '';
        return ZKProtocol::parsePacket($payload);
    }

    private function readExact(int $length): string
    {
        $buffer = '';
        while (strlen($buffer) < $length) {
            $chunk = fread($this->socket, $length - strlen($buffer));
            if ($chunk === false || $chunk === '') {
                $meta = stream_get_meta_data($this->socket);
                if (!empty($meta['timed_out'])) {
                    throw new \RuntimeException("Timed out waiting for a reply from device at {$this->ip}:{$this->port} (after {$this->readTimeout}s).");
                }
                throw new \RuntimeException("Connection to device at {$this->ip}:{$this->port} closed unexpectedly mid-read.");
            }
            $buffer .= $chunk;
        }
        return $buffer;
    }

    private function closeSocket(): void
    {
        if ($this->socket !== null) {
            fclose($this->socket);
            $this->socket = null;
        }
    }

    /** Strips trailing NUL padding and non-printable bytes from a fixed-width device string field. */
    private static function cleanString(string $raw): string
    {
        $trimmed = strstr($raw, "\x00", true);
        $trimmed = $trimmed === false ? $raw : $trimmed;
        return trim(preg_replace('/[^\x20-\x7E]/', '', $trimmed));
    }

    public function __destruct()
    {
        $this->closeSocket();
    }
}
