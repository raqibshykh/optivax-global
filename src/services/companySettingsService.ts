export const COMPANY_SETTINGS_KEY = "optivax_company_settings";

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
  name:        "Optivax Global",
  tagline:     "Digital Marketing Agency",
  address:     "",
  city:        "Karachi",
  country:     "Pakistan",
  phone:       "",
  email:       "info@optivaxglobal.com",
  website:     "www.optivaxglobal.com",
  logoDataUrl: "",
};

export function getCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_KEY);
    if (raw) {
      return { ...COMPANY_DEFAULTS, ...(JSON.parse(raw) as Partial<CompanySettings>) };
    }
    // Migrate from old profile key if present
    const old = JSON.parse(localStorage.getItem("optivax_profile_settings") ?? "{}") as {
      name?: string;
      email?: string;
    };
    return {
      ...COMPANY_DEFAULTS,
      ...(old.name  ? { name:  old.name  } : {}),
      ...(old.email ? { email: old.email } : {}),
    };
  } catch {
    return { ...COMPANY_DEFAULTS };
  }
}

export function saveCompanySettings(settings: CompanySettings): void {
  localStorage.setItem(COMPANY_SETTINGS_KEY, JSON.stringify(settings));
  // Keep legacy key in sync so other pages reading optivax_profile_settings still work
  try {
    localStorage.setItem(
      "optivax_profile_settings",
      JSON.stringify({ name: settings.name, email: settings.email })
    );
  } catch { /* quota exceeded — non-fatal */ }
}
