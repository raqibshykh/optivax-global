<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Declarative request-body validation shared by every controller. Controllers
 * call Validator::check($data, [...rules]) before touching a repository; a
 * non-null return is a field=>message map ready to hand straight to
 * ApiResponse::validationError('Validation failed', $errors).
 *
 * Rule strings (pipe-combinable, e.g. 'required|date'):
 *   required            - present and not null/empty-string
 *   uuid                - matches UUID v4 shape (only applied when the value is present)
 *   email               - passes is_email()
 *   phone               - optional leading +, digits/spaces/hyphens/parens only, 7-15 actual digits (E.164 max)
 *   date                - parses as Y-m-d
 *   numeric             - is_numeric()
 *   int                 - filter_var FILTER_VALIDATE_INT
 * Rule arrays (for parameterized rules):
 *   ['in', ['a','b','c']]      - value must be one of the given set
 *   ['min', 0]                 - numeric value >= given bound
 *   ['max', 100]                - numeric value <= given bound
 *
 * All non-required rules are skipped when the field is absent/null — pair
 * with 'required' explicitly when a field must always be present.
 */
final class Validator
{
    private const UUID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
    /** Only +, digits, spaces, hyphens, parens allowed as characters — the actual digit count (7-15, the E.164 max) is checked separately in the 'phone' case below. */
    private const PHONE_CHARS_PATTERN = '/^\+?[0-9\s\-()]+$/';

    /**
     * @param array $data   the already-decoded request body (assoc array)
     * @param array $rules  field => rule|rule[] (each rule a string or [name, ...args])
     * @return array|null   field => message map, or null if everything passed
     */
    public static function check(array $data, array $rules): ?array
    {
        $errors = [];

        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;
            $present = $value !== null && $value !== '';

            foreach ((array) $fieldRules as $rule) {
                [$name, $arg] = is_array($rule) ? [$rule[0], $rule[1] ?? null] : [$rule, null];

                if ($name === 'required') {
                    if (!$present) {
                        $errors[$field] = "{$field} is required";
                        break;
                    }
                    continue;
                }

                if (!$present) {
                    continue;
                }

                switch ($name) {
                    case 'uuid':
                        if (!preg_match(self::UUID_PATTERN, (string) $value)) {
                            $errors[$field] = "{$field} must be a valid UUID";
                        }
                        break;

                    case 'email':
                        if (!is_email((string) $value)) {
                            $errors[$field] = "{$field} must be a valid email address";
                        }
                        break;

                    case 'phone':
                        $digitCount = strlen(preg_replace('/\D/', '', (string) $value));
                        if (!preg_match(self::PHONE_CHARS_PATTERN, (string) $value) || $digitCount < 7 || $digitCount > 15) {
                            $errors[$field] = "{$field} must be a valid phone number";
                        }
                        break;

                    case 'date':
                        $parsed = \DateTime::createFromFormat('Y-m-d', (string) $value);
                        if (!$parsed || $parsed->format('Y-m-d') !== (string) $value) {
                            $errors[$field] = "{$field} must be a valid date (YYYY-MM-DD)";
                        }
                        break;

                    case 'numeric':
                        if (!is_numeric($value)) {
                            $errors[$field] = "{$field} must be numeric";
                        }
                        break;

                    case 'int':
                        if (filter_var($value, FILTER_VALIDATE_INT) === false) {
                            $errors[$field] = "{$field} must be an integer";
                        }
                        break;

                    case 'in':
                        if (!in_array($value, (array) $arg, true)) {
                            $errors[$field] = "{$field} must be one of: " . implode(', ', (array) $arg);
                        }
                        break;

                    case 'min':
                        if (!is_numeric($value) || (float) $value < (float) $arg) {
                            $errors[$field] = "{$field} must be at least {$arg}";
                        }
                        break;

                    case 'max':
                        if (!is_numeric($value) || (float) $value > (float) $arg) {
                            $errors[$field] = "{$field} must be at most {$arg}";
                        }
                        break;
                }

                if (isset($errors[$field])) {
                    break;
                }
            }
        }

        return empty($errors) ? null : $errors;
    }
}
