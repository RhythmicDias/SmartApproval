import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { Settings, Info, Plus, Trash2, FolderOpen } from "lucide-react";
import { openPath } from "@tauri-apps/plugin-opener";

import { DragDropList } from "./components/DragDropList";
import { SendApprovalPanel } from "./components/SendApprovalPanel";
import { SettingsModal } from "./components/SettingsModal";
import { AboutModal } from "./components/AboutModal";

import { mergePdfs } from "./lib/pdfEngine";
import { loadSettings, type AppSettings, defaultSettings } from "./lib/settings";
import { buildSubject, buildMergedFileName, extractInfoFromFilename, isNewerVersion } from "./lib/helpers";



function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [downloadsPath, setDownloadsPath] = useState("");
  const [mergedFilePath, setMergedFilePath] = useState<string | null>(null);
  const [mergeSubject, setMergeSubject] = useState("");
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  // Load settings and downloads path on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
    });
    invoke<string>("get_downloads_path").then(setDownloadsPath);

    // Auto check updates on launch
    const checkUpdatesOnLaunch = async () => {
      try {
        const res = await fetch("https://api.github.com/repos/RhythmicDias/SmartApproval/releases/latest");
        if (res.ok) {
          const data = await res.json();
          const latestVersion = data.tag_name;
          const currentVersion = "1.1.0";
          if (isNewerVersion(currentVersion, latestVersion)) {
            setHasUpdate(true);
          }
        }
      } catch (err) {
        console.warn("Auto update check failed:", err);
      }
    };

    checkUpdatesOnLaunch();
  }, []);

  const reloadSettings = useCallback(() => {
    loadSettings().then(setSettings);
  }, []);

  // Apply theme when settings change
  useEffect(() => {
    const theme = settings.theme || "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, [settings.theme]);

  const handleResetForm = () => {
    setFiles([]);
    setCustomText("");
    setMergedFilePath(null);
    setMergeSubject("");
    setMergeError("");
  };

  // Open file picker (PDFs only, multi-select)
  const handleAddFiles = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        defaultPath: downloadsPath || undefined,
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      setFiles((prev) => [...prev, ...paths]);
    } catch (e) {
      console.error(e);
    }
  };

  // Open eligibility folder picker
  const handleEligibility = async () => {
    const folder = settings.eligibility_folder;
    if (!folder) {
      alert("Eligibility folder is not configured. Please set it in Settings.");
      return;
    }
    try {
      const selected = await openDialog({
        multiple: true,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
        defaultPath: folder,
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      setFiles((prev) => [...prev, ...paths]);
    } catch (e) {
      console.error(e);
    }
  };

  const appendServiceText = (label: string) => {
    setCustomText((prev) =>
      prev.trim() ? `${prev.trim()}, ${label}` : label
    );
  };

  // Core merge action
  const handleMerge = async () => {
    if (files.length < 2) {
      setMergeError("Add at least two PDF files to merge.");
      return;
    }
    setIsMerging(true);
    setMergeError("");

    try {
      // Read all PDFs
      let pdfBytesList: Uint8Array[] = [];
      for (const filePath of files) {
        const bytes = await readFile(filePath);
        pdfBytesList.push(bytes);
      }

      // Merge all PDFs (no text overlay overlay logic called here)
      const mergedBytes = await mergePdfs(pdfBytesList);

      // Build output filename (no service details, safe for OS)
      const mergedFileName = buildMergedFileName(files);
      const subject = buildSubject(files, customText);
      setMergeSubject(subject);

      // Find unique filename
      let outputPath = `${downloadsPath}/${mergedFileName}.pdf`;
      let counter = 1;
      while (await invoke<boolean>("check_file_exists", { path: outputPath })) {
        outputPath = `${downloadsPath}/${mergedFileName}(${counter}).pdf`;
        counter++;
      }

      // Write merged PDF to Downloads
      await writeFile(outputPath, mergedBytes);

      setMergedFilePath(outputPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMergeError(`Merge failed: ${msg}`);
    } finally {
      setIsMerging(false);
    }
  };

  const handleSendEmrOnly = () => {
    if (files.length === 0) {
      setMergeError("Please add a medical report file first.");
      return;
    }
    setMergeError("");
    setMergedFilePath(files[0]);
    const subject = buildSubject(files, customText);
    setMergeSubject(subject);
  };

  // Get patient info from the files list
  const getPatientInfo = () => {
    if (files.length === 0) return { mrn: "", name: "" };
    const first = files[0];
    const fileBase = first.replace(/\\/g, "/").split("/").pop() ?? "";
    const info = extractInfoFromFilename(fileBase);
    return info || { mrn: "", name: fileBase.replace(/\.[^.]+$/, "") };
  };

  return (
    <div className="app-container">
      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="header-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/logo.png" alt="SmartApproval Logo" style={{ height: "24px", width: "24px", objectFit: "contain", borderRadius: "6px" }} />
          <span className="header-brand">SmartApproval</span>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSettings(true)}
            title="Settings"
            style={{ position: "relative" }}
          >
            <Settings size={15} /> Settings
            {hasUpdate && (
              <span style={{
                position: "absolute",
                top: "-3px",
                right: "-3px",
                width: "8px",
                height: "8px",
                backgroundColor: "var(--primary)",
                borderRadius: "50%",
                boxShadow: "0 0 0 2px var(--bg-surface), 0 0 6px var(--primary)",
                display: "inline-block"
              }} title="Update available!" />
            )}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAbout(true)}
            title="About"
          >
            <Info size={15} /> About
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* ─── Documents to Merge ─── */}
        <section className="card">
          <div className="card-header">
            <h2>Documents to Merge</h2>
            <div className="card-header-actions">
              <button className="btn btn-primary btn-sm" onClick={handleAddFiles}>
                <Plus size={14} /> Add Files
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleEligibility}>
                <FolderOpen size={14} /> Eligibility
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setFiles([])}
                disabled={files.length === 0}
              >
                <Trash2 size={14} /> Clear All
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleResetForm}
                title="Reset entire form"
              >
                Reset Form
              </button>
            </div>
          </div>
          <DragDropList files={files} onChange={setFiles} />
        </section>

        {/* ─── Selected Services ─── */}
        <section className="card">
          <div className="card-header">
            <h2>Selected Services (Appended to Subject)</h2>
          </div>
          <div className="text-section">
            <textarea
              className="text-input"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Select services below or type custom details to append to the subject line…"
              rows={2}
            />

            {/* Service quick-insert buttons (Grouped Cards) */}
            <div className="service-groups-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px", marginTop: "6px" }}>
              {/* Procedures Group */}
              <div style={{
                background: "var(--bg-elevated)",
                border: "1.5px solid var(--primary)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>Procedures:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {["EEG", "ABR", "NCS", "EMG", "ECG"].map((svc) => (
                    <button
                      key={svc}
                      className="btn btn-service"
                      onClick={() => appendServiceText(svc)}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Therapies Group */}
              <div style={{
                background: "var(--bg-elevated)",
                border: "1.5px solid var(--primary)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>Therapies:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {["ABA", "OT", "PT", "SLT"].map((svc) => (
                    <button
                      key={svc}
                      className="btn btn-service"
                      onClick={() => appendServiceText(svc)}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referrals Group */}
              <div style={{
                background: "var(--bg-elevated)",
                border: "1.5px solid var(--primary)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>Referrals:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {["Psychology", "Psychiatry", "Dev-Peds", "Dietic"].map((svc) => (
                    <button
                      key={svc}
                      className="btn btn-service"
                      onClick={() => appendServiceText(svc)}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions row */}
            <div className="font-row" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCustomText("")}
              >
                Clear Text
              </button>
            </div>
          </div>
        </section>

        {/* ─── Action Buttons ─── */}
        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <button
            className={`btn btn-merge ${isMerging ? "merging" : ""}`}
            style={{ flex: 1 }}
            onClick={handleMerge}
            disabled={isMerging || files.length < 2}
          >
            {isMerging ? "Merging…" : "Merge Documents"}
          </button>
          <button
            className="btn btn-merge"
            style={{ flex: 1 }}
            onClick={handleSendEmrOnly}
            disabled={isMerging || files.length === 0}
          >
            Send Only EMR Only
          </button>
        </div>

        {mergeError && <div className="error-banner">{mergeError}</div>}

        {/* ─── Send for Approval ─── */}
        <section className="card">
          <div className="card-header">
            <h2>Send for Approval</h2>
          </div>
          <SendApprovalPanel
            key={mergedFilePath || "empty"}
            mergedFilePath={mergedFilePath}
            subject={mergeSubject}
            settings={settings}
            downloadsPath={downloadsPath}
            patientName={getPatientInfo().name}
            mrn={getPatientInfo().mrn}
            services={customText}
          />
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="app-footer">
        &copy; 2026{" "}
        <span
          style={{ cursor: "pointer", textDecoration: "underline", color: "var(--primary)" }}
          onClick={async () => {
            try {
              await openPath("https://github.com/RhythmicDias");
            } catch (e) {
              console.error(e);
            }
          }}
        >
          Stephen Dias
        </span>{" "}
        &mdash;{" "}
        <span
          style={{ cursor: "pointer", textDecoration: "underline", color: "var(--primary)" }}
          onClick={async () => {
            try {
              await openPath("https://rhythmicdias.github.io/SmartApproval/");
            } catch (e) {
              console.error(e);
            }
          }}
        >
          SmartApproval
        </span>{" "}
        v1.1.0
      </footer>

      {/* ─── Modals ─── */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={reloadSettings}
          defaultTab={hasUpdate ? "updates" : "general"}
        />
      )}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
}

export default App;
