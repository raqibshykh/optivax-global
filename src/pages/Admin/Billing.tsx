import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useInvoices } from "../../hooks/useInvoices";
import { useClients } from "../../hooks/useClients";
import { Invoice } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/client";
import InvoiceModal from "./InvoiceModal";
import { notifyInvoiceCreated, notifyInvoiceUpdated } from "../../services/notificationHelpers";

interface StripePayment {
  id: string;
  invoiceId: string;
  amount: number;
  currency?: string;
  paidAt?: string;
  date?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  method?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Billing() {
  const { invoices, isLoading, addInvoice, updateInvoice } = useInvoices();
  const { clients } = useClients();
  const { showToast } = useToast();
  const { user, checkPermission } = useAuth();

  const canEditInvoice   = checkPermission("billing", "EDIT");
  const canCreateInvoice = checkPermission("billing", "CREATE");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Stripe payment records
  const [stripePayments, setStripePayments] = useState<StripePayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  const fetchStripePayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const data = await api.get<StripePayment[]>("/saas/v1/payments/list");
      // Only show Stripe-confirmed payments (those with a paymentIntentId)
      setStripePayments((data || []).filter((p) => p.stripePaymentIntentId));
    } catch {
      setStripePayments([]);
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  useEffect(() => {
    fetchStripePayments();
  }, [fetchStripePayments]);

  // Refresh payments after invoice list changes (e.g. after stripe-confirm webhook)
  useEffect(() => {
    if (!isLoading) fetchStripePayments();
  }, [isLoading, fetchStripePayments]);

  // Stats
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.amount, 0);
  const stripeRevenue = stripePayments.reduce((s, p) => s + p.amount, 0);
  const pendingAmount = invoices
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + i.amount, 0);
  const overdueAmount = invoices
    .filter((i) => i.status === "overdue")
    .reduce((s, i) => s + i.amount, 0);

  const handleAdd = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleSave = async (invoiceData: Omit<Invoice, "id" | "number">) => {
    try {
      if (editingInvoice) {
        const updatedInvoice = await updateInvoice(editingInvoice.id, invoiceData);
        if (user && updatedInvoice) {
          notifyInvoiceUpdated(user.id, user.name, user.role, invoiceData.clientId, getClientName(invoiceData.clientId), editingInvoice.number);
        }
        showToast("Invoice updated successfully", "success");
      } else {
        const newInvoice = await addInvoice(invoiceData);
        if (user && newInvoice) {
          notifyInvoiceCreated(user.id, user.name, user.role, invoiceData.clientId, getClientName(invoiceData.clientId), newInvoice.number, invoiceData.amount);
        }
        showToast("Invoice created successfully", "success");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save invoice", "error");
      throw err;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.company || client.name : "Unknown Client";
  };

  const getStripePayment = (invoiceId: string) =>
    stripePayments.find((p) => p.invoiceId === invoiceId);

  return (
    <>
      <PageMeta title="Billing | Optivax Global" description="Manage invoices and Stripe payments." />

      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Billing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate invoices. Clients pay via Stripe. No manual payment methods.
          </p>
        </div>
        {canCreateInvoice && (
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Invoice
          </button>
        )}
      </div>

      {/* ── Overview stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {[
          { label: "Total Invoiced", value: totalInvoiced, color: "text-gray-900 dark:text-white" },
          {
            label: "Collected via Stripe",
            value: stripeRevenue,
            color: "text-green-600 dark:text-green-400",
            note: isLoadingPayments ? "loading…" : `${stripePayments.length} payment${stripePayments.length !== 1 ? "s" : ""}`,
          },
          { label: "Pending", value: pendingAmount, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Overdue", value: overdueAmount, color: "text-red-600 dark:text-red-400" },
        ].map(({ label, value, color, note }) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className={`text-xl font-bold ${color}`}>${fmt(value)}</p>
            {note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Invoice list ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoices</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {invoices.length} total
            </span>
          </div>
          <div className="p-6 space-y-3">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand-500 border-t-transparent" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No invoices yet.</p>
                {canCreateInvoice && (
                  <button
                    onClick={handleAdd}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Generate your first invoice →
                  </button>
                )}
              </div>
            ) : (
              invoices.map((invoice) => {
                const stripePayment = getStripePayment(invoice.id);
                const isPaid = invoice.status === "paid";
                return (
                  <div
                    key={invoice.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-700 gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {invoice.number}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-semibold ${
                            isPaid
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400"
                              : invoice.status === "overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400"
                          }`}
                        >
                          {invoice.status}
                        </span>
                        {isPaid && stripePayment && (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-400 font-semibold">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Stripe
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {getClientName(invoice.clientId)}
                        {invoice.description ? ` — ${invoice.description}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Due: {invoice.dueDate}
                        {stripePayment?.stripePaymentIntentId && (
                          <span className="ml-2 font-mono text-indigo-400">
                            {stripePayment.stripePaymentIntentId.slice(0, 24)}…
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${fmt(invoice.amount)}
                      </p>
                      <div className="flex gap-2">
                        {invoice.invoice_url && (
                          <a
                            href={invoice.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                          >
                            PDF
                          </a>
                        )}
                        {canEditInvoice && !isPaid && (
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition"
                          >
                            Edit
                          </button>
                        )}
                        {isPaid && (
                          <span className="px-2 py-1 text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Paid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Stripe payments panel ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Stripe Payments
            </h3>
          </div>
          <div className="p-4">
            {isLoadingPayments ? (
              <div className="flex justify-center p-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-indigo-500 border-t-transparent" />
              </div>
            ) : stripePayments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No Stripe payments yet.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Clients pay via Stripe Checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stripePayments.map((payment) => {
                  const inv = invoices.find((i) => i.id === payment.invoiceId);
                  return (
                    <div
                      key={payment.id}
                      className="p-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-900/10"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {inv?.number || payment.invoiceId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {payment.paidAt
                              ? new Date(payment.paidAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : payment.date}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                          ${fmt(payment.amount)}
                        </p>
                      </div>
                      {payment.stripePaymentIntentId && (
                        <p className="mt-1.5 text-[10px] font-mono text-indigo-500 dark:text-indigo-400 break-all">
                          {payment.stripePaymentIntentId}
                        </p>
                      )}
                      {payment.stripeChargeId && (
                        <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 break-all">
                          {payment.stripeChargeId}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={editingInvoice}
        onSave={handleSave}
      />
    </>
  );
}
