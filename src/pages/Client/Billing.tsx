import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useInvoices } from "../../hooks/useInvoices";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { Invoice } from "../../types";
import { api } from "../../lib/client";
import { InvoiceService } from "../../services/invoiceService";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  date: string;
  method: string;
  transactionId: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
}

interface RawPayment {
  id: string;
  invoiceId: string;
  amount: number | string;
  currency?: string;
  method: string;
  date?: string;
  paidAt?: string;
  created_at?: string;
  transactionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
}

export default function Billing() {
  const { invoices, isLoading: isLoadingInvoices, refreshInvoices } = useInvoices();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  useEffect(() => {
    api
      .get<{ publishableKey: string }>("/saas/v1/config/stripe")
      .then((res) => {
        if (res?.publishableKey) setStripePromise(loadStripe(res.publishableKey));
      })
      .catch(() => {});
  }, []);

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  // Receipt side panel
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const allData = await api.get<RawPayment[]>("/saas/v1/payments/list");
      const myInvoiceIds = new Set(invoices.map((i) => i.id));
      const data = (allData || []).filter((p) => myInvoiceIds.has(p.invoiceId));

      const formatted: PaymentRecord[] = data.map((p) => {
        const inv = invoices.find((i) => i.id === p.invoiceId);
        return {
          id: p.id,
          invoiceId: p.invoiceId,
          invoiceNumber: inv ? inv.number : "N/A",
          amount: Number(p.amount),
          currency: (p.currency || "usd").toUpperCase(),
          date: new Date(p.paidAt ?? p.date ?? p.created_at ?? "").toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          method: p.method === "credit-card" ? "Credit Card (Stripe)" : p.method,
          transactionId: p.transactionId ?? "",
          stripePaymentIntentId: p.stripePaymentIntentId,
          stripeChargeId: p.stripeChargeId,
        };
      });
      setPaymentHistory(formatted);
    } catch {
      // payment history is non-critical
    } finally {
      setIsLoadingPayments(false);
    }
  }, [invoices]);

  useEffect(() => {
    if (invoices.length > 0) {
      fetchPayments();
    } else if (!isLoadingInvoices) {
      setPaymentHistory([]);
      setIsLoadingPayments(false);
    }
  }, [invoices, isLoadingInvoices, fetchPayments]);

  const pendingInvoices = invoices.filter(
    (inv) => inv.status === "pending" || inv.status === "overdue" || inv.status === "partially_paid"
  );
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = totalBilled - totalPaid;

  const openCheckout = (invoice: Invoice) => {
    setCheckoutInvoice(invoice);
    setReceiptInvoice(null);
    setProcessingStep("");
    setIsCheckoutOpen(true);
  };

  const openReceipt = (invoice: Invoice) => {
    setReceiptInvoice(invoice);
    setCheckoutInvoice(null);
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    if (invoice.status === "paid") {
      openReceipt(invoice);
    } else {
      openCheckout(invoice);
    }
  };

  const getInvoicePayableAmount = (invoice: Invoice): number =>
    invoice.remainingBalance != null ? invoice.remainingBalance : invoice.amount;

  const handleStripeConfirmSuccess = async (piId: string, chargeId: string) => {
    if (!checkoutInvoice) return;
    try {
      await InvoiceService.stripeConfirm({
        invoiceId: checkoutInvoice.id,
        stripePaymentIntentId: piId,
        stripeChargeId: chargeId,
        amount: getInvoicePayableAmount(checkoutInvoice),
        currency: "usd",
        paidByUserId: user?.id || "",
      });
      await refreshInvoices();
      await fetchPayments();
      showToast("Payment successful! Your invoice has been paid.", "success");
      setIsCheckoutOpen(false);
      setCheckoutInvoice(null);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "Payment confirmation failed",
        "error"
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  if (isLoadingInvoices || isLoadingPayments) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const receiptPayment = receiptInvoice
    ? paymentHistory.find((p) => p.invoiceId === receiptInvoice.id)
    : null;

  return (
    <>
      <PageMeta title="Billing | Optivax Global" description="View invoices and payment history." />

      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Billing</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View your invoices and payment status.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Invoice List ─────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoices</h3>
          </div>
          <div className="p-6 space-y-3">
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No invoices found.</p>
            ) : (
              invoices.map((invoice) => {
                const isPaid = invoice.status === "paid";
                const isSelected =
                  receiptInvoice?.id === invoice.id || checkoutInvoice?.id === invoice.id;
                return (
                  <div
                    key={invoice.id}
                    onClick={() => handleInvoiceClick(invoice)}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition ${
                      isSelected
                        ? isPaid
                          ? "border-green-400 bg-green-50 dark:bg-green-900/10 dark:border-green-600"
                          : "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400"
                        : isPaid
                        ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/5 hover:border-green-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {invoice.number}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            isPaid
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400"
                              : invoice.status === "overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                              : invoice.status === "partially_paid"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400"
                          }`}
                        >
                          {invoice.status === "partially_paid" ? "Partial" : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                        {invoice.status === "partially_paid" && invoice.remainingBalance != null && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            ${invoice.remainingBalance.toLocaleString()} remaining
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {invoice.description}
                      </p>
                      {invoice.dueDate && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Due:{" "}
                          {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        ${invoice.amount.toLocaleString()}
                      </p>
                      {isPaid ? (
                        <span className="text-xs text-green-600 dark:text-green-400 mt-0.5 block">
                          View Receipt →
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCheckout(invoice);
                          }}
                          className="mt-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition"
                        >
                          Pay Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Receipt / Summary ───────────────────────────────── */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {receiptInvoice ? (
            <>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Receipt
                </h3>
                <button
                  onClick={() => setReceiptInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                {/* Success checkmark */}
                <div className="flex flex-col items-center mb-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                    <svg
                      className="w-7 h-7 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    Payment Successful
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Invoice</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {receiptInvoice.number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${receiptInvoice.amount.toLocaleString()}
                    </span>
                  </div>
                  {receiptPayment ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Currency</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {receiptPayment.currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Paid Date</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {receiptPayment.date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Method</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {receiptPayment.method}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Payment Intent ID
                        </p>
                        <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                          {receiptPayment.stripePaymentIntentId || receiptPayment.transactionId}
                        </p>
                      </div>
                      {receiptPayment.stripeChargeId && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Charge ID
                          </p>
                          <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                            {receiptPayment.stripeChargeId}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">Paid</span>
                      </div>
                      {receiptInvoice.paidDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Paid Date</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(receiptInvoice.paidDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        This invoice was processed offline.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Payment Summary
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Billed</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${totalBilled.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Paid</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    ${totalPaid.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding</span>
                  <span
                    className={`font-medium ${
                      outstanding > 0
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    ${outstanding.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending Invoices</span>
                  <span
                    className={`font-medium ${
                      pendingInvoices.length > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {pendingInvoices.length}
                  </span>
                </div>
                {pendingInvoices.length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      You have {pendingInvoices.length} unpaid invoice
                      {pendingInvoices.length !== 1 ? "s" : ""}. Click an invoice to pay with
                      Stripe.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Payment History Table ─────────────────────────────────────────────── */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Invoice", "Amount", "Currency", "Date", "Method", "Payment Intent ID", "Charge ID"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                        {payment.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-green-600 dark:text-green-400">
                        ${payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {payment.currency}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {payment.date}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {payment.method}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {payment.stripePaymentIntentId || payment.transactionId || "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {payment.stripeChargeId || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 px-4 text-center text-gray-500 dark:text-gray-400"
                    >
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Stripe Checkout Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => {
          if (!isProcessing) setIsCheckoutOpen(false);
        }}
        className="max-w-md"
      >
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Pay Invoice</h2>
          {checkoutInvoice && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {checkoutInvoice.number} ·{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                ${checkoutInvoice.amount.toLocaleString()}
              </span>
            </p>
          )}
          <Elements stripe={stripePromise}>
            <StripeCheckoutForm
              invoice={checkoutInvoice}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
              processingStep={processingStep}
              setProcessingStep={setProcessingStep}
              onSuccess={handleStripeConfirmSuccess}
              onCancel={() => setIsCheckoutOpen(false)}
            />
          </Elements>
        </div>
      </Modal>
    </>
  );
}

// ── Stripe Checkout Form ──────────────────────────────────────────────────────

interface StripeCheckoutFormProps {
  invoice: Invoice | null;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  processingStep: string;
  setProcessingStep: (v: string) => void;
  onSuccess: (piId: string, chargeId: string) => void;
  onCancel: () => void;
}

const StripeCheckoutForm = ({
  invoice,
  isProcessing,
  setIsProcessing,
  processingStep,
  setProcessingStep,
  onSuccess,
  onCancel,
}: StripeCheckoutFormProps) => {
  // useStripe / useElements are available for CardElement rendering
  useStripe();
  useElements();

  const { showToast } = useToast();
  const [cardName, setCardName] = useState("");

  const handleSubmit = async () => {
    if (!invoice) return;
    if (!cardName.trim()) {
      showToast("Please enter the cardholder name", "error");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Initializing secure payment...");

    try {
      // Step 1: Create Payment Intent on mock server → get paymentIntentId
      const intentRes = await api.post<{ clientSecret: string; paymentIntentId: string }>(
        "/saas/v1/create-payment-intent",
        { amount: invoice.amount, invoiceId: invoice.id }
      );
      if (!intentRes?.paymentIntentId) throw new Error("Failed to initialize payment session");

      setProcessingStep("Processing card payment...");

      // Step 2: Simulate Stripe network round-trip (mock environment)
      // Production: stripe.confirmCardPayment(intentRes.clientSecret, { payment_method: { card: cardElement } })
      await new Promise<void>((resolve) => setTimeout(resolve, 1400));

      setProcessingStep("Confirming with payment server...");

      // Step 3: Invoke atomic stripe-confirm (webhook equivalent)
      const chargeId = `ch_mock_${Date.now()}`;
      onSuccess(intentRes.paymentIntentId, chargeId);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Payment failed", "error");
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Card visual */}
      <div className="relative h-44 w-full rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-800 p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between">
        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-white/10 blur-md" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/10 blur-sm" />
        <div className="flex justify-between items-start z-10">
          <div className="h-8 w-11 rounded-md bg-gradient-to-r from-yellow-300 to-yellow-500 flex flex-col justify-around p-1 shadow">
            <div className="h-px bg-yellow-600/30 w-full" />
            <div className="h-px bg-yellow-600/30 w-full" />
            <div className="h-px bg-yellow-600/30 w-full" />
          </div>
          <span className="text-sm font-extrabold tracking-widest italic drop-shadow">
            STRIPE SECURE
          </span>
        </div>
        <div className="text-lg font-bold tracking-widest text-center font-mono z-10 opacity-90">
          •••• •••• •••• ••••
        </div>
        <div className="flex justify-between items-end z-10">
          <div>
            <span className="text-[9px] text-gray-300 uppercase block tracking-widest">
              Card Holder
            </span>
            <span className="text-sm font-bold tracking-wide block uppercase truncate max-w-[180px]">
              {cardName.trim() || "YOUR NAME"}
            </span>
          </div>
          <span className="text-[9px] text-gray-300 uppercase tracking-widest opacity-80">
            Powered by Stripe
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            disabled={isProcessing}
            placeholder="John Doe"
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
            Card Details
          </label>
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "14px",
                    color: "#424770",
                    "::placeholder": { color: "#aab7c4" },
                  },
                  invalid: { color: "#9e2146" },
                },
              }}
            />
          </div>
        </div>
      </div>

      {invoice && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <span className="text-sm text-blue-700 dark:text-blue-300">Amount to charge</span>
          <span className="text-lg font-bold text-blue-800 dark:text-blue-200">
            ${invoice.amount.toLocaleString()}
          </span>
        </div>
      )}

      {isProcessing && processingStep && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-3 border border-blue-100 dark:border-blue-800/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-t-transparent shrink-0" />
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {processingStep}
          </span>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!invoice || isProcessing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
        >
          {isProcessing ? "Processing..." : `Pay $${invoice?.amount.toLocaleString() ?? ""}`}
        </button>
      </div>
    </div>
  );
};
