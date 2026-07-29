<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Wraps a multi-step write in a real SQL transaction so a failure partway
 * through never leaves partial rows committed. Requires every table involved
 * to be InnoDB (see database/migrations/* — all tables declare ENGINE=InnoDB).
 *
 * Usage:
 *   $result = Transaction::run(function () use (...) {
 *       // ... multiple $wpdb / repository calls ...
 *       if ($somethingWentWrong) {
 *           throw new \RuntimeException('why it failed');
 *       }
 *       return $finalValue;
 *   });
 *
 * Any thrown exception (or $wpdb->last_error becoming non-empty after a call)
 * rolls back everything done inside the closure and re-throws, so the caller
 * (a controller) can catch it and return ApiResponse::serverError()/
 * validationError() without ever having committed a partial write.
 *
 * Reentrant: MySQL has no real nested transactions — a second
 * START TRANSACTION while one is already open implicitly commits the first,
 * which would silently break atomicity for exactly the composite-operation
 * case this helper exists for (e.g. BudgetController::resetCompany() calling
 * three repository methods that each wrap themselves in Transaction::run()).
 * A depth counter makes nested calls a no-op passthrough — only the
 * outermost call issues START TRANSACTION/COMMIT/ROLLBACK.
 */
final class Transaction
{
    private static int $depth = 0;

    /**
     * @template T
     * @param callable():T $fn
     * @return T
     * @throws \Throwable whatever $fn threw, after rolling back (outermost call only)
     */
    public static function run(callable $fn)
    {
        global $wpdb;

        if (self::$depth > 0) {
            self::$depth++;
            try {
                return $fn();
            } finally {
                self::$depth--;
            }
        }

        self::$depth++;
        $wpdb->query('START TRANSACTION');

        try {
            $result = $fn();

            if ($wpdb->last_error) {
                throw new \RuntimeException('Database error during transaction: ' . $wpdb->last_error);
            }

            $wpdb->query('COMMIT');
            return $result;
        } catch (\Throwable $e) {
            $wpdb->query('ROLLBACK');
            Logger::error('transaction', 'Rolled back: ' . $e->getMessage());
            throw $e;
        } finally {
            self::$depth--;
        }
    }
}
