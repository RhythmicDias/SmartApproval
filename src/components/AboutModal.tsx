import { X } from "lucide-react";
import { openPath } from "@tauri-apps/plugin-opener";

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content about-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>About SmartApproval</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body about-body">
          <h3>How to Use SmartApproval</h3>

          <div className="about-step">
            <span className="step-num">1</span>
            <div>
              <strong>Add Files</strong> — Drag and drop PDF documents into the
              &ldquo;Documents to Merge&rdquo; panel, or use the{" "}
              <em>Add Files</em> button. Click{" "}
              <em>Eligibility</em> to open the configured shared folder. Reorder
              files by dragging the grip handles.
            </div>
          </div>

          <div className="about-step">
            <span className="step-num">2</span>
            <div>
              <strong>Add Custom Text</strong> — Type any custom text in the box
              below the file list. Use the service quick-insert buttons (EEG,
              OT, etc.) for fast entry. This text is overlaid on the first page
              of the merged PDF.
            </div>
          </div>

          <div className="about-step">
            <span className="step-num">3</span>
            <div>
              <strong>Merge Documents</strong> — Click{" "}
              <em>Merge Documents</em>. The merged PDF is saved to your
              Downloads folder with a filename auto-generated from the medical
              report (2nd file in the list).
            </div>
          </div>

          <div className="about-step">
            <span className="step-num">4</span>
            <div>
              <strong>Send for Approval</strong> — After merging, the{" "}
              <em>Send for Approval</em> panel shows the output file. Edit the
              To / Cc / Bcc / Subject fields if needed, then click{" "}
              <em>Send for Approval</em> to dispatch via SMTP.
            </div>
          </div>

          <div className="about-step">
            <span className="step-num">5</span>
            <div>
              <strong>Settings</strong> — Configure SMTP credentials, default
              recipients, email body template, eligibility folder, and PDF
              overlay font. Settings are saved locally in your AppData directory.
            </div>
          </div>

          <div className="about-footer">
            <p>
              <strong>Filename convention:</strong> The 2nd PDF should follow the
              format <code>MRN-ID-PatientName.pdf</code> for automatic subject
              generation (e.g.,{" "}
              <code>123456-78901-Ahmad_Khalil.pdf</code>).
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <span className="about-version">
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
            &mdash; SmartApproval v1.0.42
          </span>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
