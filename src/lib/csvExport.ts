// Generic client-side export helpers — pure presentation utilities, not tied to any domain.

export function exportCSV(headers: string[], rows: (string | number)[][], filename: string): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPrintHTML(title: string, tableHTML: string): void {
  const win = window.open("", "_blank", "width=1100,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <title>${title}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:20px}
      h2{font-size:16px;margin-bottom:4px}
      p.sub{font-size:11px;color:#666;margin-bottom:14px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f0f0f0;font-weight:700;font-size:10px;text-transform:uppercase;padding:6px 8px;border:1px solid #ccc;text-align:left}
      td{padding:5px 8px;border:1px solid #ddd;vertical-align:top}
      tr:nth-child(even) td{background:#fafafa}
      @media print{@page{size:landscape;margin:10mm}}
    </style>
  </head><body>
    <h2>${title}</h2>
    <p class="sub">Generated: ${new Date().toLocaleString()}</p>
    ${tableHTML}
    <script>window.onload=()=>{window.print()}</script>
  </body></html>`);
  win.document.close();
}
