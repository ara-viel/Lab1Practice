import React, { useEffect, useState } from "react";
import { addPriceData, getPriceData } from './services/priceService.js';
import Dashboard from './components/Dashboard.jsx';
import Monitoring from './components/Monitoring.jsx';
import Inquiry from "./components/Inquiry.jsx";
import Analysis from './components/Analysis.jsx';
<<<<<<< HEAD
=======
import ComparativeAnalysis from './components/ComparativeAnalysis.jsx';
<<<<<<< HEAD
import FileImport from './components/FileImport.jsx';
=======
>>>>>>> 6f6d8a15ce4bc9741452519e1e8c394528d90b2e
>>>>>>> 135079860c17bf4b6e84224f3bd6771844d38c1d
// Optional: npm install lucide-react
import { LayoutDashboard, Activity, FileSearch, Menu as MenuIcon, Upload } from 'lucide-react';

function App() {
  const [prices, setPrices] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({
    commodity: "", store: "", municipality: "", price: "", prevPrice: "", srp: ""
  });

  const loadData = async () => {
    const data = await getPriceData();
    setPrices(data);
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!form.commodity || !form.price) return alert("Please fill in key fields");
    await addPriceData({
      ...form,
      price: Number(form.price),
      prevPrice: Number(form.prevPrice),
      srp: Number(form.srp),
      timestamp: new Date().toISOString()
    });
    setForm({ commodity: "", store: "", municipality: "", price: "", prevPrice: "", srp: "" });
    loadData();
    setActiveTab("dashboard"); // Redirect to overview after saving
  };

  const handleImportSuccess = async (importedData) => {
    // Add each imported record to the database
    for (const record of importedData) {
      await addPriceData({
        ...record,
        price: Number(record.price),
        prevPrice: Number(record.prevPrice),
        srp: Number(record.srp),
        timestamp: record.timestamp || new Date().toISOString()
      });
    }
    loadData(); // Reload all data
  };

  // --- PREVAILING PRICE CALCULATION ---
  const calculatePrevailing = () => {
    const grouped = prices.reduce((acc, item) => {
      if (!acc[item.commodity]) acc[item.commodity] = [];
      acc[item.commodity].push(item);
      return acc;
    }, {});

    return Object.keys(grouped).map(name => {
      const items = grouped[name];
      const pList = items.map(i => i.price);
      const srp = items[0].srp || 0;
      const freq = {};
      let maxFreq = 0;
      pList.forEach(p => { 
        freq[p] = (freq[p] || 0) + 1; 
        if(freq[p] > maxFreq) maxFreq = freq[p]; 
      });
      const modes = Object.keys(freq).filter(p => freq[p] === maxFreq);

      let prevailing;
      if (maxFreq > 1 && modes.length === 1) {
        prevailing = Number(modes[0]);
      } else {
        const validUnderSRP = pList.filter(p => p <= srp);
        prevailing = validUnderSRP.length > 0 ? Math.max(...validUnderSRP) : Math.max(...pList);
      }
      return { commodity: name, prevailing, srp };
    });
  };

  const prevailingReport = calculatePrevailing();

  const tabLabels = {
    dashboard: "Dashboard",
    monitoring: "Monitoring",
    analysis: "Price Analysis",
    inquiry: "Letter of Inquiry"
  };

  // --- MODERN STYLES ---
  const sidebarStyle = {
    width: "260px",
    background: "#0f172a", // Deep Navy
    color: "#f8fafc",
    minHeight: "100vh",
    position: "fixed",
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 10px rgba(0,0,0,0.05)"
  };

  const navItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 20px",
    margin: "4px 16px",
    background: isActive ? "#334155" : "transparent",
    border: "none",
    color: isActive ? "#38bdf8" : "#94a3b8",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontWeight: "600",
    textAlign: "left",
    transition: "all 0.2s ease"
  });

  const contentStyle = {
    marginLeft: "260px",
    flex: 1,
    background: "#f8fafc", // Light gray-blue background
    minHeight: "100vh",
    padding: "40px"
  };

  return (
    <div style={{ display: "flex", fontFamily: "'Inter', sans-serif" }}>
      {/* SIDEBAR */}
      <div style={sidebarStyle}>
        <div style={{ padding: "32px 24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ background: "#38bdf8", padding: "6px", borderRadius: "8px" }}>
            <MenuIcon size={20} color="#0f172a" />
          </div>
          <span style={{ fontWeight: "800", fontSize: "1.2rem", letterSpacing: "-0.5px" }}>DTI MONITOR</span>
        </div>
        
        <div style={{ flex: 1 }}>
          <button style={navItemStyle(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button style={navItemStyle(activeTab === "monitoring")} onClick={() => setActiveTab("monitoring")}>
            <Activity size={18} /> Monitoring
          </button>
          <button style={navItemStyle(activeTab === "analysis")} onClick={() => setActiveTab("analysis")}>
            <FileSearch size={18} /> Price Analysis
          </button>
<<<<<<< HEAD
=======
          <button style={navItemStyle(activeTab === "inquiry")} onClick={() => setActiveTab("inquiry")}>
            <FileSearch size={18} /> Letter of Inquiry
          </button>
          <button style={navItemStyle(activeTab === "comparative")} onClick={() => setActiveTab("comparative")}>
            <FileSearch size={18} /> Comparative Analysis
          </button>
>>>>>>> 6f6d8a15ce4bc9741452519e1e8c394528d90b2e
        </div>

        <div style={{ padding: "20px", borderTop: "1px solid #1e293b", fontSize: "0.75rem", color: "#475569" }}>
          v1.0.4 • System Stable
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={contentStyle}>
        <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", color: "#0f172a", fontWeight: "800" }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>Welcome back, Monitoring Officer</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
             <button 
               style={secondaryButtonStyle}
               onClick={() => setShowImport(true)}
             >
               <Upload size={16} style={{ display: "inline", marginRight: "6px" }} />
               Import Data
             </button>
             <button style={primaryButtonStyle} onClick={() => setActiveTab("monitoring")}>+ New Entry</button>
          </div>
        </header>

        <div style={{ maxWidth: "1200px" }}>
          {activeTab === "dashboard" && <Dashboard prices={prices} />}
          {activeTab === "monitoring" && <Monitoring prices={prices} form={form} handleChange={handleChange} handleSave={handleSave} />}
          {activeTab === "analysis" && <Analysis prevailingReport={prevailingReport} />}
<<<<<<< HEAD
=======
          {activeTab === "inquiry" && <Inquiry prices={prices} />}
          {activeTab === "comparative" && <ComparativeAnalysis prices={prices} prevailingReport={prevailingReport} />}
>>>>>>> 6f6d8a15ce4bc9741452519e1e8c394528d90b2e
        </div>
      </div>

      {/* FILE IMPORT MODAL */}
      {showImport && (
        <FileImport 
          onImportSuccess={handleImportSuccess}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// Reusable Button Styles
const primaryButtonStyle = {
  background: "#0f172a",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  background: "white",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  padding: "10px 18px",
  borderRadius: "8px",
  fontWeight: "600",
  cursor: "pointer"
};

export default App;