import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ---------------------------------------------------------------------------
// Hex → rgb (0-1 float) converter
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

// ---------------------------------------------------------------------------
// Add text overlay to the first page of a PDF
// ---------------------------------------------------------------------------
export async function addTextToPdfPage(
  pdfBytes: Uint8Array,
  text: string,
  fontSize: number,
  hexColor: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPage(0);
  const { width } = page.getSize();
  const { r, g, b } = hexToRgb(hexColor);

  const margin = 28; // ~1 cm
  const maxWidth = width - margin * 2;

  // Word-wrap the text
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const lineWidth = font.widthOfTextAtSize(candidate, fontSize);
    if (lineWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Draw near the top of the page (A4: ~841pt height → start at ~810)
  const { height } = page.getSize();
  let y = height - margin - fontSize;

  for (const line of lines) {
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(r, g, b) });
    y -= fontSize + 4;
  }

  return pdfDoc.save();
}

// ---------------------------------------------------------------------------
// Merge multiple PDFs into one
// ---------------------------------------------------------------------------
export async function mergePdfs(pdfBytesList: Uint8Array[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();

  for (const pdfBytes of pdfBytesList) {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of pages) {
      mergedDoc.addPage(page);
    }
  }

  return mergedDoc.save();
}
