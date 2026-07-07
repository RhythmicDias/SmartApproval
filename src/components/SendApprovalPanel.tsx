import { useState, useEffect } from "react";
import { Send, FolderOpen, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { openPath } from "@tauri-apps/plugin-opener";
import { sendEmail, type EmailPayload } from "../lib/emailService";
import type { AppSettings } from "../lib/settings";
import { basename } from "../lib/helpers";

interface SendApprovalPanelProps {
  mergedFilePath: string | null;
  subject: string;
  settings: AppSettings;
  downloadsPath: string;
  patientName?: string;
  mrn?: string;
  services?: string;
}

type SendStatus = "idle" | "sending" | "success" | "error";

export function SendApprovalPanel({
  mergedFilePath,
  subject,
  settings,
  downloadsPath,
  patientName,
  mrn,
  services,
}: SendApprovalPanelProps) {
  const [editSubject, setEditSubject] = useState(subject);
  const [isInsurance, setIsInsurance] = useState(true);
  const [status, setStatus] = useState<SendStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [bccAmanSec, setBccAmanSec] = useState(false);
  const [bccArifSec, setBccArifSec] = useState(false);

  // Sync state values when props change
  useEffect(() => {
    setEditSubject(subject);
  }, [subject]);

  const handleSend = async () => {
    if (!mergedFilePath) return;
    setStatus("sending");
    setStatusMsg("");

    const extraBccList: string[] = [];
    if (bccAmanSec && settings.sec_aman_email) {
      extraBccList.push(settings.sec_aman_email.trim());
    }
    if (bccArifSec && settings.sec_arif_email) {
      extraBccList.push(settings.sec_arif_email.trim());
    }

    const payload: EmailPayload = {
      subject: editSubject,
      attachmentPath: mergedFilePath,
      isInsurance: isInsurance,
      patientName,
      mrn,
      services,
      extraBcc: extraBccList.length > 0 ? extraBccList.join(";") : undefined,
    };

    const result = await sendEmail(settings, payload);
    setStatus(result.success ? "success" : "error");
    setStatusMsg(result.message);
  };

  const openFile = async () => {
    if (!mergedFilePath) return;
    try {
      await openPath(mergedFilePath);
    } catch (e) {
      console.error(e);
    }
  };

  const openFolder = async () => {
    try {
      await openPath(downloadsPath);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="send-panel">
      {/* Merged file display */}
      <div className="merged-file-row">
        <FileText size={16} className="merged-icon" />
        <span className="merged-filename">
          {mergedFilePath ? basename(mergedFilePath) : "No file prepared yet"}
        </span>
        <div className="merged-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={openFile}
            disabled={!mergedFilePath}
            title="Open merged PDF"
          >
            Open File
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={openFolder}
            title="Open Downloads folder"
          >
            <FolderOpen size={14} />
          </button>
        </div>
      </div>

      {/* Email fields */}
      <div className="email-fields">
        <div className="email-field-row">
          <label className="email-label">Subject</label>
          <input
            className="email-input"
            type="text"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>
      </div>

      {/* BCC Secretary Checkboxes */}
      <div className="email-field-row" style={{ display: "flex", gap: "20px", paddingLeft: "60px", marginTop: "4px", marginBottom: "4px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={bccAmanSec}
            onChange={(e) => setBccAmanSec(e.target.checked)}
            style={{ width: "auto", cursor: "pointer", accentColor: "var(--primary)" }}
          />
          Dr. Aman's Sec
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
          <input
            type="checkbox"
            checked={bccArifSec}
            onChange={(e) => setBccArifSec(e.target.checked)}
            style={{ width: "auto", cursor: "pointer", accentColor: "var(--primary)" }}
          />
          Dr. Arif's Sec
        </label>
      </div>

      {/* Segmented Selection & Status & Send button */}
      <div className="send-row" style={{ marginTop: "6px" }}>
        <div className="toggle-group" style={{ display: "inline-flex", background: "var(--bg-surface)", padding: "2px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginRight: "auto" }}>
          <button
            className={`btn btn-sm ${isInsurance ? "btn-primary" : "btn-ghost"}`}
            style={{ border: "none", background: isInsurance ? "var(--primary)" : "transparent", color: isInsurance ? "#fff" : "var(--text-secondary)" }}
            onClick={() => { setIsInsurance(true); setStatus("idle"); }}
          >
            Insurance
          </button>
          <button
            className={`btn btn-sm ${!isInsurance ? "btn-primary" : "btn-ghost"}`}
            style={{ border: "none", background: !isInsurance ? "var(--primary)" : "transparent", color: !isInsurance ? "#fff" : "var(--text-secondary)" }}
            onClick={() => { setIsInsurance(false); setStatus("idle"); }}
          >
            Non-Insurance
          </button>
        </div>

        {status === "success" && (
          <div className="status-badge success" style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <CheckCircle size={14} /> {statusMsg}
          </div>
        )}
        {status === "error" && (
          <div className="status-badge error" style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <XCircle size={14} /> {statusMsg}
          </div>
        )}
        <button
          className="btn btn-primary btn-send"
          onClick={handleSend}
          disabled={!mergedFilePath || status === "sending"}
        >
          {status === "sending" ? (
            <><Loader2 size={16} className="spin" /> Sending…</>
          ) : (
            <><Send size={16} /> Send for Approval</>
          )}
        </button>
      </div>
    </div>
  );
}
