import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from "docx";

// Generate PDF report from a provided data source and options
export async function generatePDF({ reportSource = [], selectedReportMonth, selectedReportYear, selectedCommodity = null, selectedBrand = null, summaryNarrative = "", MONTHS = [], getStatusLabel = () => ({ label: 'UNKNOWN' }) }) {
  const pdf = new jsPDF("l", "mm", "letter");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 15;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  pdf.setFont("helvetica", "normal");

  // Title and Date
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  let reportTitle = "Comparative Price Analysis Report";
  if (selectedCommodity) reportTitle += ` — ${String(selectedCommodity)}`;
  if (selectedBrand) reportTitle += ` (${String(selectedBrand)})`;
  if (selectedReportMonth && selectedReportYear) {
    reportTitle += ` for ${MONTHS[selectedReportMonth - 1]} ${selectedReportYear}`;
  }
  pdf.text(reportTitle, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 12;

  // Narrative
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  let summaryTitle = "Situationer";
  if (selectedReportMonth && selectedReportYear) {
    summaryTitle += ` for ${MONTHS[selectedReportMonth - 1]} ${selectedReportYear}`;
  }
  pdf.text(summaryTitle, marginLeft, yPosition);
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  const pdfNarrative = summaryNarrative.replace(/₱/g, "Php ");
  const narrativeLines = pdf.splitTextToSize(pdfNarrative, contentWidth);
  narrativeLines.forEach((line) => {
    pdf.text(line, marginLeft, yPosition);
    yPosition += 5;
  });
  yPosition += 12;

  // Helpers
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return `Php ${n.toFixed(2)}`;
  };
  const formatSignedCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const val = Number(value);
    if (!Number.isFinite(val)) return "--";
    const sign = val < 0 ? "-" : "";
    return `${sign}Php ${Math.abs(val).toFixed(2)}`;
  };
  const formatSignedPercent = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const val = Number(value);
    if (!Number.isFinite(val)) return "--";
    const sign = val < 0 ? "-" : "";
    return `${sign}${Math.abs(val).toFixed(1)}%`;
  };
  const sanitize = (v) => String(v ?? "").replace(/±/g, "");
  // Format currency for Stores table: no '+' for positives, use 'Php' prefix, '-' for negatives
  const formatCurrencyNoPlus = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const val = Number(value);
    if (!Number.isFinite(val)) return "--";
    return (val < 0 ? "-" : "") + `Php ${Math.abs(val).toFixed(2)}`;
  };

  // Determine top lists from reportSource
  const top5Highest = [...reportSource].sort((a, b) => ( (b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : -Infinity) - ( (a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : -Infinity)).slice(0, 5);
  const top5Lowest = [...reportSource].sort((a, b) => ( (a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : Infinity) - ( (b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : Infinity)).slice(0, 5);

  // Top 5 Highest
  let reportYPosition = yPosition;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Top 5 Highest Price Increases", marginLeft, reportYPosition);
  reportYPosition += 8;

  const highestTableData = top5Highest.map(item => {
    const statusInfo = getStatusLabel(item.statusType);
    const storeField = Array.isArray(item._stores) && item._stores.length ? item._stores.join(', ') : (item.store || "--");
    return [
      item.brand || "--",
      item.commodity,
      item.size || "--",
      storeField,
      formatCurrency(item.previousPrice),
      formatCurrency(item.srp),
      formatCurrency(item.currentPrice),
      formatSignedCurrency(item.priceChange),
      formatSignedPercent(item.percentChange),
      statusInfo.label
    ];
  });

  autoTable(pdf, {
    head: [["BRAND","COMMODITY", "SIZE","STORE", "PREVIOUS PRICE", "SRP", "CURRENT PRICE", "PRICE CHANGE (₱)", "CHANGE (%)", "STATUS"]],
    body: highestTableData,
    startY: reportYPosition,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: "bold", halign: 'center' },
    alternateRowStyles: { fillColor: [254, 226, 226] }
  });

  // Lowest
  reportYPosition = pdf.lastAutoTable.finalY + 12;
  if (reportYPosition > pageHeight - 60) {
    pdf.addPage();
    reportYPosition = 15;
  }

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  yPosition += 8;

  const exportSource = reportSource;
    const tableData = exportSource.map(item => {
    const storeField = Array.isArray(item._stores) && item._stores.length ? item._stores.join(', ') : (item.store || "--");
    return [
      sanitize(item.brand || "--"),
      sanitize(item.commodity),
      sanitize(item.size || "--"),
      sanitize(storeField),
        sanitize(formatCurrency(item.prevailingPrice)),
        sanitize(formatCurrency(item.srp)),
        sanitize(formatCurrency(item.currentPrice)),
        sanitize(formatSignedCurrency(item.priceChange)),
        sanitize(formatSignedPercent(item.percentChange)),
      sanitize(item.isCompliant ? "Compliant" : "Non-Compliant")
    ];
  });

  const lowestTableData = top5Lowest.map(item => {
    const statusInfo = getStatusLabel(item.statusType);
    const storeField = Array.isArray(item._stores) && item._stores.length ? item._stores.join(', ') : (item.store || "--");
    return [
      item.brand || "--",
      item.commodity,
      item.size || "--",
      storeField,
      formatCurrency(item.previousPrice),
      formatCurrency(item.srp),
      formatCurrency(item.currentPrice),
      formatSignedCurrency(item.priceChange),
      formatSignedPercent(item.percentChange),
      statusInfo.label
    ];
  });

  autoTable(pdf, {
    head: [["BRAND","COMMODITY","SIZE", "STORE", "PREVIOUS PRICE", "SRP", "CURRENT PRICE", "PRICE CHANGE (₱)", "CHANGE (%)", "STATUS"]],
    body: lowestTableData,
    startY: reportYPosition,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: "bold", halign: 'center' },
    alternateRowStyles: { fillColor: [220, 252, 231] }
  });

  // Stores with Highest SRP
  reportYPosition = pdf.lastAutoTable.finalY + 12;
  if (reportYPosition > pageHeight - 60) {
    pdf.addPage();
    reportYPosition = 15;
  }

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Stores with Highest Average SRP", marginLeft, reportYPosition);
  reportYPosition += 8;

  const storesHighestSRP = (() => {
    const storeData = {};
    reportSource.forEach(item => {
      const storeKey = Array.isArray(item._stores) && item._stores.length ? item._stores.join(', ') : (item.store || null);
      if (storeKey && item.srp !== null && item.srp !== undefined) {
        if (!storeData[storeKey]) storeData[storeKey] = [];
        const n = Number(item.srp);
        if (Number.isFinite(n)) storeData[storeKey].push(n);
      }
    });
    return Object.entries(storeData)
      .map(([store, srps]) => ({ store, avgSRP: srps.reduce((a, b) => a + b, 0) / srps.length, maxSRP: Math.max(...srps), productCount: srps.length }))
      .sort((a, b) => b.avgSRP - a.avgSRP)
      .slice(0, 5);
  })();

  const storesTableData = storesHighestSRP.map(item => [
    sanitize(item.store),
    sanitize(formatCurrencyNoPlus(item.avgSRP)),
    sanitize(formatCurrencyNoPlus(item.maxSRP)),
    sanitize(item.productCount.toString())
  ]);

  autoTable(pdf, {
    head: [["STORE", "AVERAGE SRP", "MAX SRP", "PRODUCTS"]],
    body: storesTableData,
    startY: reportYPosition,
    margin: { top: 10, right: 10, bottom: 10, left: 10 },
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: "bold", halign: 'center' },
    alternateRowStyles: { fillColor: [235, 245, 254] }
  });

  const footerYPosition = pdf.lastAutoTable.finalY || reportYPosition;
  if (footerYPosition < pageHeight - 20) {
    pdf.setFontSize(9);
    pdf.text("This report summarizes prevailing prices and compliance status across monitored establishments.", 15, footerYPosition + 10);
  }

  pdf.save(`Comparative_Analysis_${selectedReportYear || "AllYears"}_${selectedReportMonth ? MONTHS[selectedReportMonth - 1] : "AllMonths"}.pdf`);
}

export async function generateWord({ reportSource = [], selectedReportMonth, selectedReportYear, selectedCommodity = null, selectedBrand = null, summaryNarrative = "", getStatusLabel = () => ({ label: 'UNKNOWN' }) }) {
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const n = Number(value);
    if (!Number.isFinite(n)) return "--";
    return `Php ${n.toFixed(2)}`;
  };
  const formatSignedCurrency = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const val = Number(value);
    if (!Number.isFinite(val)) return "--";
    const sign = val < 0 ? "-" : "";
    return `${sign}Php ${Math.abs(val).toFixed(2)}`;
  };
  const formatSignedPercent = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const val = Number(value);
    if (!Number.isFinite(val)) return "--";
    const sign = val < 0 ? "-" : "";
    return `${sign}${Math.abs(val).toFixed(1)}%`;
  };
  const sanitize = v => String(v ?? "").replace(/±/g, "").replace(/\+/g, "");

  const top5Highest = [...reportSource].sort((a, b) => ((b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : -Infinity) - ((a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : -Infinity)).slice(0,5);
  const top5Lowest = [...reportSource].sort((a, b) => ((a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : Infinity) - ((b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : Infinity)).slice(0,5);
  const storesHighestSRP = (() => {
    const storeData = {};
    reportSource.forEach(item => {
      if (item.store && item.srp !== null && item.srp !== undefined) {
        if (!storeData[item.store]) storeData[item.store] = [];
        const n = Number(item.srp);
        if (Number.isFinite(n)) storeData[item.store].push(n);
      }
    });
    return Object.entries(storeData)
      .map(([store, srps]) => ({ store, avgSRP: srps.reduce((a,b)=>a+b,0)/srps.length, maxSRP: Math.max(...srps), productCount: srps.length }))
      .sort((a,b)=>b.avgSRP - a.avgSRP)
      .slice(0,5);
  })();

  const makeTable = (headers, rows) => {
    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({
        shading: { fill: "1F2937" },
        children: [
          new Paragraph({
            children: [ new TextRun({ text: String(h).toUpperCase(), bold: true, color: "FFFFFF" }) ],
            alignment: "center"
          })
        ]
      }))
    });

    const dataRows = rows.map(row => new TableRow({ children: row.map(cell => new TableCell({ children: [ new Paragraph({ text: String(cell), alignment: "center" }) ] })) }));
    return [headerRow, ...dataRows];
  };

  const highestHeaders = ["Brand","Commodity","Size","Store", "Previous Price", "SRP", "Current Price", "Price Change (₱)", "Change (%)", "Status"];
  const highestRows = top5Highest.map(item => {
    const storeField = Array.isArray(item._stores) && item._stores.length ? item._stores.join(', ') : (item.store || "--");
    return [
      sanitize(item.brand || "--"),
      sanitize(item.commodity),
      sanitize(item.size || "--"),
      sanitize(storeField),
      sanitize(formatCurrency(item.previousPrice)),
      sanitize(formatCurrency(item.srp)),
      sanitize(formatCurrency(item.currentPrice)),
      sanitize(formatSignedCurrency(item.priceChange)),
      sanitize(formatSignedPercent(item.percentChange)),
      sanitize(getStatusLabel(item.statusType).label)
    ];
  });

  const lowestHeaders = ["Brand","Commodity","Size","Store", "Previous Price", "SRP", "Current Price", "Price Change (₱)", "Change (%)", "Status"];
  const lowestRows = top5Lowest.map(item => {
    const storeField = Array.isArray(item._stores) && item._stores.length ? item._stores.join(', ') : (item.store || "--");
    return [
      sanitize(item.brand || "--"),
      sanitize(item.commodity),
      sanitize(item.size || "--"),
      sanitize(storeField),
      sanitize(formatCurrency(item.previousPrice)),
      sanitize(formatCurrency(item.srp)),
      sanitize(formatCurrency(item.currentPrice)),
      sanitize(formatSignedCurrency(item.priceChange)),
      sanitize(formatSignedPercent(item.percentChange)),
      sanitize(getStatusLabel(item.statusType).label)
    ];
  });

  const storesHeaders = ["Store", "Average SRP", "Max SRP", "Products"];
  const storesRows = storesHighestSRP.map(item => [ item.store, formatCurrency(item.avgSRP), formatCurrency(item.maxSRP), item.productCount ]);

  const narrativeLines = summaryNarrative.replace(/\r?\n|\r/g, " ").trim().split(/\n|\r/).filter(Boolean);

  const doc = new Document({ sections: [{ properties: {}, children: [ new Paragraph({ text: "Comparative Price Analysis Report", heading: "Heading1", spacing: { after: 200 } }), new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, spacing: { after: 200 } }), new Paragraph({ text: "Situationer", heading: "Heading2", spacing: { after: 100 } }), ...narrativeLines.map(line => new Paragraph({ text: line, spacing: { after: 80 } })), new Paragraph({ text: "Top 5 Highest Price Increases", heading: "Heading2", spacing: { after: 100 } }), new Table({ rows: makeTable(highestHeaders, highestRows) }), new Paragraph({ text: "Top 5 Lowest Price Changes (Decreases)", heading: "Heading2", spacing: { after: 100 } }), new Table({ rows: makeTable(lowestHeaders, lowestRows) }), new Paragraph({ text: "Stores with Highest Average SRP", heading: "Heading2", spacing: { after: 100 } }), new Table({ rows: makeTable(storesHeaders, storesRows) }), new Paragraph({ text: "This report summarizes prevailing prices and compliance status across monitored establishments.", spacing: { before: 200, after: 100 } }) ] }] });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Comparative_Analysis_${new Date().toISOString().split("T")[0]}.docx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
