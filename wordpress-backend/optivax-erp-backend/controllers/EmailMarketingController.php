<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Mail\MailService;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\ClientRepository;
use OptivaxERP\Repositories\EmailAutomationRepository;
use OptivaxERP\Repositories\EmailCampaignRepository;
use OptivaxERP\Repositories\EmailTemplateRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/email/* — templates, campaigns, and automations share one
 * frontend service file (src/services/emailService.ts) and one route file
 * (routes/EmailMarketingRoutes.php), so this controller wraps all three
 * repositories behind a single class rather than three near-duplicate ones.
 * Each sub-resource is just a BaseCrudController instance internally — no
 * bespoke logic, all gated on the 'marketing' RBAC domain.
 */
final class EmailMarketingController
{
    private BaseCrudController $templates;
    private BaseCrudController $campaigns;
    private BaseCrudController $automations;

    private EmailCampaignRepository $campaignRepo;
    private EmailTemplateRepository $templateRepo;
    private ClientRepository $clientRepo;

    public function __construct()
    {
        $this->campaignRepo = new EmailCampaignRepository();
        $this->templateRepo = new EmailTemplateRepository();
        $this->clientRepo = new ClientRepository();

        $this->templates = new BaseCrudController($this->templateRepo, 'marketing');
        $this->campaigns = new BaseCrudController($this->campaignRepo, 'marketing');
        $this->automations = new BaseCrudController(new EmailAutomationRepository(), 'marketing');
    }

    // ── Templates ─────────────────────────────────────────────────────────

    public function listTemplates(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->templates->listHandler($request);
    }

    public function createTemplate(\WP_REST_Request $request): \WP_REST_Response
    {
        $errors = Validator::check($request->get_json_params() ?: [], [
            'name' => ['required'],
            'subject' => ['required'],
            'type' => [['in', ['welcome', 'newsletter', 'reminder', 'custom']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return $this->templates->createHandler($request);
    }

    public function updateTemplate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->templates->updateByBodyIdHandler($request);
    }

    public function deleteTemplate(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->templates->deleteByBodyIdHandler($request);
    }

    // ── Campaigns ─────────────────────────────────────────────────────────

    public function listCampaigns(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->listHandler($request);
    }

    public function createCampaign(\WP_REST_Request $request): \WP_REST_Response
    {
        $errors = Validator::check($request->get_json_params() ?: [], [
            'name' => ['required'],
            'subject' => ['required'],
            'status' => [['in', ['draft', 'scheduled', 'sent']]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return $this->campaigns->createHandler($request);
    }

    public function updateCampaign(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->updateByBodyIdHandler($request);
    }

    public function deleteCampaign(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->campaigns->deleteByBodyIdHandler($request);
    }

    /**
     * POST /email/campaigns/send — previously the frontend's "Send Now"
     * button only flipped `status` to "sent" and wrote a hardcoded fake
     * `stats.sent` count; no email ever left the server. This actually
     * queues one message per recipient through the same
     * MailService::queue()/EmailQueueWorker pipeline already used (and
     * proven working) for password-reset mail — see MailService::queueRaw(),
     * added alongside this for campaign content specifically, since a
     * campaign's body is user-authored HTML already sitting in the DB, not
     * one of the mail/templates/*.php files queue() normally renders.
     *
     * Recipients: clients tagged with any of the campaign's audienceTags,
     * or — matching the frontend's own confirm-dialog wording ("Send
     * campaign to all recipients now?") — every client with an email, when
     * no audience tag is set (true today: the Create Campaign UI has no tag
     * picker, so audienceTags is always empty).
     */
    public function sendCampaign(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize('marketing', 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }

        $campaign = $this->campaignRepo->find((string) $id);
        if (!$campaign) {
            return ApiResponse::notFound();
        }
        if (($campaign['status'] ?? '') === 'sent') {
            return ApiResponse::error('This campaign has already been sent.', 409);
        }

        $template = $campaign['templateId'] ? $this->templateRepo->find((string) $campaign['templateId']) : null;
        if (!$template) {
            return ApiResponse::validationError('This campaign\'s template no longer exists — select a template before sending.');
        }

        $audienceTags = is_array($campaign['audienceTags'] ?? null) ? $campaign['audienceTags'] : [];
        $clients = $this->clientRepo->list();
        $recipients = array_filter($clients, function (array $client) use ($audienceTags) {
            if (empty($client['email'])) {
                return false;
            }
            if (empty($audienceTags)) {
                return true; // No tag filter set — matches the UI's own "send to all recipients" wording.
            }
            $clientTags = is_array($client['tags'] ?? null) ? $client['tags'] : [];
            return count(array_intersect($audienceTags, $clientTags)) > 0;
        });

        foreach ($recipients as $client) {
            MailService::queueRaw((string) $client['email'], (string) $campaign['subject'], (string) $template['content']);
        }

        $sentCount = count($recipients);
        $updated = $this->campaignRepo->update((string) $id, [
            'status' => 'sent',
            'sentDate' => current_time('mysql', true),
            'stats' => ['sent' => $sentCount, 'opened' => 0, 'clicked' => 0],
        ]);

        return ApiResponse::ok($updated);
    }

    // ── Automations ───────────────────────────────────────────────────────
    // No deleteAutomation() — src/services/emailService.ts has no delete
    // endpoint for automations, so none is wired in the route file either.

    public function listAutomations(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->automations->listHandler($request);
    }

    public function createAutomation(\WP_REST_Request $request): \WP_REST_Response
    {
        $errors = Validator::check($request->get_json_params() ?: [], [
            'name' => ['required'],
            'triggerType' => ['required', ['in', ['new_client', 'invoice_overdue', 'project_complete']]],
            'status' => [['in', ['active', 'inactive']]],
            'delayHours' => ['numeric', ['min', 0]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }
        return $this->automations->createHandler($request);
    }

    public function updateAutomation(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->automations->updateByBodyIdHandler($request);
    }
}
