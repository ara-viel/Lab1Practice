import React, { useEffect, useState } from "react";
import { addPriceData, getPriceData, deletePriceData, updatePriceData } from './services/priceService.js';
import Dashboard from './components/Dashboard.jsx';
import Monitoring from './components/Monitoring.jsx';
import Inquiry from "./components/Inquiry.jsx";
import ComparativeAnalysis from './components/ComparativeAnalysis.jsx';
import FileImport from './components/FileImport.jsx';
import DataManagement from './components/DataManagement.jsx';

import { LayoutDashboard, Activity, FileSearch, FileText, Menu as MenuIcon, Database, ArrowUp } from 'lucide-react';
import './assets/App.css';

function App() {
  const [prices, setPrices] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showImport, setShowImport] = useState(false);
  const [isDataMgmtOpen, setIsDataMgmtOpen] = useState(false);
  const [dataMgmtTab, setDataMgmtTab] = useState("basic");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [form, setForm] = useState({ commodity: "", store: "", municipality: "", price: "", prevPrice: "", srp: "" });

  useEffect(() => { localStorage.setItem("activeTab", activeTab); }, [activeTab]);
  useEffect(() => { if (activeTab !== "dataManagement") setIsDataMgmtOpen(false); }, [activeTab]);

  const loadData = async () => {
    const data = await getPriceData();
    setPrices(data || []);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

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
    setActiveTab("dashboard");
  };

  const handleImportSuccess = async (importedData, category) => {
    for (const record of importedData) {
      const normalized = {};
      Object.keys(record || {}).forEach(k => normalized[k.toLowerCase()] = record[k]);
      await addPriceData({
        brand: normalizedRecord.brand || '',
        commodity: normalizedRecord.commodity || 'Unknown',
        month: normalizedRecord.month || '',
        price: Number(normalizedRecord.price) || 0,
        size: normalizedRecord.size || '',
        store: normalizedRecord.store || '',
        variant: normalizedRecord.variant || '',
        years: normalizedRecord.years || new Date().getFullYear().toString(),
        timestamp: normalizedRecord.timestamp || new Date().toISOString()
      });
    }
    loadData(); // Reload all data
  };

  const handleDeleteData = async (id) => {
    try {
      await deletePriceData(id);
      loadData();
    } catch (error) {
      console.error("Error deleting data:", error);
      alert("Failed to delete record");
    }
  };

  const handleUpdateData = async (id, updatedData) => {
    try {
      await updatePriceData(id, updatedData);
      loadData();
    } catch (error) {
      console.error("Error updating data:", error);
      alert("Failed to update record");
    }
  };

  const handleSelectDataMgmtTab = (subTab) => { setActiveTab("dataManagement"); setDataMgmtTab(subTab); setIsDataMgmtOpen(true); };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const calculatePrevailing = () => {
    const grouped = prices.reduce((acc, item) => {
      if (!acc[item.commodity]) acc[item.commodity] = [];
      acc[item.commodity].push(item);
      return acc;
    }, {});
    return Object.keys(grouped).map(name => {
      const items = grouped[name];
      const pList = items.map(i => i.price);
      const srp = items[0]?.srp || 0;
      const freq = {};
      let maxFreq = 0;
      pList.forEach(p => { freq[p] = (freq[p] || 0) + 1; if (freq[p] > maxFreq) maxFreq = freq[p]; });
      const modes = Object.keys(freq).filter(p => freq[p] === maxFreq);
      let prevailing;
      if (maxFreq > 1 && modes.length === 1) prevailing = Number(modes[0]);
      else {
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
    comparativepriceanalysis: "Comparative Price Analysis",
    inquiry: "Letter of Inquiry",
    dataManagement: "Data Management"
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

  const subNavItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 18px",
    margin: "2px 16px 2px 32px",
    background: isActive ? "#1e293b" : "transparent",
    border: "none",
    color: isActive ? "#38bdf8" : "#94a3b8",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "0.9rem",
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
    <div className="app-root" style={{ ['--sidebar-width']: sidebarWidth, ['--content-padding']: contentPadding, ['--content-maxwidth']: contentMaxWidth }}>
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button className="icon-btn" onClick={() => setIsSidebarCollapsed(prev => !prev)} aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <MenuIcon size={20} color="#0f172a" />
          </button>
          {!isSidebarCollapsed && <span className="brand">DTI MONITOR</span>}
        </div>

        <nav className="nav-list">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="icon"><LayoutDashboard size={18} /></span>
            <span className="nav-label">Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
            <span className="icon"><Activity size={18} /></span>
            <span className="nav-label">Monitoring</span>
          </button>
          <button className={`nav-item ${activeTab === 'comparative price analysis' ? 'active' : ''}`} onClick={() => setActiveTab('comparative price analysis')}>
            <span className="icon"><FileSearch size={18} /></span>
            <span className="nav-label">Comparative Price Analysis</span>
          </button>
          <button className={`nav-item ${activeTab === 'inquiry' ? 'active' : ''}`} onClick={() => setActiveTab('inquiry')}>
            <span className="icon"><FileText size={18} /></span>
            <span className="nav-label">Letter of Inquiry</span>
          </button>
          <button className={`nav-item ${activeTab === 'dataManagement' ? 'active' : ''}`} onClick={() => { setActiveTab('dataManagement'); setIsDataMgmtOpen(prev => !prev); }}>
            <span className="icon"><Database size={18} /></span>
            <span className="nav-label">Data Management</span>
          </button>

          {isDataMgmtOpen && (
            <div>
              <button className={`sub-nav-item ${dataMgmtTab === 'basic' ? 'active' : ''}`} onClick={() => handleSelectDataMgmtTab('basic')}>
                <span>Basic Necessities</span>
              </button>
              <button className={`sub-nav-item ${dataMgmtTab === 'prime' ? 'active' : ''}`} onClick={() => handleSelectDataMgmtTab('prime')}>
                <span>Prime Commodities</span>
              </button>
              <button className={`sub-nav-item ${dataMgmtTab === 'others' ? 'active' : ''}`} onClick={() => handleSelectDataMgmtTab('others')}>
                <span>Other Categories</span>
              </button>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">v1.0.4 • System Stable</div>
      </aside>

      <main className="content">
        <header className="content-header">
          <div>
            <h1 className="header-title">{tabLabels[activeTab] || ''}</h1>
            <p className="header-sub">Welcome back, Monitoring Officer</p>
          </div>
        </header>

        <div style={{ maxWidth: "1200px" }}>
          {activeTab === "dashboard" && <Dashboard prices={prices} />}
          {activeTab === "monitoring" && <Monitoring prices={prices} form={form} handleChange={handleChange} handleSave={handleSave} />}
          {activeTab === "comparative price analysis" && <ComparativeAnalysis prices={prices} prevailingReport={prevailingReport} />}
          {activeTab === "inquiry" && <Inquiry prices={prices} />}
          {activeTab === "dataManagement" && (
            <DataManagement 
              prices={prices} 
              onAddData={addPriceData}
              onDeleteData={handleDeleteData}
              onUpdateData={handleUpdateData}
              onImportClick={() => setShowImport(true)}
            />
          )}
        </div>
      </main>

      {showImport && <FileImport onImportSuccess={handleImportSuccess} onClose={() => setShowImport(false)} />}

      <div className="back-to-top">
        <button onClick={scrollToTop} title="Back to Top"><ArrowUp size={30} /></button>
      </div>
    </div>
  );
}

export default App;