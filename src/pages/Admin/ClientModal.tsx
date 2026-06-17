import React, { useState, useEffect } from "react";
import { Modal } from "../../components/ui/modal";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { Client } from "../../types";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (clientData: Omit<Client, "id">, password?: string) => Promise<void>;
}

export default function ClientModal({ isOpen, onClose, client, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    status: "active" as "active" | "inactive",
    totalProjects: 0,
    totalBilled: 0,
    joinDate: new Date().toISOString().split("T")[0],
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        address: client.address,
        city: client.city,
        status: client.status,
        totalProjects: client.totalProjects,
        totalBilled: client.totalBilled,
        joinDate: client.joinDate,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        city: "",
        status: "active",
        totalProjects: 0,
        totalBilled: 0,
        joinDate: new Date().toISOString().split("T")[0],
      });
    }
    setPassword("");
    setShowPassword(false);
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client && !password.trim()) {
      setError("Password is required for new clients.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSave(formData, client ? undefined : password);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        {client ? "Edit Client" : "Add New Client"}
      </h3>
      {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Name *</Label>
          <Input name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div>
          <Label>Email *</Label>
          <Input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        {!client && (
          <div>
            <Label>Password * <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(client login password)</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a login password for this client"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
        <div>
          <Label>Phone *</Label>
          <Input name="phone" value={formData.phone} onChange={handleChange} required />
        </div>
        <div>
          <Label>Company *</Label>
          <Input name="company" value={formData.company} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Address *</Label>
            <Input name="address" value={formData.address} onChange={handleChange} required />
          </div>
          <div>
            <Label>City *</Label>
            <Input name="city" value={formData.city} onChange={handleChange} required />
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
            {isSubmitting ? "Saving..." : "Save Client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
