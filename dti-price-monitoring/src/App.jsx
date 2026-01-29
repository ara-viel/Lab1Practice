import React, { useEffect, useState } from "react";
import ToastContainer from './components/ToastContainer.jsx';
import { addPriceData, getPriceData, deletePriceData, updatePriceData } from './services/priceService.js';
import { addBasicNecessitiesData, getBasicNecessitiesData, deleteBasicNecessitiesData, updateBasicNecessitiesData } from './services/basicNecessitiesService.js';
import { addPrimeCommoditiesData, getPrimeCommoditiesData, deletePrimeCommoditiesData, updatePrimeCommoditiesData } from './services/primeCommoditiesService.js';
import { addConstructionMaterialsData, getConstructionMaterialsData, deleteConstructionMaterialsData, updateConstructionMaterialsData } from './services/constructionMaterialsService.js';
import Dashboard from './components/Dashboard.jsx';
import Monitoring from './components/Monitoring.jsx';
import Inquiry from "./components/Inquiry.jsx";
import LoginPage from './components/LoginPage.jsx';
import ComparativeAnalysis from './components/ComparativeAnalysis.jsx';
import FileImport from './components/FileImport.jsx';
import DataManagement from './components/DataManagement.jsx';
import BasicNecessities from './components/BasicNecessities.jsx';
import PrimeCommodities from './components/PrimeCommodities.jsx';
import ConstructionMaterials from './components/ConstructionMaterials.jsx';
import LandingPage from './components/LandingPage.jsx';
import { LayoutDashboard, Activity, FileSearch, FileText, Menu as MenuIcon, Database, ArrowUp } from 'lucide-react';
import './assets/App.css';

function App() {
  const [prices, setPrices] = useState([]);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || "dashboard");
  const [showImport, setShowImport] = useState(false);
  const [isDataMgmtOpen, setIsDataMgmtOpen] = useState(false);
  const [dataMgmtTab, setDataMgmtTab] = useState(() => localStorage.getItem('dataMgmtTab') || "basic");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [form, setForm] = useState({ commodity: "", store: "", municipality: "", price: "", prevPrice: "", srp: "" });
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('user'));
  const [user, setUser] = useState(() => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  });
  const [showLoginPage, setShowLoginPage] = useState(false);

  useEffect(() => { localStorage.setItem("activeTab", activeTab); }, [activeTab]);
  useEffect(() => { if (activeTab !== "dataManagement") setIsDataMgmtOpen(false); }, [activeTab]);

  const loadData = async () => {
    try {
      // Fetch data from all three category collections and the general prices collection
      const [basicData, primeData, constructionData, generalData] = await Promise.all([
        getBasicNecessitiesData().catch(() => []),
        getPrimeCommoditiesData().catch(() => []),
        getConstructionMaterialsData().catch(() => []),
        getPriceData().catch(() => [])
      ]);
      
      // Combine all data
      const allData = [
        ...(basicData || []),
        ...(primeData || []),
        ...(constructionData || []),
        ...(generalData || [])
      ];
      
      console.log(`📊 Loaded ${allData.length} total records (Basic: ${basicData?.length || 0}, Prime: ${primeData?.length || 0}, Construction: ${constructionData?.length || 0}, General: ${generalData?.length || 0})`);
      setPrices(allData || []);
    } catch (error) {
      console.error("❌ Error loading data:", error);
      setPrices([]);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    if (!form.commodity || !form.price) {
      if (window.toast && window.toast.error) window.toast.error("Please fill in key fields");
      else alert("Please fill in key fields");
      return;
    }
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
    if (window.toast && window.toast.success) window.toast.success('Record successfully saved!');
  };

  const handleImportSuccess = async (importedData, category) => {
    try {
      let successCount = 0;
      const errors = [];
      
      // Log the categories being imported
      const categoryCounts = {};
      importedData.forEach(item => {
        const cat = item.category || 'unknown';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      console.log('📊 IMPORT CATEGORIES:', categoryCounts);
      console.log('📋 First 3 records:', importedData.slice(0, 3).map(r => ({ brand: r.brand, category: r.category, store: r.store, price: r.price })));
      
      // Helper function to route to correct service based on category
      const addToCorrectService = async (data, targetCategory) => {
        if (targetCategory === 'basic') {
          return await addBasicNecessitiesData(data);
        } else if (targetCategory === 'prime') {
          return await addPrimeCommoditiesData(data);
        } else if (targetCategory === 'construction') {
          return await addConstructionMaterialsData(data);
        } else {
          // For other categories like noche-buena, school-supplies, etc. - save to general collection
          return await addPriceData(data);
        }
      };
      
      for (let i = 0; i < importedData.length; i++) {
        const record = importedData[i];
        try {
          const normalized = {};
          Object.keys(record || {}).forEach(k => normalized[k.toLowerCase()] = record[k]);
          
          const dataToSave = {
            brand: normalized.brand || '',
            commodity: normalized.commodity || 'Unknown',
            category: normalized.category || '',
            month: normalized.month || '',
            price: Number(normalized.price) || 0,
            srp: normalized.srp === '' || normalized.srp === undefined ? '' : Number(normalized.srp),
            size: normalized.size || '',
            store: normalized.store || '',
            variant: normalized.variant || '',
            years: normalized.years || new Date().getFullYear().toString(),
            timestamp: normalized.timestamp || new Date().toISOString()
          };
          
          // Use the category from the data (which was set based on user selection)
          const targetCategory = normalized.category || 'basic';
          
          await addToCorrectService(dataToSave, targetCategory);
          successCount++;
        } catch (recordError) {
          console.error(`❌ Error importing record ${i + 1}:`, recordError);
          errors.push(`Record ${i + 1}: ${recordError.message}`);
        }
      }
      
      loadData(); // Reload all data
      if (successCount > 0) {
        if (window.toast && window.toast.success) {
          window.toast.success(`✅ Imported ${successCount} records successfully!`);
        }
      }
      if (errors.length > 0) {
        console.error('Import errors:', errors);
        if (window.toast && window.toast.error) {
          window.toast.error(`⚠️ ${errors.length} records failed. Check console for details.`);
        }
      }
    } catch (error) {
      console.error("❌ Error during import:", error);
      if (window.toast && window.toast.error) {
        window.toast.error(`Import failed: ${error.message}`);
      }
    }
    loadData(); 
    if (window.toast && window.toast.success) window.toast.success(`Imported ${importedData.length} records`);
  };

  const handleDeleteData = async (id) => {
    try {
      // Find the record to determine which collection to delete from
      const record = prices.find(p => p._id === id || p.id === id);
      
      if (record?.category === 'basic') {
        await deleteBasicNecessitiesData(id);
      } else if (record?.category === 'prime') {
        await deletePrimeCommoditiesData(id);
      } else if (record?.category === 'construction') {
        await deleteConstructionMaterialsData(id);
      } else {
        // Default to general collection for other categories
        await deletePriceData(id);
      }
      
      loadData();
      if (window.toast && window.toast.success) window.toast.success('Record successfully deleted!');
    } catch (error) {
      console.error("Error deleting data:", error);
      if (window.toast && window.toast.error) window.toast.error('Failed to delete record');
    }
  };

  const handleUpdateData = async (id, updatedData) => {
    try {
      // Find the record to determine which collection to update
      const record = prices.find(p => p._id === id || p.id === id);
      
      if (record?.category === 'basic') {
        await updateBasicNecessitiesData(id, updatedData);
      } else if (record?.category === 'prime') {
        await updatePrimeCommoditiesData(id, updatedData);
      } else if (record?.category === 'construction') {
        await updateConstructionMaterialsData(id, updatedData);
      } else {
        // Default to general collection for other categories
        await updatePriceData(id, updatedData);
      }
      
      loadData();
      if (window.toast && window.toast.success) window.toast.success('Record successfully updated!');
    } catch (error) {
      console.error("Error updating data:", error);
      if (window.toast && window.toast.error) window.toast.error('Failed to update record');
    }
  };

  const handleSelectDataMgmtTab = (subTab) => {
    setActiveTab("dataManagement");
    setDataMgmtTab(subTab);
    localStorage.setItem('dataMgmtTab', subTab);
    setIsDataMgmtOpen(true);
  };

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
    background: "#0f172a", 
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
    background: "#f8fafc", 
    minHeight: "100vh",
    padding: "40px"
  };

  // Authentication helpers
  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleLogin = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      setIsLoggedIn(true);
    }
  };

  // Pre-auth routes: Landing -> Login -> App
  if (!isLoggedIn) {
    if (showLoginPage) {
      return <LoginPage onAuthenticated={handleLogin} onHomeClick={() => setShowLoginPage(false)} />;
    }
    return <LandingPage onLoginClick={() => setShowLoginPage(true)} />;
  }

  return (
    <div className="app-root" style={{ ['--sidebar-width']: '260px', ['--content-padding']: '40px', ['--content-maxwidth']: '1200px' }}>
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
          <button className={`nav-item ${activeTab === 'comparativepriceanalysis' ? 'active' : ''}`} onClick={() => setActiveTab('comparativepriceanalysis')}>
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
              <button className={`sub-nav-item ${dataMgmtTab === 'construction' ? 'active' : ''}`} onClick={() => handleSelectDataMgmtTab('construction')}>
                <span>Construction Materials</span>
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

        {/* Welcome Container */}
        <div style={{
          background: '#ffffff',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '0.95rem', fontWeight: 600 }}>Welcome, Admin</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>You are logged in as {user?.fullName || user?.email || 'User'}</p>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }} onMouseEnter={(e) => e.target.style.background = '#b91c1c'} onMouseLeave={(e) => e.target.style.background = '#dc2626'}>
            <span>Logout</span>
          </button>
        </div>

        <div style={{ maxWidth: "1200px" }}>
          {activeTab === "dashboard" && <Dashboard prices={prices} />}
          {activeTab === "monitoring" && <Monitoring prices={prices} form={form} handleChange={handleChange} handleSave={handleSave} />}
          {activeTab === "comparativepriceanalysis" && <ComparativeAnalysis prices={prices} prevailingReport={prevailingReport} />}
          {activeTab === "inquiry" && <Inquiry prices={prices} />}
          {activeTab === "dataManagement" && dataMgmtTab === "basic" && (
            <BasicNecessities 
              prices={prices.filter(p => p.category === 'basic')}
              onAddData={addPriceData}
              onDeleteData={handleDeleteData}
              onUpdateData={handleUpdateData}
              onImportClick={() => setShowImport(true)}
            />
          )}
          {activeTab === "dataManagement" && dataMgmtTab === "prime" && (
            <PrimeCommodities 
              prices={prices.filter(p => p.category === 'prime')}
              onAddData={addPriceData}
              onDeleteData={handleDeleteData}
              onUpdateData={handleUpdateData}
              onImportClick={() => setShowImport(true)}
            />
          )}
          {activeTab === "dataManagement" && dataMgmtTab === "construction" && (
            <ConstructionMaterials 
              prices={prices.filter(p => p.category === 'construction')}
              onAddData={addPriceData}
              onDeleteData={handleDeleteData}
              onUpdateData={handleUpdateData}
              onImportClick={() => setShowImport(true)}
            />
          )}
          {activeTab === "dataManagement" && dataMgmtTab === "others" && (
            <DataManagement 
              prices={prices.filter(p => {
                return p.category !== 'basic' && p.category !== 'prime' && p.category !== 'construction';
              })}
              onAddData={addPriceData}
              onDeleteData={handleDeleteData}
              onUpdateData={handleUpdateData}
              onImportClick={() => setShowImport(true)}
              subTab={dataMgmtTab}
            />
          )}
        </div>
      </main>

      {showImport && <FileImport onImportSuccess={handleImportSuccess} onClose={() => setShowImport(false)} />}

      <ToastContainer />

      <div className="back-to-top">
        <button onClick={scrollToTop} title="Back to Top"><ArrowUp size={30} /></button>
      </div>
    </div>
  );
}

export default App;