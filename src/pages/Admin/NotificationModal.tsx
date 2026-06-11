import React, { useState } from "react";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Notification } from "../../types";
import { useClients } from "../../hooks/useClients";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (notificationData: Omit<Notification, "id">) => Promise<void>;
}

export default function NotificationModal({ isOpen, onClose, onSend }: NotificationModalProps) {
  const { clients } = useClients();
  const [formData, setFormData] = useState({
    userId: "",
    type: "system" as Notification["type"],
    title: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await onSend({
        ...formData,
        read: false,
        createdAt: new Date().toISOString(),
      });
      onClose();
      // Reset form
      setFormData({
        userId: "",
        type: "system",
        title: "",
        message: "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to send notification");
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        Send Notification
      </h3>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Recipient (Client) *</Label>
          <select
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="" disabled>Select a recipient</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.company})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <Label>Type *</Label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="system">System</option>
            <option value="project">Project Update</option>
            <option value="invoice">Invoice / Billing</option>
          </select>
        </div>

        <div>
          <Label>Title *</Label>
          <Input name="title" value={formData.title} onChange={handleChange} required />
        </div>

        <div>
          <Label>Message *</Label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            required
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
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
            {isSubmitting ? "Sending..." : "Send Notification"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
