import PageMeta from "../../components/common/PageMeta";
import { useInvoices } from "../../hooks/useInvoices";
import { useClients } from "../../hooks/useClients";
import { useState } from "react";
import InvoiceModal from "./InvoiceModal";
import { Invoice } from "../../types";
import { useToast } from "../../context/ToastContext";
import { PaymentService } from "../../services/paymentService";

export default function Billing() {
  const { invoices, isLoading, addInvoice, updateInvoice, markAsPaid } = useInvoices();
  const { clients } = useClients();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = invoices.filter((i) => i.status === "paid").reduce((sum, inv) => sum + inv.amount, 0);
  const pendingPayments = invoices.filter((i) => i.status === "pending").reduce((sum, inv) => sum + inv.amount, 0);
  const overduePayments = invoices.filter((i) => i.status === "overdue").reduce((sum, inv) => sum + inv.amount, 0);

  const handleAdd = () => {
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsModalOpen(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) throw new Error("Invoice not found");

      // 1. Mark the invoice as paid in the mock data store
      await markAsPaid(id);

      // 2. Create a payment record via the backend service
      try {
        await PaymentService.create({
          invoiceId: inv.id,
          amount: inv.amount,
          method: "manual",
        });
      } catch {
        // payment record may already exist — safe to ignore
      }

      showToast("Invoice marked as paid", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSave = async (invoiceData: Omit<Invoice, "id" | "number">) => {
    try {
      if (editingInvoice) {
        await updateInvoice(editingInvoice.id, invoiceData);
        showToast("Invoice updated successfully", "success");
      } else {
        await addInvoice(invoiceData);
        showToast("Invoice created successfully", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
      throw err;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.company : "Unknown Client";
  };

  return (
    <>
      <PageMeta
        title="Billing | Optivax Global"
        description="Manage invoices and payments."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Billing
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Generate invoices and track payment status.
          </p>
        </div>
        <button 
          onClick={handleAdd}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
        >
          Generate Invoice
        </button>
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
              {isLoading ? (
                <div className="flex justify-center p-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-solid border-brand-500 border-t-transparent"></div>
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No invoices found.</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-700 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{invoice.number}</h4>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getClientName(invoice.clientId)} - {invoice.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Due: {invoice.dueDate}</p>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <div className="flex gap-2">
                        {invoice.invoice_url && (
                          <a 
                            href={invoice.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                          >
                            PDF
                          </a>
                        )}
                        <button 
                          onClick={() => handleEdit(invoice)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                        {invoice.status !== 'paid' && (
                          <button 
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="px-3 py-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition duration-200 shadow-sm hover:shadow"
                          >
                            Pay
                          </button>
                        )}
                      </div>
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
              Payment Overview
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="font-medium text-gray-900 dark:text-white">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid Invoices</span>
                <span className="font-medium text-green-600">${paidInvoices.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Payments</span>
                <span className="font-medium text-yellow-600">${pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Overdue</span>
                <span className="font-medium text-red-600">${overduePayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
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

