function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderPdfReadyHtml(title: string, rows: Record<string, unknown>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f5}</style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
}

function pdfEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function printable(value: unknown) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, "?").slice(0, 110);
}

/** Render a dependency-free, private PDF export for the bounded report rows. */
export function renderPdf(title: string, rows: Record<string, unknown>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const lines = [title, headers.join(" | "), ...rows.map((row) => headers.map((header) => printable(row[header])).join(" | "))];
  const pageLines = 46;
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / pageLines)) }, (_, index) => lines.slice(index * pageLines, (index + 1) * pageLines));
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageObjectNumbers: number[] = [];
  for (const page of pages) {
    const stream = ["BT", "/F1 9 Tf", "40 760 Td", ...page.flatMap((line, index) => [index === 0 ? "/F1 14 Tf" : "/F1 9 Tf", `(${pdfEscape(printable(line))}) Tj`, index === 0 ? "0 -22 Td" : "0 -14 Td"]), "ET"].join("\n");
    const contentNumber = objects.length + 1;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageNumber = objects.length + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNumber} 0 R >>`);
    pageObjectNumbers.push(pageNumber);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>`;
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = new TextEncoder().encode(output).length;
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(output);
}
