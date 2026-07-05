// ---------------------------------------------------------------------------
// Extract MRN and patient name from a filename like: 12345-67890-PatientName.pdf
// ---------------------------------------------------------------------------
export function extractInfoFromFilename(
  filename: string
): { mrn: string; name: string } | null {
  const match = filename.match(/^(\d+)-(\d+)-(.*)/);
  if (!match) return null;
  const mrn = match[1];
  const fullName = match[3].replace(/\.[^.]+$/, "").trim(); // strip extension
  const name = fullName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
  return { mrn, name };
}

// ---------------------------------------------------------------------------
// Build email subject from the 1st file in the list + optional custom text
// ---------------------------------------------------------------------------
export function buildSubject(
  filePaths: string[],
  customText: string
): string {
  if (filePaths.length === 0) {
    return "Approval Request: Merged Document";
  }

  const first = filePaths[0];
  const fileBase = first.replace(/\\/g, "/").split("/").pop() ?? "";
  const info = extractInfoFromFilename(fileBase);

  let subject = "Approval Request: ";
  if (info) {
    // Keep MRN and Patient Name (separated by dash)
    subject = `Approval Request:  ${info.mrn}-${info.name}`;
  } else {
    // Fallback if structure is different
    const nameWithoutExt = fileBase.replace(/\.[^.]+$/, "");
    subject = `Approval Request:  ${nameWithoutExt}`;
  }

  if (customText.trim()) {
    subject += `-${customText.trim()}`;
  }

  return subject;
}

// ---------------------------------------------------------------------------
// Build output filename from the 1st file (without colons or service details)
// ---------------------------------------------------------------------------
export function buildMergedFileName(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return "Approval Request Merged Document";
  }

  const first = filePaths[0];
  const fileBase = first.replace(/\\/g, "/").split("/").pop() ?? "";
  const info = extractInfoFromFilename(fileBase);

  if (info) {
    return `Approval Request ${info.mrn}-${info.name}`;
  } else {
    const nameWithoutExt = fileBase.replace(/\.[^.]+$/, "");
    return `Approval Request - ${nameWithoutExt}`;
  }
}

// ---------------------------------------------------------------------------
// Generate a unique filename by appending (1), (2), etc.
// ---------------------------------------------------------------------------
export function uniqueFilename(base: string): string {
  // The actual uniqueness is checked via Rust check_file_exists; 
  // this helper just formats the candidate name.
  return base;
}

// ---------------------------------------------------------------------------
// Get the basename from a full path (cross-platform)
// ---------------------------------------------------------------------------
export function basename(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
}

// ---------------------------------------------------------------------------
// Compare semver version strings to see if remote is newer
// ---------------------------------------------------------------------------
export function isNewerVersion(current: string, remote: string): boolean {
  const c = current.replace(/^v/i, "").split(".").map(Number);
  const r = remote.replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(c.length, r.length); i++) {
    const cv = c[i] || 0;
    const rv = r[i] || 0;
    if (rv > cv) return true;
    if (cv > rv) return false;
  }
  return false;
}
