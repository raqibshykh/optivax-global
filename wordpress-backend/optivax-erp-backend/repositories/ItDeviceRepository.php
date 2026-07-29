<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\DeviceKeyHasher;
use OptivaxERP\Helpers\Sanitize;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/it/devices/* (src/services/itSupportService.ts BiometricDevice).
 *
 * Device-key handling: the plaintext API key a Bridge presents in its
 * `X-Device-Key` header is never stored — only its SHA-256 hash
 * (api_key_hash) and last 4 characters (api_key_last_four, for admin-UI
 * identification) live in the database. The plaintext is generated
 * server-side and handed back to the caller exactly once — at create() or
 * rotateApiKey() — via the one-time $pendingPlaintextKey reveal below, the
 * same pattern a GitHub PAT uses. The legacy `api_key` plaintext column is
 * kept (dbDelta is additive-only, and the "no data loss" constraint applies
 * to schema too) but is no longer written or read by this class.
 */
final class ItDeviceRepository extends AbstractRepository
{
    /** Set by fromDtoForCreate()/rotateApiKey() for the current call only, consumed once by create()/rotateApiKey() to reveal the plaintext key that was just generated — never persisted, never returned on any later read. */
    private ?string $pendingPlaintextKey = null;

    protected function tableName(): string
    {
        return 'it_devices';
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'deviceType' => $row['device_type'],
            'serialNumber' => $row['serial_number'],
            'ipAddress' => $row['ip_address'],
            'port' => isset($row['port']) ? (int) $row['port'] : 0,
            'branch' => $row['branch'],
            'status' => $row['status'],
            'lastSync' => $row['last_sync'] ?? null,
            'syncFrequency' => $row['sync_frequency'],
            'totalUsers' => isset($row['total_users']) ? (int) $row['total_users'] : 0,
            'firmwareVersion' => $row['firmware_version'] ?? null,
            // Never the plaintext key — present (for wire-shape stability)
            // but null except immediately after create()/rotateApiKey(),
            // which overlay the one-time-reveal plaintext onto this DTO.
            'apiKey' => null,
            'apiKeyLastFour' => $row['api_key_last_four'] ?? null,
            'apiKeyRotatedAt' => $row['api_key_rotated_at'] ?? null,
            'apiKeyExpiresAt' => $row['api_key_expires_at'] ?? null,
            'apiKeyRevoked' => !empty($row['api_key_revoked_at']),
            'apiKeyRevokedAt' => $row['api_key_revoked_at'] ?? null,
            // Live-connection diagnostics — written by DeviceSyncService (legacy LAN TCP path), never by the Devices.tsx create/edit form.
            'lastConnection' => $row['last_connection'] ?? null,
            'lastDownload' => $row['last_download'] ?? null,
            'lastSuccessfulSync' => $row['last_successful_sync'] ?? null,
            'lastError' => $row['last_error'] ?? null,
            'lastDeviceTime' => $row['last_device_time'] ?? null,
            'totalLogs' => isset($row['total_logs']) ? (int) $row['total_logs'] : 0,
            // Bridge push-status diagnostics — written by BiometricAttendanceService on every punches/import call, the primary status source now that direct TCP is deprecated.
            'bridgeId' => $row['bridge_id'] ?? null,
            'bridgeVersion' => $row['bridge_version'] ?? null,
            'bridgeHostname' => $row['bridge_hostname'] ?? null,
            'bridgeIp' => $row['bridge_ip'] ?? null,
            'bridgeOs' => $row['bridge_os'] ?? null,
            'bridgeLastSeen' => $row['bridge_last_seen'] ?? null,
            'bridgeLatencyMs' => isset($row['bridge_latency_ms']) ? (int) $row['bridge_latency_ms'] : null,
            'lastUploadDurationMs' => isset($row['last_upload_duration_ms']) ? (int) $row['last_upload_duration_ms'] : null,
            'lastUploadCount' => isset($row['last_upload_count']) ? (int) $row['last_upload_count'] : null,
            'lastFailedUpload' => $row['last_failed_upload'] ?? null,
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        $row = [
            'name' => Sanitize::text($data['name'] ?? ''),
            'device_type' => Sanitize::text($data['deviceType'] ?? 'ZKTeco'),
            'serial_number' => Sanitize::text($data['serialNumber'] ?? null),
            'ip_address' => Sanitize::text($data['ipAddress'] ?? null),
            'port' => Sanitize::int($data['port'] ?? 0),
            'branch' => Sanitize::text($data['branch'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'offline'),
            'last_sync' => Sanitize::text($data['lastSync'] ?? null),
            'sync_frequency' => Sanitize::text($data['syncFrequency'] ?? 'daily'),
            'total_users' => Sanitize::int($data['totalUsers'] ?? 0),
            'firmware_version' => Sanitize::text($data['firmwareVersion'] ?? null),
        ];

        // A device/bridge needs a credential to authenticate punch imports
        // (DeviceApiKeyMiddleware). Always server-generated — a caller can
        // no longer supply their own key value, since that would defeat the
        // point of never letting a plaintext key exist outside this one
        // generation moment.
        [$plain, $hash, $lastFour] = DeviceKeyHasher::generate();
        $this->pendingPlaintextKey = $plain;
        $row['api_key_hash'] = $hash;
        $row['api_key_last_four'] = $lastFour;
        $row['api_key_rotated_at'] = current_time('mysql', true);

        return $row;
    }

    /** Overlays the one-time-reveal plaintext key (generated in fromDtoForCreate() above) onto the returned DTO — the only response that will ever carry it. */
    public function create(array $data): array
    {
        $created = parent::create($data);
        if ($this->pendingPlaintextKey !== null) {
            $created['apiKey'] = $this->pendingPlaintextKey;
            $this->pendingPlaintextKey = null;
        }
        return $created;
    }

    /**
     * Issues a fresh key for an existing device, invalidating the previous
     * one immediately (old key can no longer authenticate — see
     * DeviceApiKeyMiddleware) and clearing any prior revocation. Returns the
     * plaintext exactly once, same as create().
     */
    public function rotateApiKey(string $id): ?array
    {
        if (!$this->find($id)) {
            return null;
        }
        global $wpdb;
        [$plain, $hash, $lastFour] = DeviceKeyHasher::generate();
        $wpdb->update($this->table(), [
            'api_key_hash' => $hash,
            'api_key_last_four' => $lastFour,
            'api_key_rotated_at' => current_time('mysql', true),
            'api_key_revoked_at' => null,
        ], [$this->idColumn() => $id]);

        $updated = $this->find($id);
        if ($updated) {
            $updated['apiKey'] = $plain;
        }
        return $updated;
    }

    /** Immediately disables a device's current key (DeviceApiKeyMiddleware rejects it from this point on) without issuing a replacement — use rotateApiKey() to also issue a new one. */
    public function revokeApiKey(string $id): ?array
    {
        global $wpdb;
        $wpdb->update($this->table(), [
            'api_key_revoked_at' => current_time('mysql', true),
        ], [$this->idColumn() => $id]);
        return $this->find($id);
    }

    /**
     * Raw auth-only lookup for DeviceApiKeyMiddleware — deliberately bypasses
     * toDto() so the hash itself never travels through the public DTO shape
     * (toDto() intentionally omits api_key_hash entirely).
     */
    public function findAuthRecord(string $id): ?array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT id, name, api_key_hash, api_key_expires_at, api_key_revoked_at FROM {$this->table()} WHERE id = %s",
            $id
        ), ARRAY_A);
        return $row ?: null;
    }

    /**
     * Bridge push-status update — called by BiometricAttendanceService after
     * every punches/import call (success or failure), never by the legacy
     * TCP path. $status keys are all optional; only columns actually present
     * are touched, same partial-update convention as fromDtoForUpdate().
     */
    public function recordBridgeStatus(string $id, array $status): void
    {
        $row = ['bridge_last_seen' => current_time('mysql', true)];

        $textFields = [
            'bridgeId' => 'bridge_id',
            'bridgeVersion' => 'bridge_version',
            'bridgeHostname' => 'bridge_hostname',
            'bridgeIp' => 'bridge_ip',
            'bridgeOs' => 'bridge_os',
        ];
        foreach ($textFields as $key => $column) {
            if (array_key_exists($key, $status) && $status[$key] !== null) {
                $row[$column] = Sanitize::text($status[$key]);
            }
        }
        if (array_key_exists('bridgeLatencyMs', $status) && $status['bridgeLatencyMs'] !== null) {
            $row['bridge_latency_ms'] = Sanitize::int($status['bridgeLatencyMs']);
        }
        if (array_key_exists('lastUploadDurationMs', $status)) {
            $row['last_upload_duration_ms'] = Sanitize::int($status['lastUploadDurationMs']);
        }
        if (array_key_exists('lastUploadCount', $status)) {
            $row['last_upload_count'] = Sanitize::int($status['lastUploadCount']);
        }
        if (!empty($status['failed'])) {
            $row['last_failed_upload'] = current_time('mysql', true);
        }

        global $wpdb;
        $wpdb->update($this->table(), $row, [$this->idColumn() => $id]);
    }

    /** Only touches columns actually present in the patch, so a partial PUT can't blank out unrelated fields. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('deviceType', $data)) {
            $row['device_type'] = Sanitize::text($data['deviceType']);
        }
        if (array_key_exists('serialNumber', $data)) {
            $row['serial_number'] = Sanitize::text($data['serialNumber']);
        }
        if (array_key_exists('ipAddress', $data)) {
            $row['ip_address'] = Sanitize::text($data['ipAddress']);
        }
        if (array_key_exists('port', $data)) {
            $row['port'] = Sanitize::int($data['port']);
        }
        if (array_key_exists('branch', $data)) {
            $row['branch'] = Sanitize::text($data['branch']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('lastSync', $data)) {
            $row['last_sync'] = Sanitize::text($data['lastSync']);
        }
        if (array_key_exists('syncFrequency', $data)) {
            $row['sync_frequency'] = Sanitize::text($data['syncFrequency']);
        }
        if (array_key_exists('totalUsers', $data)) {
            $row['total_users'] = Sanitize::int($data['totalUsers']);
        }
        if (array_key_exists('firmwareVersion', $data)) {
            $row['firmware_version'] = Sanitize::text($data['firmwareVersion']);
        }
        // Deliberately no 'apiKey' branch — a caller can no longer set the
        // key value directly via a generic update. rotateApiKey()/
        // revokeApiKey() are the only ways to change a device's credential,
        // so a hash is always generated server-side, never trusted from a
        // request body.
        if (array_key_exists('apiKeyExpiresAt', $data)) {
            $row['api_key_expires_at'] = Sanitize::text($data['apiKeyExpiresAt']);
        }
        if (array_key_exists('lastConnection', $data)) {
            $row['last_connection'] = Sanitize::text($data['lastConnection']);
        }
        if (array_key_exists('lastDownload', $data)) {
            $row['last_download'] = Sanitize::text($data['lastDownload']);
        }
        if (array_key_exists('lastSuccessfulSync', $data)) {
            $row['last_successful_sync'] = Sanitize::text($data['lastSuccessfulSync']);
        }
        if (array_key_exists('lastError', $data)) {
            $row['last_error'] = Sanitize::textarea($data['lastError']);
        }
        if (array_key_exists('lastDeviceTime', $data)) {
            $row['last_device_time'] = Sanitize::text($data['lastDeviceTime']);
        }
        if (array_key_exists('totalLogs', $data)) {
            $row['total_logs'] = Sanitize::int($data['totalLogs']);
        }
        return $row;
    }
}
