<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Notifications\NotificationService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET /notifications/stream (src/hooks/useSSE.ts). WordPress/PHP-FPM
 * hosting has no persistent process to hold a genuine indefinite SSE
 * connection open safely (it would pin a PHP-FPM worker per open tab
 * forever, exhausting the pool under load) — so this is the standard,
 * safe pattern instead: a bounded-duration (~25s) poll-and-push loop that
 * exits cleanly. The frontend's EventSource already reconnects with
 * backoff on `onerror` (see useSSE.ts), which fires the instant this
 * script ends the connection, so the client experience is a stream that
 * silently "picks back up" every ~25s rather than one that ever errors
 * out for real. This does not return a WP_REST_Response — it writes the
 * event-stream body directly and exits, which is the only way to emit
 * true text/event-stream framing (headers, incremental flush) from a
 * WP REST callback.
 */
final class NotificationStreamController
{
    private const STREAM_DURATION_SECONDS = 25;
    private const POLL_INTERVAL_SECONDS = 2;
    private const HEARTBEAT_EVERY_SECONDS = 15;

    public function stream(\WP_REST_Request $request): void
    {
        if (!AuthMiddleware::isAuthenticated()) {
            status_header(401);
            header('Content-Type: application/json');
            echo wp_json_encode(['success' => false, 'data' => null, 'error' => 'Authentication required']);
            exit;
        }
        $userId = (string) AuthMiddleware::currentUserId();

        // Never hold the connection open indefinitely even if something
        // upstream misbehaves — the loop below already bails out well
        // before this, but this is the hard backstop.
        @set_time_limit(self::STREAM_DURATION_SECONDS + 10);

        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', 1);
        }
        @ini_set('zlib.output_compression', '0');
        @ini_set('output_buffering', 'off');
        @ini_set('implicit_flush', '1');
        while (ob_get_level() > 0) {
            ob_end_flush();
        }

        status_header(200);
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache, no-transform');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // disables nginx response buffering, if present

        // Start from "now" (the most recent existing row) so a fresh
        // connection doesn't immediately replay old notifications — only
        // ones created after the stream opened are pushed.
        $latest = NotificationService::listSince($userId, null);
        $since = $latest[0]['createdAt'] ?? current_time('mysql', true);

        $deadline = time() + self::STREAM_DURATION_SECONDS;
        $lastHeartbeat = time();

        while (time() < $deadline) {
            if (connection_aborted()) {
                exit;
            }

            $fresh = NotificationService::listSince($userId, $since);
            foreach ($fresh as $notification) {
                $payload = [
                    'id' => $notification['id'],
                    'type' => $notification['type'],
                    'payload' => [
                        'title' => $notification['title'],
                        'message' => $notification['message'],
                        'module' => $notification['module'],
                        'actionUrl' => $notification['actionUrl'],
                        'actionLabel' => $notification['actionLabel'],
                    ],
                ];
                echo "event: notification\n";
                echo 'data: ' . wp_json_encode($payload) . "\n\n";
                $since = $notification['createdAt'];
            }

            if ($fresh) {
                $lastHeartbeat = time();
            } elseif (time() - $lastHeartbeat >= self::HEARTBEAT_EVERY_SECONDS) {
                echo ": heartbeat\n\n";
                $lastHeartbeat = time();
            }

            flush();
            usleep(self::POLL_INTERVAL_SECONDS * 1000000);
        }

        exit;
    }
}
