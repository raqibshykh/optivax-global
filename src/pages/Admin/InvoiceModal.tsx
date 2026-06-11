import React, { useState, useEffect } from "react";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Invoice, InvoiceItem } from "../../types";
import { useClients } from "../../hooks/useClients";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSave: (invoiceData: Omit<Invoice, "id" | "number">) => Promise<void>;
}

export default function InvoiceModal({ isOpen, onClose, invoice, onSave }: InvoiceModalProps) {
  const { clients } = useClients();
  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    description: "",
    amount: 0,
    status: "pending" as Invoice["status"],
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    items: [{ id: Date.now().toString(), description: "", quantity: 1, rate: 0, total: 0 }] as InvoiceItem[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invoice) {
      setFormData({
        clientId: invoice.clientId,
        projectId: invoice.projectId || "",
        description: invoice.description,
        amount: invoice.amount,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes || "",
        items: invoice.items.length > 0 ? invoice.items : [{ id: Date.now().toString(), description: "", quantity: 1, rate: 0, total: 0 }],
      });
    } else {
      setFormData({
        clientId: clients.length > 0 ? clients[0].id : "",
        projectId: "",
        description: "",
        amount: 0,
        status: "pending",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        notes: "",
        items: [{ id: Date.now().toString(), description: "", quantity: 1, rate: 0, total: 0 }],
      });
    }
  }, [invoice, isOpen, clients]);

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'quantity' || field === 'rate') {
        newItems[index].total = newItems[index].quantity * newItems[index].rate;
      }
      return { ...prev, items: newItems, amount: calculateTotal(newItems) };
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now().toString(), description: "", quantity: 1, rate: 0, total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems, amount: calculateTotal(newItems) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        ...formData,
        projectId: formData.projectId || undefined,
      };
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        {invoice ? "Edit Invoice" : "Generate Invoice"}
      </h3>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Client *</Label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="" disabled>Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Input name="description" value={formData.description} onChange={handleChange} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Issue Date</Label>
            <Input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} required />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} required />
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Invoice Items</h4>
            <button type="button" onClick={addItem} className="text-sm text-brand-500 hover:text-brand-600 font-medium">
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
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="w-24">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity.toString()}
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    required
                  />
                </div>
                <div className="w-32">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    min="0"
                    step={0.01}
                    value={item.rate.toString()}
                    onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
                    required
                  />
                </div>
                <div className="w-24 pb-2 text-right font-medium text-gray-900 dark:text-white">
                  ${item.total.toFixed(2)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={formData.items.length === 1}
                  className="pb-2 text-red-500 hover:text-red-700 disabled:opacity-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-right">
              <span className="text-gray-500 mr-4">Total:</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">${formData.amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
