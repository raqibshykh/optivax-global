import { api } from "../lib/client";

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logoDataUrl: string; // base64 data URL, or "" to use default monogram
}

export const COMPANY_DEFAULTS: CompanySettings = {
  name: "Optivax Global",
  tagline: "Digital Marketing Agency",
  address: "",
  city: "Karachi",
  country: "Pakistan",
  phone: "",
  email: "info@optivaxglobal.com",
  website: "www.optivaxglobal.com",
  logoDataUrl: "",
};

const BASE = "/saas/v1/company-settings";

export async function getCompanySettings(): Promise<CompanySettings> {
  const data = await api.get<Partial<CompanySettings>>(BASE);
  return { ...COMPANY_DEFAULTS, ...data };
}

export async function saveCompanySettings(settings: CompanySettings): Promise<void> {
  await api.put(BASE, settings);
}
