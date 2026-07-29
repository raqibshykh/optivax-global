<?php

declare(strict_types=1);

namespace OptivaxAttendanceSync;

/**
 * Talks to the ERP's existing, unmodified punches/import endpoint. Same
 * request contract as before this hardening pass: X-Device-Key header,
 * {punches, bridge, deviceTime} body, optional Idempotency-Key header. All
 * that changed here is transport robustness (timeouts, TLS verification,
 * distinguishing transient from permanent failures, retry with backoff) —
 * nothing about what is sent or how the ERP authenticates/processes it.
 */
final class ErpClient
{
    public function __construct(
        private string $baseUrl,
        private string $deviceId,
        private string $apiKey,
        private int $connectTimeoutSeconds,
        private int $timeoutSeconds,
        private int $maxRetries,
        private int $retryBackoffSeconds,
        private Logger $logger
    ) {
    }

    /** @return array{ok:bool, httpCode:int, body:mixed, retries:int} */
    public function sendBatch(array $punches): array
    {
        $idempotencyKey = hash('sha256', $this->deviceId . '|' . json_encode($punches));
        $payload = [
            'punches' => $punches,
            'bridge' => [
                'id' => 'optivax-attendance-sync',
                'version' => '1.1.0',
                'hostname' => gethostname() ?: null,
                'os' => PHP_OS,
            ],
            'deviceTime' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ];
        $body = json_encode($payload);
        $url = rtrim($this->baseUrl, '/') . '/it/devices/' . rawurlencode($this->deviceId) . '/punches/import';

        $retries = 0;
        for ($attempt = 1; ; $attempt++) {
            $result = $this->doRequest($url, (string) $body, $idempotencyKey);

            if ($result['transportError'] !== null) {
                $this->logger->error('HTTP transport error', ['attempt' => $attempt, 'error' => $result['transportError']]);
                if ($attempt > $this->maxRetries) {
                    return ['ok' => false, 'httpCode' => 0, 'body' => null, 'retries' => $retries];
                }
                $retries++;
                $this->backoff($attempt);
                continue;
            }

            $httpCode = $result['httpCode'];
            $decoded = json_decode((string) $result['body'], true);

            if ($httpCode >= 200 && $httpCode < 300) {
                return ['ok' => true, 'httpCode' => $httpCode, 'body' => $decoded, 'retries' => $retries];
            }

            // Auth/validation failures are not transient — the same request
            // will fail again identically, so retrying only delays reporting
            // the real problem (bad key, malformed payload, unknown device).
            if (in_array($httpCode, [400, 401, 403, 404, 413, 422], true)) {
                $this->logger->error('API rejected batch (non-retryable)', ['httpCode' => $httpCode, 'body' => $result['body']]);
                return ['ok' => false, 'httpCode' => $httpCode, 'body' => $decoded, 'retries' => $retries];
            }

            // 429 (rate limited) and 5xx (server-side) are treated as transient.
            $this->logger->warn('API returned a transient failure', ['httpCode' => $httpCode, 'attempt' => $attempt]);
            if ($attempt > $this->maxRetries) {
                return ['ok' => false, 'httpCode' => $httpCode, 'body' => $decoded, 'retries' => $retries];
            }
            $retries++;
            $this->backoff($attempt);
        }
    }

    private function backoff(int $attempt): void
    {
        sleep($this->retryBackoffSeconds * (2 ** ($attempt - 1)));
    }

    /** @return array{transportError:?string, httpCode:int, body:?string} */
    private function doRequest(string $url, string $body, string $idempotencyKey): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Device-Key: ' . $this->apiKey,
                'Idempotency-Key: ' . $idempotencyKey,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $this->connectTimeoutSeconds,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $responseBody = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($responseBody === false || $errno !== 0) {
            return ['transportError' => $this->describeCurlError($errno, $error), 'httpCode' => 0, 'body' => null];
        }
        return ['transportError' => null, 'httpCode' => $httpCode, 'body' => $responseBody];
    }

    private function describeCurlError(int $errno, string $error): string
    {
        return match ($errno) {
            CURLE_COULDNT_RESOLVE_HOST => "DNS resolution failed: {$error}",
            CURLE_COULDNT_CONNECT => "Connection failed: {$error}",
            CURLE_OPERATION_TIMEDOUT => "Request timed out: {$error}",
            CURLE_SSL_CONNECT_ERROR, CURLE_SSL_CACERT => "SSL/TLS error: {$error}",
            default => "cURL error #{$errno}: {$error}",
        };
    }
}
