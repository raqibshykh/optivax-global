import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Invoice, InvoiceItem, Project } from "../../types";
import { useClients } from "../../hooks/useClients";
import { api } from "../../lib/client";

interface BillingSummary {
  budget: number;
  totalInvoiced: number;
  totalPaid: number;
  remainingBillable: number;
  invoiceCount: number;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSave: (invoiceData: Omit<Invoice, "id" | "number">) => Promise<void>;
}

const defaultItem = (): InvoiceItem => ({
  id: Date.now().toString(),
  description: "",
  quantity: 1,
  rate: 0,
  total: 0,
});

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceModal({ isOpen, onClose, invoice, onSave }: InvoiceModalProps) {
  const { clients } = useClients();

  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    description: "",
    amount: 0,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    items: [defaultItem()] as InvoiceItem[],
  });

  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;
    if (invoice) {
      setFormData({
        clientId: invoice.clientId,
        projectId: invoice.projectId || "",
        description: invoice.description,
        amount: invoice.amount,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes || "",
        items:
          invoice.items.length > 0
            ? invoice.items
            : [defaultItem()],
      });
    } else {
      setFormData({
        clientId: clients.length > 0 ? clients[0].id : "",
        projectId: "",
        description: "",
        amount: 0,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "",
        items: [defaultItem()],
      });
    }
    setError("");
    setBillingSummary(null);
  }, [invoice, isOpen, clients]);

  // Load projects for selected client
  const loadProjects = useCallback(async (clientId: string) => {
    if (!clientId) {
      setClientProjects([]);
      return;
    }
    setIsLoadingProjects(true);
    try {
      const data = await api.get<Project[]>(
        `/saas/v1/projects/list?clientId=${encodeURIComponent(clientId)}`
      );
      setClientProjects(data || []);
    } catch {
      setClientProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadProjects(formData.clientId);
    // Reset project when client changes (only on create, not on initial edit population)
    if (!invoice) {
      setFormData((prev) => ({ ...prev, projectId: "" }));
      setBillingSummary(null);
    }
  }, [formData.clientId, invoice, loadProjects]);

  // Load billing summary for selected project
  useEffect(() => {
    if (!formData.projectId) {
      setBillingSummary(null);
      return;
    }
    setIsLoadingSummary(true);
    api
      .get<BillingSummary>(
        `/saas/v1/projects/billing-summary?projectId=${encodeURIComponent(formData.projectId)}`
      )
      .then((data) => setBillingSummary(data || null))
      .catch(() => setBillingSummary(null))
      .finally(() => setIsLoadingSummary(false));
  }, [formData.projectId]);

  const calculateTotal = (items: InvoiceItem[]) =>
    items.reduce((s, item) => s + item.quantity * item.rate, 0);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, clientId: e.target.value, projectId: "" }));
    setBillingSummary(null);
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        newItems[index].total = newItems[index].quantity * newItems[index].rate;
      }
      return { ...prev, items: newItems, amount: calculateTotal(newItems) };
    });
  };

  const addItem = () =>
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, defaultItem()],
    }));

  const removeItem = (index: number) =>
    setFormData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems, amount: calculateTotal(newItems) };
    });

  // Remaining billable adjusted for edit scenario (current invoice's amount is already counted)
  const maxAllowed = (() => {
    if (!billingSummary) return Infinity;
    if (invoice && invoice.projectId === formData.projectId) {
      return billingSummary.remainingBillable + invoice.amount;
    }
    return billingSummary.remainingBillable;
  })();

  const amountExceeds = formData.amount > maxAllowed && maxAllowed < Infinity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.clientId) {
      setError("Client is required.");
      return;
    }
    if (!formData.projectId) {
      setError("Project is required.");
      return;
    }
    if (formData.amount <= 0) {
      setError("Invoice total must be greater than zero.");
      return;
    }
    if (amountExceeds) {
      setError(
        `Amount $${fmt(formData.amount)} exceeds the remaining billable amount of $${fmt(maxAllowed)} for this project.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        status: invoice ? invoice.status : "pending",
        projectId: formData.projectId || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = clientProjects.find((p) => p.id === formData.projectId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-6">
      <h3 className="mb-1 text-xl font-semibold text-gray-900 dark:text-white">
        {invoice ? "Edit Invoice" : "Generate Invoice"}
      </h3>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        All invoices are sent via Stripe checkout. Manual payment methods are not accepted.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
        {/* ── Client + Project ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Client *</Label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleClientChange}
              required
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Project *</Label>
            <select
              name="projectId"
              value={formData.projectId}
              onChange={handleChange}
              required
              disabled={!formData.clientId || isLoadingProjects}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 disabled:opacity-60"
            >
              <option value="" disabled>
                {isLoadingProjects
                  ? "Loading projects…"
                  : !formData.clientId
                  ? "Select a client first"
                  : clientProjects.length === 0
                  ? "No projects for this client"
                  : "Select a project"}
              </option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Billing summary ──────────────────────────────────────────── */}
        {formData.projectId && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            {isLoadingSummary ? (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-t-transparent" />
                Loading billing summary…
              </div>
            ) : billingSummary ? (
              <>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3 uppercase tracking-wider">
                  {selectedProject?.name} — Billing Summary
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Budget", value: billingSummary.budget, color: "text-gray-900 dark:text-white" },
                    { label: "Total Invoiced", value: billingSummary.totalInvoiced, color: "text-yellow-700 dark:text-yellow-400" },
                    { label: "Total Paid", value: billingSummary.totalPaid, color: "text-green-700 dark:text-green-400" },
                    {
                      label: "Remaining Billable",
                      value: maxAllowed === Infinity ? billingSummary.remainingBillable : maxAllowed,
                      color:
                        (maxAllowed === Infinity ? billingSummary.remainingBillable : maxAllowed) <= 0
                          ? "text-red-700 dark:text-red-400"
                          : "text-blue-700 dark:text-blue-300",
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                        {label}
                      </p>
                      <p className={`text-sm font-bold ${color}`}>${fmt(value)}</p>
                    </div>
                  ))}
                </div>
                {(maxAllowed === Infinity ? billingSummary.remainingBillable : maxAllowed) <= 0 && (
                  <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
                    This project has been fully invoiced. No additional invoices can be created.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Could not load billing summary.
              </p>
            )}
          </div>
        )}

        {/* ── Description + Dates ─────────────────────────────────────── */}
        <div>
          <Label>Description *</Label>
          <Input
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Issue Date *</Label>
            <Input
              type="date"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <Label>Due Date *</Label>
            <Input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* ── Line Items ───────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Invoice Items</h4>
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-brand-500 hover:text-brand-600 font-medium"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={item.id} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label>Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                    required
                  />
                </div>
                <div className="w-20">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity.toString()}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="w-28">
                  <Label>Rate ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step={0.01}
                    value={item.rate.toString()}
                    onChange={(e) => handleItemChange(index, "rate", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="w-24 pb-2 text-right font-medium text-gray-900 dark:text-white text-sm">
                  ${fmt(item.total)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                  className="pb-2 text-red-400 hover:text-red-600 disabled:opacity-30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-right">
              <span className="text-sm text-gray-500 mr-4">Invoice Total</span>
              <span
                className={`text-xl font-bold ${
                  amountExceeds
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                ${fmt(formData.amount)}
              </span>
              {amountExceeds && (
                <p className="text-xs text-red-500 mt-1">
                  Exceeds remaining billable of ${fmt(maxAllowed)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Notes ────────────────────────────────────────────────────── */}
        <div>
          <Label>Notes</Label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 resize-none"
            placeholder="Optional notes for the client…"
          />
        </div>

        {/* ── Stripe notice ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
          <svg
            className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            This invoice will be sent to the client who must pay via Stripe. Cash, check, bank
            transfer, and manual payment methods are not accepted.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || amountExceeds || formData.amount <= 0}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving…" : invoice ? "Update Invoice" : "Generate Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
