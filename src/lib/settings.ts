import {
  BaseDirectory,
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

// ---------------------------------------------------------------------------
// Settings schema
// ---------------------------------------------------------------------------
export interface AppSettings {
  // SMTP credentials
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from: string;

  // Eligibility
  eligibility_folder: string;

  // Insurance Email
  ins_to: string;
  ins_cc: string;
  ins_bcc: string;
  ins_body: string;

  // Non-Insurance Email
  non_ins_to: string;
  non_ins_cc: string;
  non_ins_bcc: string;
  non_ins_body: string;
}

export const defaultSettings: AppSettings = {
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_from: "",
  eligibility_folder: "",
  ins_to: "",
  ins_cc: "",
  ins_bcc: "",
  ins_body: "Dear Team,\n\nPlease find the attached insurance approval request with medical report for {insert patient name, MRN] and apply for {all services from the selected services} at the earlist.\n\nKind regards,\n{sender's email name only without domain name}",
  non_ins_to: "",
  non_ins_cc: "",
  non_ins_bcc: "",
  non_ins_body: "Dear Team,\n\nPlease find the attached medical report for {insert patient name, MRN] and provide appropriate referrals and bookings for {all services from the selected services} at the earlist.\n\nKind regards,\n{sender's email name only without domain name}",
};

const SETTINGS_FILE = "settings.json";

// ---------------------------------------------------------------------------
// Load settings from AppData
// ---------------------------------------------------------------------------
export async function loadSettings(): Promise<AppSettings> {
  try {
    const hasFile = await exists(SETTINGS_FILE, {
      baseDir: BaseDirectory.AppData,
    });
    if (hasFile) {
      const raw = await readTextFile(SETTINGS_FILE, {
        baseDir: BaseDirectory.AppData,
      });
      const parsed = JSON.parse(raw);
      
      // Auto-migrate from the old hardcoded default body texts to the new dynamic templates
      const oldInsDefault = "Dear Team,\n\nPlease find the attached insurance approval request.\n\nKind regards,\nNeuropedia";
      const oldNonInsDefault = "Dear Team,\n\nPlease find the attached approval request.\n\nKind regards,\nNeuropedia";
      
      if (parsed.ins_body === oldInsDefault) {
        parsed.ins_body = defaultSettings.ins_body;
      }
      if (parsed.non_ins_body === oldNonInsDefault) {
        parsed.non_ins_body = defaultSettings.non_ins_body;
      }

      return { ...defaultSettings, ...parsed };
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
  return { ...defaultSettings };
}

// ---------------------------------------------------------------------------
// Save settings to AppData
// ---------------------------------------------------------------------------
export async function saveSettings(settings: AppSettings): Promise<void> {
  const dirExists = await exists("", { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
  }
  await writeTextFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}
