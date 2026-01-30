import React, { useMemo, useState, useRef, useEffect } from "react";

const formatCurrency = (value) => `\u20b1${Number(value || 0).toFixed(2)}`;

// Calculate working days (excluding weekends)
const addWorkingDays = (startDate, days) => {
  let current = new Date(startDate);
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      added++;
    }
  }
  return current;
};

const getWorkingDaysRemaining = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  
  let count = 0;
  let current = new Date(today);
  
  while (current < deadlineDate) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  
  if (deadlineDate < today) return -1; // Overdue
  if (deadlineDate.getTime() === today.getTime()) return 0; // Due today
  return count;
};

export default function Inquiry({ prices }) {
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Debug: log prices to console
  console.log('📋 Inquiry component received prices:', prices?.length || 0, 'items');
  
  const [letter, setLetter] = useState({
    subject: "Letter of Inquiry",
    officerName: "Jane Marie L. Tabucan",
    officerPosition: "Provincial Director",
    date: new Date().toISOString().split("T")[0],
    content: ""
  });
  const [expandedStores, setExpandedStores] = useState([]);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [printedStores, setPrintedStores] = useState([]);
  // reprintPending/reprintAwaiting removed — reprints now auto-persist after print completes
  const [currentStore, setCurrentStore] = useState(null);
  const previewRef = useRef(null);
  const isUserEditingRef = useRef(false);
  const [showPrintResultConfirm, setShowPrintResultConfirm] = useState(false);
  const [pendingPrintRecord, setPendingPrintRecord] = useState(null);
  const printResultShownRef = useRef(false);
  const [draftedStore, setDraftedStore] = useState(null);

  // Load printed letters from database on component mount
  useEffect(() => {
    const loadPrintedLetters = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/printed-letters');
        if (response.ok) {
          const data = await response.json();
          setPrintedStores(data.map(letter => ({
            _id: letter._id,
            store: letter.store,
            datePrinted: letter.datePrinted,
            deadline: letter.deadline,
            replied: !!letter.replied,
            printedBy: letter.printedBy || '',
            copiesPrinted: (typeof letter.copiesPrinted === 'number' && letter.copiesPrinted > 0) ? letter.copiesPrinted : 1
          })));
        }
      } catch (error) {
        console.error('Failed to load printed letters:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem("printedStores");
        if (saved) setPrintedStores(JSON.parse(saved));
      }
    };
    loadPrintedLetters();
  }, []);

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const normalizeField = (val) => {
    if (val === undefined || val === null) return "";
    const v = Array.isArray(val) ? (val[0] ?? "") : val;
    return String(v).trim();
  };

  const getBrandValue = (it) => {
    if (!it) return "";
    if (it.brand) return normalizeField(it.brand);
    if (it.brands) return normalizeField(it.brands);
    return "";
  };

  const getSizeValue = (it) => {
    if (!it) return "";
    return normalizeField(it.size ?? it.sizeUnit ?? it.unit ?? it.uom);
  };

  const getStoreValue = (it) => normalizeField(it?.store ?? "");

  const getTimestampValue = (it) => {
    if (!it) return 0;
    if (it.timestamp) return new Date(it.timestamp).getTime() || 0;
    if (it.ts) return Number(it.ts) || 0;
    if (it.createdAt) return new Date(it.createdAt).getTime() || 0;
    return 0;
  };

  const getPreviousMonthPrice = (item) => {
    const commodityKey = normalizeField(item?.commodity ?? "");
    const brandKey = getBrandValue(item);
    const sizeKey = getSizeValue(item);
    const storeKey = getStoreValue(item);

    const matchingRecords = prices.filter(p =>
      normalizeField(p?.commodity ?? "") === commodityKey &&
      getBrandValue(p) === brandKey &&
      getSizeValue(p) === sizeKey &&
      getStoreValue(p) === storeKey
    ).sort((a, b) => getTimestampValue(b) - getTimestampValue(a));

    return matchingRecords.length > 1 ? Number(matchingRecords[1].price || 0) : 0;
  };

  const getPreviousPriceForDetail = (item) => getPreviousMonthPrice(item);

  const flaggedItems = useMemo(
    () => prices.filter((p) => {
      const srp = Number(p.srp || 0);
      const price = Number(p.price || 0);
      const prevPrice = getPreviousMonthPrice(p);

      // Filter 1: Price exceeds SRP
      // If SRP exists, check if price > SRP
      // If no SRP, check if price > previous month's price
      if (srp > 0) {
        if (price > srp) return true;
      } else {
        if (prevPrice > 0 && price > prevPrice) return true;
      }

      // Filter 2: Price drops 10% or more
      // If current price is 10% or lower compared to previous month's price
      if (prevPrice > 0 && price <= prevPrice * 0.9) return true;

      return false;
    }),
    [prices]
  );

  const flaggedByStore = useMemo(() => {
    const groups = {};
    flaggedItems.forEach((item) => {
      const key = item.store || "Unknown";
      // Skip if this store has already been printed
      if (printedStores.some(p => p.store === key)) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [flaggedItems, printedStores]);

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
    setExpandedStores(prev => {
      // If the clicked store is already open, close it (result: no open stores).
      if (prev.includes(storeKey)) return [];
      // Otherwise, open the clicked store and close any others (only one open at a time).
      return [storeKey];
    });
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
      const srpDisplay = srp > 0 ? formatCurrency(srp) : "--";
      const prevDisplay = prevMonthPrice > 0 ? formatCurrency(prevMonthPrice) : "N/A";
      const priceDisplay = price > 0 ? formatCurrency(price) : "N/A";
      const comparisonPrice = srp > 0 ? srp : prevMonthPrice;
      const hasVariance = (price !== 0 && comparisonPrice !== 0);
      const varianceDisplay = hasVariance ? formatCurrency(price - comparisonPrice) : "N/A";
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
            <th style="width: 11%;">Previous Price</th>
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
    setDraftedStore(items[0]?.store || "Unknown");
    return body;
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
    const items = prices.filter(p => selectedIds.includes(p.id));
    const store = items[0]?.store || "Unknown";
    setCurrentStore(store);
    setShowPrintConfirm(true);
  };

  const handlePrintCancel = () => setShowPrintConfirm(false);

  // Toggle replied state for a printed letter
  const handleToggleReplied = async (recordId, newValue) => {
    try {
      const res = await fetch(`http://localhost:5000/api/printed-letters/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replied: !!newValue })
      });
      if (!res.ok) throw new Error('Failed to update replied status');
      const updated = await res.json();
      setPrintedStores(prev => prev.map(p => p._id === updated._id ? { ...p, replied: !!updated.replied } : p));
    } catch (err) {
      console.error('Failed to update replied status:', err);
      // optimistic UI fallback: toggle locally
      setPrintedStores(prev => prev.map(p => p._id === recordId ? { ...p, replied: !!newValue } : p));
    }
  };

  const savePrintedRecord = async (record) => {
    if (!record || !record.store) return;
    try {
      const response = await fetch('http://localhost:5000/api/printed-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: record.store,
          datePrinted: record.datePrinted,
          deadline: record.deadline,
          copiesPrinted: record.copiesPrinted || 1
        })
      });

      if (response.ok) {
        const savedLetter = await response.json();
        setPrintedStores(prev => ([...prev, {
          _id: savedLetter._id,
          store: savedLetter.store,
          datePrinted: savedLetter.datePrinted,
          deadline: savedLetter.deadline,
          replied: !!savedLetter.replied,
          printedBy: savedLetter.printedBy || '',
          copiesPrinted: (typeof savedLetter.copiesPrinted === 'number' && savedLetter.copiesPrinted > 0) ? savedLetter.copiesPrinted : 1
        }]));
        console.log('✅ Letter tracking saved to database');
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Failed to save printed letter to database:', error);
      // Fallback to state-only update
      setPrintedStores(prev => ([...prev, {
        store: record.store,
        datePrinted: record.datePrinted,
        deadline: record.deadline,
        replied: false,
        printedBy: '',
        copiesPrinted: record.copiesPrinted || 1
      }]));
      // Also save to localStorage as backup
      localStorage.setItem("printedStores", JSON.stringify([
        ...printedStores,
        { store: record.store, datePrinted: record.datePrinted, deadline: record.deadline, replied: false, printedBy: '', copiesPrinted: record.copiesPrinted || 1 }
      ]));
    }
  };

  const handlePrintConfirm = () => {
    setShowPrintConfirm(false);
    const items = prices.filter(p => selectedIds.includes(p.id));
    const store = items[0]?.store || "Unknown";
    const alreadyPrinted = printedStores.some(p => p.store === store);
    const datePrinted = new Date();
    const deadline = addWorkingDays(datePrinted, 5);

    if (!alreadyPrinted) {
      setPendingPrintRecord({
        store,
        datePrinted: datePrinted.toISOString(),
        deadline: deadline.toISOString(),
        copiesPrinted: 1
      });
    } else {
      setPendingPrintRecord(null);
    }

    printResultShownRef.current = false;
    const promptForResult = () => {
      if (printResultShownRef.current) return;
      printResultShownRef.current = true;
      if (!alreadyPrinted) setShowPrintResultConfirm(true);
    };

    const printWindow = executePrint(promptForResult);
    if (printWindow) {
      const intervalId = setInterval(() => {
        if (printWindow.closed) {
          clearInterval(intervalId);
          promptForResult();
        }
      }, 500);
    }
  };

  const handlePrintResultCancel = () => {
    setShowPrintResultConfirm(false);
    setPendingPrintRecord(null);
  };

  const handlePrintResultConfirm = async () => {
    setShowPrintResultConfirm(false);
    if (pendingPrintRecord) {
      await savePrintedRecord(pendingPrintRecord);
      setPendingPrintRecord(null);
    }
  };

  // Reprint a previously recorded letter for a store (non-editable reprint)
  const handleReprint = (store) => {
    try {
      // Prefer flagged items used originally; fallback to all prices for store
      const items = (flaggedByStore && flaggedByStore[store])
        ? flaggedByStore[store]
        : prices.filter(p => getStoreValue(p) === String(store || '').trim());
      if (!items || items.length === 0) return;
      setCurrentStore(store);
      const html = generateContent(items);

      const record = printedStores.find(p => p.store === store);

      // When print completes, automatically persist the increment (no inline confirm)
      const onComplete = async () => {
        try {
          if (record && record._id) {
            const newCount = (record.copiesPrinted || 0) + 1;
            // optimistic update
            setPrintedStores(prev => prev.map(p => p._id === record._id ? { ...p, copiesPrinted: newCount } : p));
            // persist to server
            const res = await fetch(`http://localhost:5000/api/printed-letters/${record._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ copiesPrinted: newCount })
            });
            if (res.ok) {
              const updated = await res.json();
              setPrintedStores(prev => prev.map(p => p._id === updated._id ? { ...p, copiesPrinted: typeof updated.copiesPrinted === 'number' ? updated.copiesPrinted : newCount } : p));
            }
          } else {
            const datePrinted = new Date();
            const deadline = addWorkingDays(datePrinted, 5);
            await savePrintedRecord({ store, datePrinted: datePrinted.toISOString(), deadline: deadline.toISOString(), copiesPrinted: 1 });
          }
        } catch (err) {
          console.error('Failed to persist copies after reprint:', err);
        }
      };

      executePrintWithOverrides(onComplete, `Price Inquiry - ${store}`, html);
    } catch (err) {
      console.error('Failed to reprint:', err);
    }
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

  const executePrint = (onComplete) => {
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
      if (onComplete) onComplete();
    };
    printWindow.onafterprint = restoreEdit;
    printWindow.onbeforeunload = restoreEdit;
    return printWindow;
  };

  // Variant of executePrint that accepts explicit subject/content to avoid race with state
  const executePrintWithOverrides = (onComplete, subject, content) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${subject}</title>
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
            .received-table td { border: none; padding: 2px 0; vertical-align: bottom; }
            .received-table .label-cell { width: 200px; padding-right: 10px; }
            .received-table .colon-cell { width: 20px; }
            .received-table .line-cell { border-bottom: 1px solid #000; padding-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <table class="form-table">
                <tbody>
                  <tr>
                    <td class="form-label" rowSpan={3}>FORM</td>
                    <td style="width: 60px">Code</td>
                    <td style="width: 100px; text-align: center">FM-PSM-03</td>
                  </tr>
                  <tr>
                    <td>Rev.</td>
                    <td style="text-align: center">01</td>
                  </tr>
                  <tr>
                    <td>Date</td>
                    <td style="text-align: center">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}</td>
                  </tr>
                </tbody>
              </table>
              <div style="text-align: right; display: flex; align-items: center; gap: 0; margin-top: -15px">
                <img src="/logo-DTI.png" alt="DTI Philippines" style="height:95px; object-fit:contain; display:inline-block" onerror="this.style.display='none'" />
                <img src="/bagongPinas.png" alt="Bagong Pilipinas" style="height:115px; object-fit:contain; display:inline-block" onerror="this.style.display='none'" />
              </div>
            </div>
            ${content}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 400);

    const restoreEdit = () => {
      window.focus();
      setTimeout(focusPreview, 50);
      if (onComplete) onComplete();
    };
    printWindow.onafterprint = restoreEdit;
    printWindow.onbeforeunload = restoreEdit;
    return printWindow;
  };

  const selectedItems = prices.filter(p => selectedIds.includes(p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Inter', sans-serif" }}>
      {/* Response Tracker Section */}
      {printedStores.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h4 style={{ margin: 0, color: "#0f172a" }}>Response Tracker (5 Working Days)</h4>
            <span style={tagStyle}>{printedStores.length} letter(s) sent</span>
          </div>
          <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "360px" }}>
            {/* No inline create banner — automatic save occurs when printing completes */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748b", fontSize: "0.75rem" }}>
                  <th style={thStyle}>Store</th>
                  <th style={thStyle}>Date Printed</th>
                  <th style={thStyle}>Deadline</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Days Remaining</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Responded</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Reprint</th>
                </tr>
              </thead>
              <tbody>
                {printedStores.map((record, idx) => {
                  // Parse dates safely
                  const datePrintedObj = new Date(record.datePrinted);
                  const deadlineObj = new Date(record.deadline);
                  
                  // Format dates safely with fallback
                  const dateSent = !isNaN(datePrintedObj) 
                    ? datePrintedObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                    : "—";
                  const deadlineDate = !isNaN(deadlineObj)
                    ? deadlineObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                    : "—";
                  
                  const daysLeft = getWorkingDaysRemaining(record.deadline);
                  
                  let statusColor = "#059669"; // green - More than 3 days remaining
                  let statusText = `${daysLeft} day(s) left`;
                  let statusBg = "#d1fae5";
                  
                  if (daysLeft < 0) {
                    statusColor = "#dc2626";
                    statusText = "Overdue";
                    statusBg = "#fee2e2";
                  } else if (daysLeft === 0) {
                    statusColor = "#d97706";
                    statusText = "Due Today";
                    statusBg = "#fef3c7";
                  } else if (daysLeft <= 3) {
                    statusColor = "#d97706";
                    statusBg = "#fef3c7";
                  }
                  
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{record.store}</td>
                      <td style={tdStyle}>{dateSent}</td>
                      <td style={tdStyle}>{deadlineDate}</td>
                      <td style={{ ...tdStyle, fontWeight: "600", color: statusColor, textAlign: 'center' }}>{daysLeft >= 0 ? daysLeft : "—"}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          background: statusBg, 
                          color: statusColor, 
                          padding: "4px 10px", 
                          borderRadius: "12px", 
                          fontSize: "0.8rem", 
                          fontWeight: "700" 
                        }}>
                          {statusText}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!record.replied}
                          onChange={(e) => handleToggleReplied(record._id, e.target.checked)}
                          title="Mark as replied"
                          aria-label={`Replied ${record.store}`}
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => handleReprint(record.store)}
                          style={{ ...miniButtonStyle, background: '#0f172a', color: 'white' }}
                        >
                          Reprint
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flagged entries moved to the top */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h4 style={{ margin: 0, color: "#0f172a" }}>Flagged Entries</h4>
          <span style={tagStyle}>{Object.keys(flaggedByStore).length} {Object.keys(flaggedByStore).length === 1 ? 'store' : 'stores'}</span>
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
                            style={{ ...miniButtonStyle, background: draftedStore === storeKey ? "#16a34a" : "#0f172a", color: "white" }}
                          >
                            {draftedStore === storeKey ? "Drafted ✓" : "Draft letter"}
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
                                  <th style={thStyle}>Brand</th>
                                  <th style={thStyle}>Size/Unit</th>
                                  <th style={thStyle}>Current Price</th>
                                  <th style={thStyle}>Previous Price</th>
                                  <th style={thStyle}>SRP</th>
                                  <th style={thStyle}>Variance</th>
                                  <th style={thStyle}>Change %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => {
                                  const previousPriceDetail = getPreviousPriceForDetail(item);
                                  const comparisonPrice = Number(item.srp || 0) > 0 ? Number(item.srp) : previousPriceDetail;
                                  const v = Number(item.price || 0) - comparisonPrice;
                                  const percentChange = comparisonPrice > 0 ? ((v / comparisonPrice) * 100) : 0;
                                  const varianceColor = v < 0 ? "#f59e0b" : v > 0 ? "#dc2626" : "#0f172a";
                                  const changeColor = percentChange < 0 ? "#f59e0b" : percentChange > 0 ? "#dc2626" : "#0f172a";
                                  return (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                      <td style={tdStyle}>{item.commodity || "--"}</td>
                                      <td style={tdStyle}>{item.brand || "--"}</td>
                                      <td style={tdStyle}>{item.size || "--"}</td>
                                      <td style={tdStyle}>{formatCurrency(item.price)}</td>
                                      <td style={tdStyle}>{previousPriceDetail > 0 ? formatCurrency(previousPriceDetail) : "--"}</td>
                                      <td style={tdStyle}>{Number(item.srp) > 0 ? formatCurrency(item.srp) : "--"}</td>
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
                  contentEditable={!printedStores.some(p => p.store === currentStore)}
                  suppressContentEditableWarning
                  onInput={handlePreviewInput}
                  onFocus={handlePreviewFocus}
                  onBlur={handlePreviewBlur}
                  style={{ minHeight: "240px", outline: "none", opacity: printedStores.some(p => p.store === currentStore) ? 0.6 : 1, pointerEvents: printedStores.some(p => p.store === currentStore) ? "none" : "auto" }}
                />
                {printedStores.some(p => p.store === currentStore) && (
                  <div style={{ marginTop: "12px", padding: "12px", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", color: "#92400e" }}>
                    <strong>⚠️ This letter for {currentStore} has been printed.</strong> Editing is now locked. You can only print additional copies.
                  </div>
                )}
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

      {showPrintResultConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "16px", width: "420px", maxWidth: "92vw", boxShadow: "0 16px 44px rgba(0,0,0,0.22)" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#0f172a" }}>Did the print complete?</h4>
            <p style={{ margin: "0 0 16px 0", color: "#475569", fontSize: "0.95rem", lineHeight: 1.5, textAlign: "justify" }}>If you clicked <strong>Cancel</strong> in the print dialog, choose <strong>No</strong> so this letter won’t be recorded as printed and you can still edit it. Choose <strong>Yes</strong> only if the letter was successfully printed.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={handlePrintResultCancel} style={{ ...buttonStyle, background: "#e2e8f0", color: "#0f172a" }}>No</button>
              <button onClick={handlePrintResultConfirm} style={{ ...buttonStyle, background: "#0f172a", color: "white" }}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {/* Reprint confirmation is handled inline in the tracker rows/banner */}
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
  fontSize: "0.75rem",
  position: "sticky",
  top: 0,
  background: "#f8fafc",
  zIndex: 3
};


const tdStyle = {
  padding: "12px 8px",
  fontSize: "0.9rem",
  color: "#0f172a",
  textAlign: 'justify'
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
