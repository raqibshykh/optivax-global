import { useState, useEffect, useCallback } from "react";
import { EmailCampaign, EmailTemplate, EmailAutomation } from "../types";
import { EmailService } from "../services/emailService";
import { useToast } from "../context/ToastContext";

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await EmailService.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      void error;
      showToast("Failed to fetch campaigns", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const addCampaign = async (campaign: Omit<EmailCampaign, "id" | "createdAt" | "updatedAt" | "stats">) => {
    const now = new Date().toISOString();
    const newCamp = await EmailService.createCampaign({ ...campaign, createdAt: now, updatedAt: now, stats: { sent: 0, opened: 0, clicked: 0 } });
    setCampaigns((prev) => [...prev, newCamp]);
    return newCamp;
  };

  const updateCampaign = async (id: string, updates: Partial<EmailCampaign>) => {
    const updated = await EmailService.updateCampaign(id, updates);
    setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCampaign = async (id: string) => {
    await EmailService.deleteCampaign(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  };

  return { campaigns, isLoading, fetchCampaigns, addCampaign, updateCampaign, deleteCampaign };
}

export function useTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await EmailService.getTemplates();
      setTemplates(data);
    } catch (error) {
      void error;
      showToast("Failed to fetch templates", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const addTemplate = async (template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newTpl = await EmailService.createTemplate({ ...template, createdAt: now, updatedAt: now });
    setTemplates((prev) => [...prev, newTpl]);
    return newTpl;
  };

  const updateTemplate = async (id: string, updates: Partial<EmailTemplate>) => {
    const updated = await EmailService.updateTemplate(id, updates);
    setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  };

  const deleteTemplate = async (id: string) => {
    await EmailService.deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return { templates, isLoading, fetchTemplates, addTemplate, updateTemplate, deleteTemplate };
}

export function useAutomations() {
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchAutomations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await EmailService.getAutomations();
      setAutomations(data);
    } catch (error) {
      void error;
      showToast("Failed to fetch automations", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const updateAutomation = async (id: string, updates: Partial<EmailAutomation>) => {
    const updated = await EmailService.updateAutomation(id, updates);
    setAutomations((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  };

  return { automations, isLoading, fetchAutomations, updateAutomation };
}
