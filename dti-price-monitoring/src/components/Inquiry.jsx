import React, { useMemo, useState } from "react";

const formatCurrency = (value) => `\u20b1${Number(value || 0).toFixed(2)}`;

export default function Inquiry({ prices }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [letter, setLetter] = useState({
    subject: "Letter of Inquiry",
    officer: "",
    date: new Date().toISOString().split("T")[0],
    content: ""
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const flaggedItems = useMemo(
    () => prices.filter((p) => Number(p.srp || 0) > 0 && Number(p.price) > Number(p.srp)),
    [prices]
  );

  const flaggedByStore = useMemo(() => {
    const groups = {};
    flaggedItems.forEach((item) => {
      const key = item.store || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [flaggedItems]);

  const firstFlaggedIndexByStore = useMemo(() => {
    const map = {};
    flaggedItems.forEach((item, idx) => {
      const key = item.store || "Unknown";
      if (map[key] === undefined) {
        map[key] = idx;
      }
    });
    return map;
  }, [flaggedItems]);

  const handleGenerate = () => {
    if (selectedIds.length === 0) return;
    const items = prices.filter(p => selectedIds.includes(p.id));
    generateContent(items);
  };

  const generateContent = (items) => {
    const firstItem = items[0];
    const dateObserved = firstItem.timestamp
      ? new Date(firstItem.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    // Generate observation table rows
    const commodityRows = items.map(item => {
      const price = Number(item.price || 0);
      const srp = Number(item.srp || 0);
      const variance = price - srp;
      return `        <tr>
          <td>${item.commodity || ""}</td>
          <td>${item.brandName || ""}</td>
          <td>${item.priceClass || ""}</td>
          <td>${formatCurrency(srp)}</td>
          <td>${formatCurrency(price)}</td>
          <td>${formatCurrency(variance)}</td>
        </tr>`;
    }).join('\n');

    // Add blank rows
    const blankRows = Array.from({ length: 3 }, () => 
      `        <tr>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>`
    ).join('\n');

    const body = `      <div class="letter-body">
        <p>Date: <u>${letter.date}</u></p>
        <br/>
        <p>${"_".repeat(35)}<br/>${"_".repeat(35)}<br/>${"_".repeat(35)}</p>
        <br/><br/>
        <p>Dear Sir/Madam:</p>
        <br/>
        <p>In connection with the price/supply monitoring conducted at <strong>${firstItem.store || "your store"}</strong> by the Consumer Protection Division of the Department of Trade and Industry – Lanao Del Norte Provincial Office on <strong>${dateObserved}</strong>, we would like to bring your attention to the results of the said monitoring, particularly on the following:</p>
        
        <table class="obs-table">
          <tr>
            <th style="width: 25%;">Commodity</th>
            <th style="width: 15%;">Brand Name (BN)</th>
            <th style="width: 12%;">Price Class (PC)</th>
            <th style="width: 12%;">SRP</th>
            <th style="width: 12%;">Monitored Price</th>
            <th style="width: 12%;">Variance</th>
          </tr>
${commodityRows}
${blankRows}
        </table>

        <p>As the agency mandated to ensure the reasonableness of prices/availability of supply of 
        <em>basic necessities and prime commodities</em>, the DTI would like to inquire about the circumstances 
        and factors which caused the occurrence of the above-enumerated observations.</p>
        
        <p>Please respond within five <strong>(5)</strong> working days from upon receipt of this letter and e-mail it  at <strong>r10.lanaodelnorte@dti.gov.ph</strong>. Any information that you provide will be treated with utmost 
        confidentiality and will be used solely for relevant monitoring, assessment, and analysis purposes.</p>
        <br/>
        <p>Thank you for your prompt cooperation.</p>
      </div>`;

    const commodityList = items.map(i => i.commodity).join(", ");
    setLetter((prev) => ({ ...prev, subject: `Price Inquiry - ${commodityList}`, content: body }));
  };

  const handleLetterChange = (e) => {
    const { name, value } = e.target;
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const printLetter = () => {
    if (!letter.content.trim()) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${letter.subject}</title>
          <style>
            @page { margin: 0.5in; }
            body { font-family: 'Times New Roman', Times, serif; margin: 20px; line-height: 1.4; font-size: 13px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 12px; }
            .form-table { border: 0.2px solid #000; border-collapse: collapse; font-size: 13px; }
            .form-table td { border: 0.2px solid #000; padding: 4px 7px; }
            .form-label { background: #f0f0f0; font-weight: normal; width: 30px; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
            .letter-body { white-space: normal; }
            .letter-body p { margin: 8px 0; text-align: justify; }
            .letter-body u { text-decoration: underline; }
            .obs-table { border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 13px; }
            .obs-table th, .obs-table td { border: 1px solid #000; padding: 5px 7px; text-align: left; }
            .obs-table th { background: #f0f0f0; font-weight: bold; }
            .signature { margin-top: 25px; }
            .sig-name { font-weight: bold; text-decoration: underline; margin-top: 35px; }
            .sig-title { margin-top: 3px; }
            .received-by { margin-top: 18px; padding-top: 15px; border-top: 0.3px solid #000; }
            .received-by h4 { margin: 0 0 12px 0; font-weight: bold; font-size: 13px; }
            .received-field { display: flex; margin-bottom: 10px; font-size: 13px; }
            .received-field label { width: 180px; }
            .received-field .line { flex: 1; border-bottom: 1px solid #000; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <table class="form-table">
              <tr>
                <td class="form-label" rowspan="3">FORM</td>
                <td style="width: 60px;">Code</td>
                <td style="width: 100px; text-align: center;">FM-PSM-03</td>
              </tr>
              <tr>
                <td>Rev.</td>
                <td style="text-align: center;">01</td>
              </tr>
              <tr>
                <td>Date</td>
                <td style="text-align: center;">${new Date(letter.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</td>
              </tr>
            </table>
            <div style="text-align: right;">
              <img src="/dti-logo.png" alt="DTI Logo" style="height: 60px;" onerror="this.style.display='none'" />
            </div>
          </div>
          ${letter.content}
          <div class="signature">
            <div class="sig-name">Jane Marie L. Tabucan</div>
            <div class="sig-title">Provincial Director</div>
          </div>
          <div class="received-by">
            <h4>Received by:</h4>
            <div class="received-field">
              <label>Name (Firm Representative)</label>
              <span>:</span>
              <div class="line"></div>
            </div>
            <div class="received-field">
              <label>Signature</label>
              <span>:</span>
              <div class="line"></div>
            </div>
            <div class="received-field">
              <label>Position</label>
              <span>:</span>
              <div class="line"></div>
            </div>
            <div class="received-field">
              <label>Date</label>
              <span>:</span>
              <div class="line"></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);
  };

  const selectedItems = prices.filter(p => selectedIds.includes(p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Inter', sans-serif" }}>
      {/* Flagged entries moved to the top */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, color: "#0f172a" }}>Flagged Entries (Price above SRP)</h4>
          <span style={tagStyle}>{flaggedItems.length} item(s)</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>
                <th style={thStyle}>Commodity</th>
                <th style={thStyle}>Store</th>
                <th style={thStyle}>Municipality</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>SRP</th>
                <th style={thStyle}>Variance</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {flaggedItems.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>No entries above SRP.</td>
                </tr>
              )}
              {flaggedItems.map((p, idx) => {
                const v = Number(p.price || 0) - Number(p.srp || 0);
                const storeKey = p.store || "Unknown";
                const isFirstForStore = firstFlaggedIndexByStore[storeKey] === idx;
                const storeGroup = flaggedByStore[storeKey] || [p];
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>{p.commodity || "--"}</td>
                    <td style={tdStyle}>{p.store || "--"}</td>
                    <td style={tdStyle}>{p.municipality || "--"}</td>
                    <td style={tdStyle}>{formatCurrency(p.price)}</td>
                    <td style={tdStyle}>{formatCurrency(p.srp)}</td>
                    <td style={{ ...tdStyle, color: v > 0 ? "#dc2626" : "#0f172a" }}>{formatCurrency(v)}</td>
                    <td style={tdStyle}>
                      {isFirstForStore ? (
                        <button
                          onClick={() => { setSelectedIds(storeGroup.map(i => i.id)); generateContent(storeGroup); }}
                          style={{ ...miniButtonStyle, background: "#0f172a", color: "white" }}
                        >
                          Draft Letter (Store)
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Subject</label>
            <input name="subject" value={letter.subject} onChange={handleLetterChange} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" name="date" value={letter.date} onChange={handleLetterChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Officer</label>
              <input name="officer" value={letter.officer} onChange={handleLetterChange} style={inputStyle} placeholder="Name / Position" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>Letter Body</label>
          <textarea
            name="content"
            value={letter.content}
            onChange={handleLetterChange}
            rows={14}
            style={{ ...inputStyle, minHeight: "240px", fontFamily: "'Inter', sans-serif" }}
            placeholder="Auto-generated letter will appear here."
          />
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
          <button
            onClick={() => generateContent(selectedItems)}
            style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}
            disabled={selectedIds.length === 0}
          >
            Regenerate Letter
          </button>
          <button
            onClick={printLetter}
            style={{ ...buttonStyle, background: "#0f172a", color: "white" }}
            disabled={!letter.content.trim()}
          >
            Print Letter
          </button>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "0.95rem",
  outline: "none",
  width: "100%"
};

const labelStyle = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: "700",
  letterSpacing: "0.02em",
  color: "#475569",
  marginBottom: "6px"
};

const buttonStyle = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "none",
  fontWeight: "700",
  cursor: "pointer"
};

const miniButtonStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "none",
  fontWeight: "700",
  fontSize: "0.8rem",
  cursor: "pointer"
};

const thStyle = {
  padding: "10px 8px",
  fontWeight: "700",
  fontSize: "0.75rem"
};

const tdStyle = {
  padding: "12px 8px",
  fontSize: "0.9rem",
  color: "#0f172a"
};

const tagStyle = {
  background: "#0f172a",
  color: "white",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "0.75rem",
  fontWeight: "700"
};

const badgeBoxStyle = (bg, color) => ({
  background: bg,
  color,
  borderRadius: "12px",
  padding: "10px 12px",
  fontWeight: "700",
  border: `1px solid ${color}33`,
  textAlign: "center"
});
