function c(e,o,t){const i=a=>`"${String(a).replace(/"/g,'""')}"`,p=[e.map(i).join(","),...o.map(a=>a.map(i).join(","))].join(`
`),d=new Blob([p],{type:"text/csv;charset=utf-8;"}),r=URL.createObjectURL(d),n=document.createElement("a");n.href=r,n.download=t,n.click(),URL.revokeObjectURL(r)}function s(e,o){const t=window.open("","_blank","width=1100,height=700");t&&(t.document.write(`<!DOCTYPE html><html><head>
    <title>${e}</title>
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
    <h2>${e}</h2>
    <p class="sub">Generated: ${new Date().toLocaleString()}</p>
    ${o}
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`),t.document.close())}export{s as a,c as e};
