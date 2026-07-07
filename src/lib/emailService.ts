import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "./settings";

export interface EmailPayload {
  subject: string;
  attachmentPath: string;
  isInsurance: boolean;
  patientName?: string;
  mrn?: string;
  services?: string;
  extraBcc?: string;
}

export interface EmailResult {
  success: boolean;
  message: string;
}

// Helper to replace email template placeholders dynamically
export function formatEmailBody(
  template: string,
  patientName: string,
  mrn: string,
  services: string,
  senderEmail: string
): string {
  const senderNamePart = senderEmail.split("@")[0] || "";
  const senderName = senderNamePart
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Clean underscores from patient name for nicer display in the email body
  const cleanPatientName = patientName.replace(/_/g, " ");

  // Format replacements with bold HTML tags
  const boldPatientAndMrn = `<strong>${cleanPatientName}, ${mrn}</strong>`;
  const boldServices = `<strong>${services}</strong>`;
  const boldSenderName = `<strong>${senderName}</strong>`;

  let body = template;

  // Replace patient details placeholder (supporting the bracket typo "{insert patient name, MRN]")
  body = body.replace(/\{insert patient name, MRN\]/gi, boldPatientAndMrn);
  body = body.replace(/\{insert patient name, MRN\}/gi, boldPatientAndMrn);
  body = body.replace(/\{patient_name\}/gi, `<strong>${cleanPatientName}</strong>`);
  body = body.replace(/\{patient name\}/gi, `<strong>${cleanPatientName}</strong>`);
  body = body.replace(/\{mrn\}/gi, `<strong>${mrn}</strong>`);
  body = body.replace(/\{MRN\}/gi, `<strong>${mrn}</strong>`);

  // Replace services placeholder
  body = body.replace(/\{all services from the selected services\}/gi, boldServices);
  body = body.replace(/\{services\}/gi, boldServices);

  // Replace sender name placeholder
  body = body.replace(/\{sender's email name only without domain name\}/gi, boldSenderName);
  body = body.replace(/\{sender_name\}/gi, boldSenderName);
  body = body.replace(/\{sender name\}/gi, boldSenderName);

  // Convert plain text newlines to HTML paragraphs
  const htmlParagraphs = body
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => p.replace(/\n/g, "<br />"))
    .map((p) => `<p style="margin: 0 0 16px 0;">${p}</p>`)
    .join("");

  // Wrap the entire message in a styled container using premium system fonts
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #2d3748; max-width: 650px; margin: 0 auto; padding: 10px 0;">
      ${htmlParagraphs}
      <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 11px; font-style: italic; color: #718096; line-height: 1.4;">
        Auto-generated with SmartApproval by Stephen Dias
      </div>
    </div>
  `.trim();
}

// ---------------------------------------------------------------------------
// Dispatch email via SMTP (Rust lettre command)
// ---------------------------------------------------------------------------
export async function sendEmail(
  settings: AppSettings,
  payload: EmailPayload
): Promise<EmailResult> {
  const { subject, attachmentPath, isInsurance } = payload;

  if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
    return {
      success: false,
      message:
        "SMTP is not configured. Please open Settings and fill in SMTP credentials.",
    };
  }

  if (!settings.smtp_from) {
    return {
      success: false,
      message: "Sender email (From) is not set. Please configure it in Settings.",
    };
  }

  // Select target list based on Insurance / Non-insurance selection
  const to = isInsurance ? settings.ins_to : settings.non_ins_to;
  const cc = isInsurance ? settings.ins_cc : settings.non_ins_cc;
  let bcc = isInsurance ? settings.ins_bcc : settings.non_ins_bcc;
  if (payload.extraBcc) {
    bcc = bcc.trim() ? `${bcc};${payload.extraBcc}` : payload.extraBcc;
  }
  let body = isInsurance ? settings.ins_body : settings.non_ins_body;

  // Format the body dynamically if placeholders/values are present
  if (payload.patientName || payload.mrn || payload.services) {
    const pName = payload.patientName || "";
    const pMrn = payload.mrn || "";
    const pServices = payload.services || "";
    const senderEmail = settings.smtp_from || settings.smtp_username || "";
    body = formatEmailBody(body, pName, pMrn, pServices, senderEmail);
  }

  if (!to.trim()) {
    return {
      success: false,
      message: `No recipient (To) specified for ${isInsurance ? "Insurance" : "Non-Insurance"} approval.`,
    };
  }

  try {
    const result = await invoke<string>("send_email_smtp", {
      from: settings.smtp_from,
      to: to,
      cc: cc,
      bcc: bcc,
      subject,
      body: body,
      attachmentPath,
      smtp: {
        host: settings.smtp_host,
        port: settings.smtp_port,
        username: settings.smtp_username,
        password: settings.smtp_password,
      },
    });
    return { success: true, message: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Email failed: ${msg}` };
  }
}
