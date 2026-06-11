import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useInvoices } from "../../hooks/useInvoices";
import { useToast } from "../../context/ToastContext";
import { Invoice } from "../../types";
import { api } from "../../lib/client";
import { PaymentService } from "../../services/paymentService";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = api.get<{ publishableKey: string }>("/saas/v1/config/stripe")
  .then((res) => res?.publishableKey ? loadStripe(res.publishableKey) : null)
  .catch(() => null);

interface PaymentRecord {
  id: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  method: string;
  transactionId: string;
}

export default function Billing() {
  const { invoices, isLoading: isLoadingInvoices, markAsPaid } = useInvoices();
  const { showToast } = useToast();

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);



  // Checkout modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  const [cardName, setCardName] = useState("");
  const fetchPayments = useCallback(async () => {
    try {
      setIsLoadingPayments(true);
      const data = await api.get<any[]>("/saas/v1/payments/list");

      const formatted: PaymentRecord[] = (data || []).map((p: any) => {
        const inv = invoices.find((i) => i.id === p.invoiceId);
        return {
          id: p.id,
          invoiceNumber: inv ? inv.number : "N/A",
          amount: Number(p.amount),
          date: new Date(p.date || p.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
          method: p.method === "credit-card" ? "Credit Card" : p.method === "bank-transfer" ? "Bank Transfer" : "Other",
          transactionId: p.transactionId,
        };
      });
      setPaymentHistory(formatted);
    } catch (err: any) {
      console.error("Error fetching payments:", err);
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

  const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = totalBilled - totalPaid;

  const handlePaymentClick = (_invoice?: Invoice) => {
    if (_invoice) {
      setSelectedInvoice(_invoice);
      setPaymentAmount(_invoice.amount.toString());
    } else {
      setSelectedInvoice(null);
      setPaymentAmount("");
    }
    setProcessingStep("");
    setIsModalOpen(true);
  };

  const handleStripeSuccess = async (transactionId: string) => {
    if (!selectedInvoice || !paymentAmount) return;
    try {
      const amountValue = parseFloat(paymentAmount);
      await PaymentService.create({
        invoiceId: selectedInvoice.id,
        amount: amountValue,
        method: "credit-card",
        transactionId: transactionId
      });
      await markAsPaid(selectedInvoice.id);
      await fetchPayments();
      showToast("Payment processed successfully!", "success");
      setIsModalOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount("");
    } catch (err: any) {
      showToast(err.message || "Failed to record payment", "error");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };


  if (isLoadingInvoices || isLoadingPayments) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Billing | Optivax Global"
        description="View invoices and payment history."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Billing
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View your invoices and payment status.
          </p>
        </div>
      </div>



      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Invoices
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No invoices found.</p>
              ) : (
                invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition ${selectedInvoice?.id === invoice.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                      }`}
                    onClick={() => handlePaymentClick(invoice)}
                  >
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {invoice.number}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${invoice.amount.toLocaleString()}
                      </p>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${invoice.status === "paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400"
                          : invoice.status === "overdue"
                            ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400"
                          }`}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Summary
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Billed</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${totalBilled.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Paid</span>
                <span className="font-medium text-green-600">${totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding</span>
                <span className="font-medium text-yellow-600">
                  ${outstanding.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Invoices</span>
                <span className="font-medium text-red-600">{pendingInvoices.length}</span>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => handlePaymentClick()}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition"
              >
                Make Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment History
          </h3>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Invoice
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Method
                  </th>
                  <th className="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">
                    Transaction ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                        {payment.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-semibold text-green-600 dark:text-green-400">
                        ${payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {payment.date}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {payment.method}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {payment.transactionId}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 px-4 text-center text-gray-500 dark:text-gray-400">
                      No payments registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Make Payment
          </h2>

          <div className="space-y-4">
            {/* Invoice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Invoice
              </label>
              <select
                value={selectedInvoice?.id || ""}
                onChange={(e) => {
                  const invoice = invoices.find((inv) => inv.id === e.target.value);
                  if (invoice) {
                    setSelectedInvoice(invoice);
                    setPaymentAmount(invoice.amount.toString());
                  } else {
                    setSelectedInvoice(null);
                    setPaymentAmount("");
                  }
                }}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-55"
              >
                <option value="">Choose an invoice...</option>
                {pendingInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.number} - ${invoice.amount}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Amount
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:opacity-55"
                placeholder="Enter amount"
              />
            </div>

            {/* Payment Method Selection */}
            {/* Render Stripe Form directly (Only Stripe allowed) */}
            <Elements stripe={stripePromise}>
              <StripeCheckoutForm
                selectedInvoice={selectedInvoice}
                paymentAmount={paymentAmount}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
                processingStep={processingStep}
                setProcessingStep={setProcessingStep}
                onSuccess={handleStripeSuccess}
                onCancel={() => setIsModalOpen(false)}
                cardName={cardName}
                setCardName={setCardName}
              />
            </Elements>
          </div>
        </div>
      </Modal>
    </>
  );
}

const StripeCheckoutForm = ({
  selectedInvoice,
  paymentAmount,
  isProcessing,
  setIsProcessing,
  processingStep,
  setProcessingStep,
  onSuccess,
  onCancel,
  cardName,
  setCardName
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showToast } = useToast();

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    if (!selectedInvoice || !paymentAmount) return;

    setIsProcessing(true);
    setProcessingStep("Connecting to secure gateway...");

    try {
      // 1. Create Payment Intent
      const intentRes = await api.post<{ clientSecret: string }>("/saas/v1/create-payment-intent", {
        amount: parseFloat(paymentAmount)
      });
      if (!intentRes?.clientSecret) throw new Error("Failed to initialize payment");

      setProcessingStep("Confirming payment...");

      // 2. Confirm Payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const paymentResult = await stripe.confirmCardPayment(intentRes.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardName || undefined,
          }
        }
      });

      if (paymentResult.error) {
        throw new Error(paymentResult.error.message);
      }

      setProcessingStep("Finalizing transaction...");
      
      // 3. Callback success
      onSuccess(paymentResult.paymentIntent.id);
    } catch (err: any) {
      showToast(err.message || "Payment failed", "error");
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative h-44 w-full rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-800 p-6 text-white shadow-xl overflow-hidden mb-2 flex flex-col justify-between transition-all">
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-white/10 blur-md"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-white/10 blur-sm"></div>

        {/* Chip & Brand */}
        <div className="flex justify-between items-start z-10">
          {/* Microchip Graphic */}
          <div className="h-8 w-11 rounded-md bg-yellow-400/90 bg-gradient-to-r from-yellow-300 to-yellow-500 opacity-95 relative overflow-hidden flex flex-col justify-around p-1 shadow">
            <div className="h-px bg-yellow-600/30 w-full"></div>
            <div className="h-px bg-yellow-600/30 w-full"></div>
            <div className="h-px bg-yellow-600/30 w-full"></div>
          </div>
          <div className="text-right">
            <span className="text-sm font-extrabold tracking-widest italic drop-shadow">
              STRIPE SECURE
            </span>
          </div>
        </div>

        {/* Card Number */}
        <div className="text-lg font-bold tracking-widest text-center my-1 font-mono z-10 drop-shadow-sm opacity-90">
          •••• •••• •••• ••••
        </div>

        {/* Card Holder & Expiry */}
        <div className="flex justify-between items-end z-10">
          <div>
            <span className="text-[9px] text-gray-300 uppercase block tracking-widest">Card Holder</span>
            <span className="text-sm font-bold tracking-wide block truncate max-w-[200px] uppercase">
              {cardName.trim() || "YOUR NAME"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-gray-300 uppercase block tracking-widest opacity-80">Powered by Stripe</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Cardholder Name</label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            disabled={isProcessing}
            placeholder="John Doe"
            className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs disabled:opacity-55"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Card Details</label>
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '14px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {isProcessing && processingStep && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center gap-3 border border-blue-100 dark:border-blue-800/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-t-transparent"></div>
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {processingStep}
          </span>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!stripe || !elements || !selectedInvoice || !paymentAmount || isProcessing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isProcessing ? "Processing..." : "Confirm & Pay"}
        </button>
      </div>
    </div>
  );
};

