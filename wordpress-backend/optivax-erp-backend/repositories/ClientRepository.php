<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/clients/*. Serves both the plain `Client` shape and the
 * `StoredClient` (Sales-Admin-created, production-assigned) variant from src/types —
 * the two frontend interfaces are unioned onto one table since every
 * StoredClient field also appears on Client.
 */
final class ClientRepository extends AbstractRepository
{
    protected bool $softDeletes = true;

    protected function tableName(): string
    {
        return 'clients';
    }

    /**
     * Overridden (not the parent's plain-equality list()) because `assignedTo`
     * has to match membership inside the JSON `assigned_production_members`
     * array, which needs JSON_CONTAINS rather than a `column = value` filter.
     * Still supports the same opt-in pagination/search contract as
     * AbstractRepository::list() (see its doc comment) so callers behave
     * identically whether or not a resource needed this JSON-filter override.
     *
     * @param array $filters supports 'id', 'email' (plain equality) and
     * 'assigned_to' (JSON membership) keys.
     */
    public function list(array $filters = [], string $orderBy = null, ?array $pagination = null, ?array $search = null): array
    {
        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildClientWhere($filters, $search);

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($pagination !== null) {
            $sql .= sprintf(' LIMIT %d OFFSET %d', (int) ($pagination['limit'] ?? 20), (int) ($pagination['offset'] ?? 0));
        }

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Mirrors AbstractRepository::count() — needed because list() is overridden here for the JSON_CONTAINS case. */
    public function count(array $filters = [], ?array $search = null): int
    {
        global $wpdb;
        [$where, $values] = $this->buildClientWhere($filters, $search);

        $sql = "SELECT COUNT(*) FROM {$this->table()}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        return (int) (empty($values) ? $wpdb->get_var($sql) : $wpdb->get_var($wpdb->prepare($sql, $values)));
    }

    /** @return array{0: string[], 1: array} shared by list() and count() above. */
    private function buildClientWhere(array $filters, ?array $search): array
    {
        global $wpdb;
        $where = [];
        $values = [];

        if (!empty($filters['id'])) {
            $where[] = 'id = %s';
            $values[] = $filters['id'];
        }
        if (!empty($filters['email'])) {
            $where[] = 'email = %s';
            $values[] = $filters['email'];
        }
        if (!empty($filters['assigned_to'])) {
            $where[] = 'JSON_CONTAINS(assigned_production_members, JSON_QUOTE(%s))';
            $values[] = (string) $filters['assigned_to'];
        }
        if ($search && !empty($search['columns']) && isset($search['term']) && $search['term'] !== '') {
            $like = '%' . $wpdb->esc_like((string) $search['term']) . '%';
            $searchClauses = [];
            foreach ($search['columns'] as $column) {
                $searchClauses[] = "{$column} LIKE %s";
                $values[] = $like;
            }
            $where[] = '(' . implode(' OR ', $searchClauses) . ')';
        }

        if ($this->softDeletes) {
            $where[] = 'deleted_at IS NULL';
        }

        return [$where, $values];
    }

    protected function toDto(array $row): array
    {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'] ?? '',
            'company' => $row['company'] ?? '',
            'address' => $row['address'] ?? '',
            'city' => $row['city'] ?? '',
            'country' => $row['country'] ?? '',
            'website' => $row['website'] ?? '',
            'companyLogo' => $row['company_logo'] ?: null,
            'bio' => $row['bio'] ?? '',
            'status' => $row['status'] ?? 'active',
            'joinDate' => $row['join_date'] ?: null,
            'avatar' => $row['avatar'] ?: null,
            'totalProjects' => (int) ($row['total_projects'] ?? 0),
            'totalBilled' => (float) ($row['total_billed'] ?? 0),
            'lastPaymentDate' => $row['last_payment_date'] ?: null,
            'tags' => Sanitize::jsonDecode($row['tags'] ?? null),
            'contactName' => $row['contact_name'] ?: null,
            'companyName' => $row['company_name'] ?: null,
            'createdAt' => $row['created_at'] ?: null,
            'createdBy' => $row['created_by'] ?: null,
            'createdByName' => $row['created_by_name'] ?: null,
            'updatedBy' => $row['updated_by'] ?? null,
            'assignedProductionMembers' => Sanitize::jsonDecode($row['assigned_production_members'] ?? null),
        ];
    }

    protected function fromDtoForCreate(array $data): array
    {
        return [
            'name' => Sanitize::text($data['name'] ?? ''),
            'email' => Sanitize::email($data['email'] ?? ''),
            'phone' => Sanitize::text($data['phone'] ?? null),
            'company' => Sanitize::text($data['company'] ?? null),
            'address' => Sanitize::text($data['address'] ?? null),
            'city' => Sanitize::text($data['city'] ?? null),
            'country' => Sanitize::text($data['country'] ?? null),
            'website' => Sanitize::url($data['website'] ?? null),
            'company_logo' => $data['companyLogo'] ?? null,
            'bio' => Sanitize::textarea($data['bio'] ?? null),
            'status' => Sanitize::text($data['status'] ?? 'active'),
            'join_date' => Sanitize::text($data['joinDate'] ?? null),
            'avatar' => $data['avatar'] ?? null,
            'total_projects' => Sanitize::int($data['totalProjects'] ?? 0),
            'total_billed' => Sanitize::float($data['totalBilled'] ?? 0),
            'last_payment_date' => Sanitize::text($data['lastPaymentDate'] ?? null),
            'tags' => Sanitize::json($data['tags'] ?? []),
            'contact_name' => Sanitize::text($data['contactName'] ?? null),
            'company_name' => Sanitize::text($data['companyName'] ?? null),
            'created_at' => Sanitize::text($data['createdAt'] ?? null) ?: current_time('mysql', true),
            'created_by' => Sanitize::text($data['createdBy'] ?? null),
            'created_by_name' => Sanitize::text($data['createdByName'] ?? null),
            'assigned_production_members' => Sanitize::json($data['assignedProductionMembers'] ?? []),
        ];
    }

    /** Partial-update map: only columns whose frontend key is present in the patch are touched. */
    protected function fromDtoForUpdate(array $data): array
    {
        $row = [];
        if (array_key_exists('name', $data)) {
            $row['name'] = Sanitize::text($data['name']);
        }
        if (array_key_exists('email', $data)) {
            $row['email'] = Sanitize::email($data['email']);
        }
        if (array_key_exists('phone', $data)) {
            $row['phone'] = Sanitize::text($data['phone']);
        }
        if (array_key_exists('company', $data)) {
            $row['company'] = Sanitize::text($data['company']);
        }
        if (array_key_exists('address', $data)) {
            $row['address'] = Sanitize::text($data['address']);
        }
        if (array_key_exists('city', $data)) {
            $row['city'] = Sanitize::text($data['city']);
        }
        if (array_key_exists('country', $data)) {
            $row['country'] = Sanitize::text($data['country']);
        }
        if (array_key_exists('website', $data)) {
            $row['website'] = Sanitize::url($data['website']);
        }
        if (array_key_exists('companyLogo', $data)) {
            $row['company_logo'] = $data['companyLogo'];
        }
        if (array_key_exists('bio', $data)) {
            $row['bio'] = Sanitize::textarea($data['bio']);
        }
        if (array_key_exists('status', $data)) {
            $row['status'] = Sanitize::text($data['status']);
        }
        if (array_key_exists('joinDate', $data)) {
            $row['join_date'] = Sanitize::text($data['joinDate']);
        }
        if (array_key_exists('avatar', $data)) {
            $row['avatar'] = $data['avatar'];
        }
        if (array_key_exists('totalProjects', $data)) {
            $row['total_projects'] = Sanitize::int($data['totalProjects']);
        }
        if (array_key_exists('totalBilled', $data)) {
            $row['total_billed'] = Sanitize::float($data['totalBilled']);
        }
        if (array_key_exists('lastPaymentDate', $data)) {
            $row['last_payment_date'] = Sanitize::text($data['lastPaymentDate']);
        }
        if (array_key_exists('tags', $data)) {
            $row['tags'] = Sanitize::json($data['tags']);
        }
        if (array_key_exists('contactName', $data)) {
            $row['contact_name'] = Sanitize::text($data['contactName']);
        }
        if (array_key_exists('companyName', $data)) {
            $row['company_name'] = Sanitize::text($data['companyName']);
        }
        if (array_key_exists('createdBy', $data)) {
            $row['created_by'] = Sanitize::text($data['createdBy']);
        }
        if (array_key_exists('createdByName', $data)) {
            $row['created_by_name'] = Sanitize::text($data['createdByName']);
        }
        if (array_key_exists('assignedProductionMembers', $data)) {
            $row['assigned_production_members'] = Sanitize::json($data['assignedProductionMembers']);
        }
        // Server-stamped from the authenticated caller — never trusted from
        // the request body, unlike createdBy (an established, separate
        // pattern in this repository for the original author).
        $actorId = AuthMiddleware::currentUserId();
        if ($actorId !== null) {
            $row['updated_by'] = (string) $actorId;
        }
        return $row;
    }
}
