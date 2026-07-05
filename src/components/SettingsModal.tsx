import { useState, useEffect } from "react";
import { X, FolderOpen, Eye, EyeOff } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  defaultSettings,
} from "../lib/settings";

interface SettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

type TabType = "general" | "smtp" | "insurance" | "non-insurance";

export function SettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        set("eligibility_folder", selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await saveSettings(settings);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setSettings({ ...defaultSettings });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            className={`tab-btn ${activeTab === "smtp" ? "active" : ""}`}
            onClick={() => setActiveTab("smtp")}
          >
            Email Configuration
          </button>
          <button
            className={`tab-btn ${activeTab === "insurance" ? "active" : ""}`}
            onClick={() => setActiveTab("insurance")}
          >
            Insurance Email
          </button>
          <button
            className={`tab-btn ${activeTab === "non-insurance" ? "active" : ""}`}
            onClick={() => setActiveTab("non-insurance")}
          >
            Non-Insurance Email
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ minHeight: "360px" }}>
          {/* === General Tab === */}
          {activeTab === "general" && (
            <section className="settings-section">
              <h3 className="section-title">General Application Settings</h3>
              <div className="form-group">
                <label>Eligibility Folder</label>
                <div className="input-row">
                  <input
                    type="text"
                    readOnly
                    value={settings.eligibility_folder}
                    placeholder="Click Browse to select a folder…"
                  />
                  <button className="btn btn-ghost" onClick={handleBrowseFolder}>
                    <FolderOpen size={14} /> Browse
                  </button>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Default Font Size</label>
                  <input
                    type="number"
                    min={8}
                    max={72}
                    value={settings.font_size}
                    onChange={(e) =>
                      set("font_size", parseInt(e.target.value) || 12)
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Default Text Color</label>
                  <input
                    type="color"
                    value={settings.font_color}
                    onChange={(e) => set("font_color", e.target.value)}
                    className="color-input"
                  />
                </div>
              </div>
            </section>
          )}

          {/* === Email Configuration Tab === */}
          {activeTab === "smtp" && (
            <section className="settings-section">
              <h3 className="section-title">SMTP Mail Server Settings</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => set("smtp_host", e.target.value)}
                    placeholder="smtp.office365.com"
                  />
                </div>
                <div className="form-group">
                  <label>SMTP Port</label>
                  <input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) =>
                      set("smtp_port", parseInt(e.target.value) || 587)
                    }
                    placeholder="587"
                  />
                </div>
                <div className="form-group">
                  <label>Username / Email</label>
                  <input
                    type="email"
                    value={settings.smtp_username}
                    onChange={(e) => set("smtp_username", e.target.value)}
                    placeholder="you@hospital.com"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-with-icon">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={settings.smtp_password}
                      onChange={(e) => set("smtp_password", e.target.value)}
                      placeholder="••••••••"
                    />
                    <button
                      className="icon-btn"
                      onClick={() => setShowPassword((p) => !p)}
                      title={showPassword ? "Hide" : "Show"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="form-group span-2">
                  <label>From (Sender Email)</label>
                  <input
                    type="email"
                    value={settings.smtp_from}
                    onChange={(e) => set("smtp_from", e.target.value)}
                    placeholder="Neuropedia SmartApproval <you@hospital.com>"
                  />
                </div>
              </div>
            </section>
          )}

          {/* === Insurance Email Tab === */}
          {activeTab === "insurance" && (
            <section className="settings-section">
              <h3 className="section-title">Insurance Recipients & Body</h3>
              <div className="form-group">
                <label>To</label>
                <input
                  type="text"
                  value={settings.ins_to}
                  onChange={(e) => set("ins_to", e.target.value)}
                  placeholder="insurance-approvals@hospital.com"
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Cc</label>
                  <input
                    type="text"
                    value={settings.ins_cc}
                    onChange={(e) => set("ins_cc", e.target.value)}
                    placeholder="cc1@hospital.com; cc2@hospital.com"
                  />
                </div>
                <div className="form-group">
                  <label>Bcc</label>
                  <input
                    type="text"
                    value={settings.ins_bcc}
                    onChange={(e) => set("ins_bcc", e.target.value)}
                    placeholder="bcc@hospital.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email Body Template</label>
                <textarea
                  value={settings.ins_body}
                  onChange={(e) => set("ins_body", e.target.value)}
                  rows={6}
                  placeholder="Dear Team,&#10;Please find the attached insurance approval request."
                />
              </div>
            </section>
          )}

          {/* === Non-Insurance Email Tab === */}
          {activeTab === "non-insurance" && (
            <section className="settings-section">
              <h3 className="section-title">Non-Insurance Recipients & Body</h3>
              <div className="form-group">
                <label>To</label>
                <input
                  type="text"
                  value={settings.non_ins_to}
                  onChange={(e) => set("non_ins_to", e.target.value)}
                  placeholder="general-approvals@hospital.com"
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Cc</label>
                  <input
                    type="text"
                    value={settings.non_ins_cc}
                    onChange={(e) => set("non_ins_cc", e.target.value)}
                    placeholder="cc1@hospital.com; cc2@hospital.com"
                  />
                </div>
                <div className="form-group">
                  <label>Bcc</label>
                  <input
                    type="text"
                    value={settings.non_ins_bcc}
                    onChange={(e) => set("non_ins_bcc", e.target.value)}
                    placeholder="bcc@hospital.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email Body Template</label>
                <textarea
                  value={settings.non_ins_body}
                  onChange={(e) => set("non_ins_body", e.target.value)}
                  rows={6}
                  placeholder="Dear Team,&#10;Please find the attached general approval request."
                />
              </div>
            </section>
          )}

          {saveError && <div className="error-banner">{saveError}</div>}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={handleClear}>
            Clear All
          </button>
          <div className="footer-actions">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
