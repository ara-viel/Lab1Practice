import React, { useMemo, useState, useRef, useEffect } from "react";

const formatCurrency = (value) => `\u20b1${Number(value || 0).toFixed(2)}`;

export default function Inquiry({ prices }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [letter, setLetter] = useState({
    subject: "Letter of Inquiry",
    officerName: "Jane Marie L. Tabucan",
    officerPosition: "Provincial Director",
    date: new Date().toISOString().split("T")[0],
    content: ""
  });
  const [expandedStores, setExpandedStores] = useState([]);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const previewRef = useRef(null);
  const isUserEditingRef = useRef(false);

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const flaggedItems = useMemo(
    () => prices.filter((p) => {
      const srp = Number(p.srp || 0);
      const price = Number(p.price || 0);
      const currentYear = Number(p.year);
      const currentMonth = Number(p.month);

      // Find previous month price dynamically (same year only)
      let prevMonth = currentMonth - 1;
      let prevYear = currentYear;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthItem = prices.find(item => 
        item.commodity === p.commodity &&
        item.store === p.store &&
        Number(item.month) === prevMonth &&
        Number(item.year) === prevYear
      );
      const prevMonthPrice = prevMonthItem ? Number(prevMonthItem.price || 0) : 0;

      // Flagged if price exceeds SRP, or if no SRP, exceeds previous month's price (same year only)
      const referencePrice = srp > 0 ? srp : (prevMonthPrice > 0 ? prevMonthPrice : 0);
      if (referencePrice > 0 && currentYear === p.year && price > referencePrice) return true;

      // Flagged if current price is 10% lower than previous month's price (same year only)
      if (prevMonthPrice > 0 && currentYear === p.year) {
        const percentChange = ((price - prevMonthPrice) / prevMonthPrice) * 100;
        if (percentChange <= -10) return true;
      }

      return false;
    }),
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

  const toggleStore = (storeKey) => {
    setExpandedStores(prev =>
      prev.includes(storeKey) ? prev.filter(s => s !== storeKey) : [...prev, storeKey]
    );
  };

  const getPreviousMonthPrice = (item) => {
    const currentMonth = Number(item.month);
    const currentYear = Number(item.year);
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;

    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }

    // Find matching item from previous month with same commodity and store
    const prevMonthItem = prices.find(p => 
      p.commodity === item.commodity &&
      p.store === item.store &&
      Number(p.month) === prevMonth &&
      Number(p.year) === prevYear
    );

    return prevMonthItem ? Number(prevMonthItem.price || 0) : 0;
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
      const prevMonthPrice = getPreviousMonthPrice(item);
      const brand = (item.brand && String(item.brand).trim()) ? item.brand : "N/A";
      const size = (item.size && String(item.size).trim()) ? item.size : "N/A";
      const commodity = (item.commodity && String(item.commodity).trim()) ? item.commodity : "N/A";
      const srpDisplay = srp > 0 ? formatCurrency(srp) : "N/A";
      const prevDisplay = prevMonthPrice > 0 ? formatCurrency(prevMonthPrice) : "N/A";
      const priceDisplay = price > 0 ? formatCurrency(price) : "N/A";
      const hasVariance = (price !== 0 || srp !== 0);
      const varianceDisplay = hasVariance ? formatCurrency(price - srp) : "N/A";
      return `        <tr>
          <td>${commodity}</td>
          <td>${brand}</td>
          <td>${size}</td>
          <td>${srpDisplay}</td>
          <td>${prevDisplay}</td>
          <td>${priceDisplay}</td>
          <td>${varianceDisplay}</td>
          <td></td>
        </tr>`;
    }).join('\n');

    const body = `      <div class="letter-body">
        <p>Date: <u>${letter.date}</u></p>
        <br/>
        <p>${"_".repeat(35)}<br/>${"_".repeat(35)}<br/>${"_".repeat(35)}</p>
        <br/><br/>
        <p>Dear Sir/Madam:</p>
        <br/>
        <p>In connection with the price/supply monitoring conducted at <strong><u>${firstItem.store || "your store"}</u></strong> by the Consumer Protection Division of the Department of Trade and Industry – Lanao Del Norte Provincial Office on <span style="background-color: #ffff00; font-weight: bold; padding: 2px 4px;"><u>${dateObserved}</u></span>, we would like to bring your attention to the results of the said monitoring, particularly on the following:</p>
        
        <table class="obs-table">
          <tr>
            <th style="width: 14%;">Commodity</th>
            <th style="width: 11%;">Brand</th>
            <th style="width: 8%;">Size</th>
            <th style="width: 8%;">SRP</th>
            <th style="width: 11%;">Previous Month Price</th>
            <th style="width: 11.5%;">Monitored Price</th>
            <th style="width: 10%;">Variance</th>
            <th style="width: 29%;">Remarks</th>
          </tr>
${commodityRows}
        </table>
        <br/>
        <p>As the agency mandated to ensure the reasonableness of prices/availability of supply of 
        <em>basic necessities and prime commodities</em>, the DTI would like to inquire about the circumstances 
        and factors which caused the occurrence of the above-enumerated observations.</p>
        
        <p>Please respond within five <strong>(5)</strong> working days from upon receipt of this letter and e-mail it  at <strong>r10.lanaodelnorte@dti.gov.ph</strong>. Any information that you provide will be treated with utmost 
        confidentiality and will be used solely for relevant monitoring, assessment, and analysis purposes.</p>
        <p>Thank you for your prompt cooperation.</p>
      </div>`;

    const commodityList = items.map(i => i.commodity).join(", ");
    setLetter((prev) => ({ ...prev, subject: `Price Inquiry - ${commodityList}`, content: body }));
  };

  const handleLetterChange = (e) => {
    const { name, value } = e.target;
    setLetter((prev) => ({ ...prev, [name]: value }));
  };

  const focusPreview = () => {
    if (previewRef.current) {
      isUserEditingRef.current = false;
      previewRef.current.focus({ preventScroll: true });
    }
  };

  const printLetter = () => {
    if (!letter.content.trim()) return;
    setShowPrintConfirm(true);
  };

  const handlePrintCancel = () => setShowPrintConfirm(false);

  const handlePrintConfirm = () => {
    setShowPrintConfirm(false);
    executePrint();
  };

  const handlePreviewInput = (e) => {
    isUserEditingRef.current = true;
    const html = e.currentTarget.innerHTML;
    setLetter((prev) => ({ ...prev, content: html }));
    requestAnimationFrame(() => {
      isUserEditingRef.current = false;
    });
  };

  const handlePreviewFocus = () => {
    isUserEditingRef.current = false;
  };

  const handlePreviewBlur = () => {
    // Allow re-edit after losing focus
    isUserEditingRef.current = false;
  };

  useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    if (isUserEditingRef.current) return;
    node.innerHTML = letter.content || "<div class='letter-body'><p style='color: #94a3b8;'>Auto-generated letter will appear here.</p></div>";
  }, [letter.content]);

  const executePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${letter.subject}</title>
          <style>
            @page { margin: 0.5in; size: 8.27in 11.69in; }
            body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 5px 20px 20px 20px; line-height: 1.4; font-size: 13px; }
            .container { max-width: 7.5in; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 4px; }
            .form-table { border: 0.2px solid #000; border-collapse: collapse; font-size: 13px; }
            .form-table td { border: 0.2px solid #000; padding: 4px 7px; }
            .form-label { background: #f0f0f0; font-weight: normal; width: 30px; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
            .letter-body { white-space: normal; }
            .letter-body p { margin: 8px 0; text-align: justify; }
            .letter-body u { text-decoration: underline; }
            .obs-table { border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 13px; page-break-inside: auto; break-inside: auto; }
            .obs-table tr { page-break-inside: avoid; break-inside: avoid; }
            .obs-table th, .obs-table td { border: 1px solid #000; padding: 5px 7px; text-align: left; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap; page-break-inside: avoid; break-inside: avoid; }
            .obs-table th { background: #f0f0f0; font-weight: bold; }
            .signature { margin-top: 25px; page-break-inside: avoid; break-inside: avoid; }
            .sig-name { font-weight: bold; text-decoration: underline; margin-top: 35px; }
            .sig-title { margin-top: 3px; }
            .received-group { page-break-inside: avoid; break-inside: avoid; page-break-before: avoid; page-break-after: avoid; }
            .received-by { margin-top: 18px; padding-top: 15px; border-top: 0.3px solid #000; page-break-inside: avoid; break-inside: avoid; }
            .received-by h4 { margin: 0 0 12px 0; font-weight: bold; font-size: 13px; }
            .received-table { page-break-inside: avoid; break-inside: avoid; }
            .received-field { display: flex; margin-bottom: 2px; font-size: 13px; }
            .received-field label { width: 180px; }
            .received-field .line { flex: 1; border-bottom: 1px solid #000; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
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
              <div style="text-align: right; display: flex; align-items: center; gap: 0; margin-top: -17px;">
                <img src="/logo-DTI.png" alt="DTI Philippines" style="height: 95px; object-fit: contain; display: inline-block;" onerror="this.style.display='none'" />
                <img src="/bagongPinas.png" alt="Bagong Pilipinas" style="height: 115px; object-fit: contain; display: inline-block;" onerror="this.style.display='none'" />
              </div>
            </div>
            ${letter.content}
          <div class="received-group">
          <div class="signature">
            <div class="sig-name">${letter.officerName || ""}</div>
            <div class="sig-title">${letter.officerPosition || ""}</div>
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
          </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);

    // Restore focus/editability when print tab/window closes or after printing
    const restoreEdit = () => {
      window.focus();
      setTimeout(focusPreview, 50);
    };
    printWindow.onafterprint = restoreEdit;
    printWindow.onbeforeunload = restoreEdit;
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
        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "360px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>
                <th style={thStyle}>Store</th>
                <th style={thStyle}>Municipality</th>
                <th style={thStyle}>Flagged Items</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(flaggedByStore).length === 0 && (
                <tr>
                  <td colSpan="4" style={{ ...tdStyle, textAlign: "center", color: "#94a3b8" }}>No entries above SRP.</td>
                </tr>
              )}
              {Object.entries(flaggedByStore).map(([store, items]) => {
                const storeKey = store || "Unknown";
                const municipality = items[0]?.municipality || "--";
                const isExpanded = expandedStores.includes(storeKey);
                return (
                  <React.Fragment key={storeKey}>
                    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{storeKey}</td>
                      <td style={tdStyle}>{municipality}</td>
                      <td style={tdStyle}>{items.length} {items.length === 1 ? "item" : "items"}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => toggleStore(storeKey)}
                            style={{ ...miniButtonStyle, background: "#334155", color: "white" }}
                          >
                            {isExpanded ? "Hide details" : "See details"}
                          </button>
                          <button
                            onClick={() => { setSelectedIds(items.map(i => i.id)); generateContent(items); }}
                            style={{ ...miniButtonStyle, background: "#0f172a", color: "white" }}
                          >
                            Draft letter
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="4" style={{ ...tdStyle, background: "#f8fafc" }}>
                          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "260px" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                              <thead>
                                <tr style={{ textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>
                                  <th style={thStyle}>Commodity</th>
                                  <th style={thStyle}>Size/Unit</th>
                                  <th style={thStyle}>Price</th>
                                  <th style={thStyle}>Previous Month</th>
                                  <th style={thStyle}>SRP</th>
                                  <th style={thStyle}>Variance</th>
                                  <th style={thStyle}>Change %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => {
                                  const v = Number(item.price || 0) - Number(item.srp || 0);
                                  const percentChange = Number(item.srp || 0) > 0 ? ((v / Number(item.srp)) * 100) : 0;
                                  const varianceColor = v < 0 ? "#f59e0b" : v > 0 ? "#dc2626" : "#0f172a";
                                  const changeColor = percentChange < 0 ? "#f59e0b" : percentChange > 0 ? "#dc2626" : "#0f172a";
                                  return (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                      <td style={tdStyle}>{item.commodity || "--"}</td>
                                      <td style={tdStyle}>{item.size || "--"}</td>
                                      <td style={tdStyle}>{formatCurrency(item.price)}</td>
                                      <td style={tdStyle}>{Number(item.prevMonthPrice || 0) > 0 ? formatCurrency(item.prevMonthPrice) : "--"}</td>
                                      <td style={tdStyle}>{formatCurrency(item.srp)}</td>
                                      <td style={{ ...tdStyle, color: varianceColor }}>{formatCurrency(v)}</td>
                                      <td style={{ ...tdStyle, color: changeColor, fontWeight: "600" }}>
                                        {percentChange > 0 ? "+" : ""}{percentChange.toFixed(1)}%
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "100px" }}>
            <div>
              <label style={labelStyle}>Subject</label>
              <input name="subject" value={letter.subject} onChange={handleLetterChange} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" name="date" value={letter.date} onChange={handleLetterChange} style={{...inputStyle, maxWidth: "180px"}} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "60px", maxWidth: "400px" }}>
            <div>
              <label style={labelStyle}>Officer Name</label>
              <input name="officerName" value={letter.officerName} onChange={handleLetterChange} style={inputStyle} placeholder="e.g., Jane Marie L. Tabucan" />
            </div>
            <div>
              <label style={labelStyle}>Officer Position</label>
              <input name="officerPosition" value={letter.officerPosition} onChange={handleLetterChange} style={inputStyle} placeholder="e.g., Provincial Director" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={labelStyle}>Letter Body (Editable Preview)</label>
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", background: "#fff" }}>
            <style>{`
              .preview-container { font-family: 'Times New Roman', Times, serif; line-height: 1.4; font-size: 13px; padding: 5px 20px 20px 20px; }
              .preview-inner { max-width: 7.5in; margin: 0 auto; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 4px; }
              .form-table { border: 0.2px solid #000; border-collapse: collapse; font-size: 13px; }
              .form-table td { border: 0.2px solid #000; padding: 4px 7px; }
              .form-label { background: #f0f0f0; font-weight: normal; width: 30px; writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
              .letter-body { white-space: normal; }
              .letter-body p { margin: 8px 0; text-align: justify; }
              .letter-body u { text-decoration: underline; }
              .obs-table { border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 13px; page-break-inside: auto; break-inside: auto; }
              .obs-table tr { page-break-inside: avoid; break-inside: avoid; }
              .obs-table th, .obs-table td { border: 1px solid #000; padding: 5px 7px; text-align: left; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; word-break: break-word; white-space: pre-wrap; page-break-inside: avoid; break-inside: avoid; }
              .obs-table th { background: #f0f0f0; font-weight: bold; }
              .signature { margin-top: 25px; }
              .sig-name { font-weight: bold; text-decoration: underline; margin-top: 35px; }
              .sig-title { margin-top: 3px; }
              .received-group { page-break-inside: avoid; break-inside: avoid; page-break-before: avoid; page-break-after: avoid; }
              .received-by { margin-top: 18px; padding-top: 15px; border-top: 0.3px solid #000; }
              .received-by h4 { margin: 0 0 12px 0; font-weight: bold; font-size: 13px; }
              .received-table { width: 100%; border-collapse: collapse; }
              .received-table td { border: none; padding: 2px 0; vertical-align: bottom; }
              .received-table .label-cell { width: 200px; padding-right: 10px; }
              .received-table .colon-cell { width: 20px; }
              .received-table .line-cell { border-bottom: 1px solid #000; padding-bottom: 2px; }
            `}</style>
            <div className="preview-container">
              <div className="preview-inner">
                <div className="header">
                  <table className="form-table">
                    <tbody>
                      <tr>
                        <td className="form-label" rowSpan={3}>FORM</td>
                        <td style={{ width: "60px" }}>Code</td>
                        <td style={{ width: "100px", textAlign: "center" }}>FM-PSM-03</td>
                      </tr>
                      <tr>
                        <td>Rev.</td>
                        <td style={{ textAlign: "center" }}>01</td>
                      </tr>
                      <tr>
                        <td>Date</td>
                        <td style={{ textAlign: "center" }}>{new Date(letter.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "0", marginTop: "-15px" }}>
                    <img src="/logo-DTI.png" alt="DTI Philippines" style={{ height: "95px", objectFit: "contain", display: "inline-block" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <img src="/bagongPinas.png" alt="Bagong Pilipinas" style={{ height: "115px", objectFit: "contain", display: "inline-block" }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                </div>
                <div
                  ref={previewRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handlePreviewInput}
                  onFocus={handlePreviewFocus}
                  onBlur={handlePreviewBlur}
                  style={{ minHeight: "240px", outline: "none" }}
                />
                <div className="received-group">
                  <div className="signature">
                    <div className="sig-name">{letter.officerName || ""}</div>
                    <div className="sig-title">{letter.officerPosition || ""}</div>
                  </div>
                  <div className="received-by">
                    <h4>Received by:</h4>
                    <table className="received-table">
                      <tbody>
                        <tr>
                          <td className="label-cell">Name (Firm Representative)</td>
                          <td className="colon-cell">:</td>
                          <td className="line-cell">&nbsp;</td>
                        </tr>
                        <tr>
                          <td className="label-cell">Signature</td>
                          <td className="colon-cell">:</td>
                          <td className="line-cell">&nbsp;</td>
                        </tr>
                        <tr>
                          <td className="label-cell">Position</td>
                          <td className="colon-cell">:</td>
                          <td className="line-cell">&nbsp;</td>
                        </tr>
                        <tr>
                          <td className="label-cell">Date</td>
                          <td className="colon-cell">:</td>
                          <td className="line-cell">&nbsp;</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
          <button
            onClick={printLetter}
            style={{ ...buttonStyle, background: "#0f172a", color: "white" }}
            disabled={!letter.content.trim()}
          >
            Print Letter
          </button>
        </div>
      </div>

      {showPrintConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ background: "white", padding: "28px", borderRadius: "16px", width: "440px", maxWidth: "92vw", boxShadow: "0 16px 44px rgba(0,0,0,0.22)" }}>
            <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Proceed to print?</h4>
            <p style={{ margin: "0 0 16px 0", color: "#475569", fontSize: "0.95rem", lineHeight: 1.5, textAlign: "justify" }}>Please read the contents carefully. Take note of the <strong><em>MONITORING DATE</em></strong> (highlighted date) and ensure it is the right date of the monitoring. Once you print, you can only print multiple copies but cannot edit again the contents of the letter.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={handlePrintCancel} style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>Cancel</button>
              <button onClick={handlePrintConfirm} style={{ ...buttonStyle, background: "#0f172a", color: "white" }}>Proceed</button>
            </div>
          </div>
        </div>
      )}
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
