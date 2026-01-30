import React, { useState, useMemo, useEffect } from "react";
import { Trash2, Edit, Download, Plus, X, Check, Search, ArrowUpDown, ChevronLeft, ChevronRight, Calendar, Upload } from "lucide-react";
import "../assets/DataManagement.css";
import AddRecordModal from "../modals/AddRecordModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import EditRecordModal from "../modals/EditRecordModal";
import { deletePrimeCommoditiesData } from "../services/primeCommoditiesService";

export default function PrimeCommodities({ prices, onAddData, onDeleteData, onUpdateData, onImportClick }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [newForm, setNewForm] = useState({
    brand: "", commodity: "", month: "", price: "", size: "", store: "", variant: "", years: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, itemId: null, isBulk: false });

  const resolveId = (item, fallbackIndex) => item?._id || item?.id || item?.timestamp || `${item?.commodity || "row"}-${item?.store || ""}-${item?.price || ""}-${fallbackIndex ?? ""}`;

  // Search and filter logic
  const filteredData = useMemo(() => {
    if (!prices) return [];
    
    return prices.filter(item => {
      // Only show PRIME COMMODITIES (category = "prime")
      if (item.category !== 'prime') {
        return false;
      }
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (
        (item.commodity?.toLowerCase() || "").includes(searchLower) ||
        (item.store?.toLowerCase() || "").includes(searchLower) ||
        (item.brand?.toLowerCase() || "").includes(searchLower) ||
        (item.variant?.toLowerCase() || "").includes(searchLower)
      );

      // Year filter
      if (selectedYear !== "all") {
        const itemYear = item.years || new Date(item.timestamp).getFullYear();
        if (itemYear.toString() !== selectedYear) {
          return false;
        }
      }

      // Month filter
      if (selectedMonth !== "all") {
        const itemMonth = item.month?.toLowerCase() || "";
        if (!itemMonth.includes(selectedMonth.toLowerCase())) {
          return false;
        }
      }

      // Store filter
      if (selectedStore !== "all") {
        const itemStore = (item.store || "").toLowerCase();
        if (itemStore !== selectedStore.toLowerCase()) {
          return false;
        }
      }

      return matchesSearch;
    });
  }, [prices, searchTerm, selectedYear, selectedMonth, selectedStore]);

  useEffect(() => {
    // Remove selections that are no longer in the filtered set
    const validIds = new Set(filteredData.map((item, idx) => resolveId(item, idx)));
    setSelectedIds(prev => {
      const next = new Set();
      prev.forEach(id => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredData]);

  // Get available stores from data
  const availableStores = useMemo(() => {
    if (!prices || prices.length === 0) return [];
    
    const stores = new Set();
    prices.forEach(item => {
      if (item.category === 'prime' && item.store) {
        stores.add(item.store);
      }
    });
    
    return Array.from(stores).sort();
  }, [prices]);

  // Get available years from data
  const availableYears = useMemo(() => {
    if (!prices || prices.length === 0) return [];
    
    const years = new Set();
    prices.forEach(item => {
      if (item.timestamp) {
        const year = new Date(item.timestamp).getFullYear();
        if (!isNaN(year)) {
          years.add(year);
        }
      }
    });
    
    // Add 2014-2025 even if no data
    for (let year = 2014; year <= 2025; year++) {
      years.add(year);
    }
    
    return Array.from(years).sort((a, b) => b - a);
  }, [prices]);

  // Sort logic
  const sortedData = useMemo(() => {
    let sorted = [...filteredData];
    
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle dates
        if (sortConfig.key === "timestamp") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle numbers
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        // Handle strings
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }
    return sorted;
  }, [filteredData, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIdx, startIdx + itemsPerPage);
  }, [sortedData, currentPage]);

  const toggleSelectRow = (item, idx) => {
    const id = resolveId(item, idx);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((item, idx) => resolveId(item, idx))));
    }
  };

  const currentPageIds = paginatedData.map((item, idx) => resolveId(item, idx + (currentPage - 1) * itemsPerPage));
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const findItemByResolvedId = (resolvedId) =>
    filteredData.find((item, idx) => resolveId(item, idx) === resolvedId) ||
    sortedData.find((item, idx) => resolveId(item, idx) === resolvedId) ||
    prices?.find((item, idx) => resolveId(item, idx) === resolvedId);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ isOpen: true, itemId: null, isBulk: true });
  };

  const confirmBulkDelete = async () => {
    const idsArray = Array.from(selectedIds);
    let successCount = 0;
    let errorCount = 0;
    
    for (const rid of idsArray) {
      try {
        const item = findItemByResolvedId(rid);
        const effectiveId = item?._id || item?.id || rid;
        if (effectiveId) {
          await deletePrimeCommoditiesData(effectiveId);
          successCount++;
        }
      } catch (error) {
        errorCount++;
        console.error("Error deleting:", error);
      }
    }
    
    setSelectedIds(new Set());
    setCurrentPage(1);
    
    // Show single toast message with count
    if (successCount > 0) {
      if (window.toast && window.toast.success) {
        window.toast.success(`✅ Successfully deleted ${successCount} record${successCount > 1 ? 's' : ''}!`);
      }
    }
    if (errorCount > 0) {
      if (window.toast && window.toast.error) {
        window.toast.error(`⚠️ Failed to delete ${errorCount} record${errorCount > 1 ? 's' : ''}`);
      }
    }
    
    // Reload data after all deletions complete
    setTimeout(() => window.location.reload(), 500);
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleEdit = (item) => {
    setEditForm(item);
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const handleSaveEdit = async () => {
    const itemId = editForm._id || editForm.id;
    await onUpdateData(itemId, editForm);
    setShowEditModal(false);
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, itemId: id, isBulk: false });
  };

  const confirmSingleDelete = async () => {
    if (deleteConfirm.itemId) {
      await onDeleteData(deleteConfirm.itemId);
      setCurrentPage(1);
    }
  };

  const handleAddNew = async () => {
    if (!newForm.commodity || !newForm.price) {
      alert("Please fill in commodity and price");
      return;
    }
    await onAddData({
      ...newForm,
      price: Number(newForm.price),
      years: newForm.years || new Date().getFullYear().toString(),
      timestamp: new Date().toISOString()
    });
    setNewForm({ brand: "", commodity: "", month: "", price: "", size: "", store: "", variant: "", years: "" });
    setShowAddForm(false);
    setCurrentPage(1);
  };

  const handleFormChange = (field, value) => {
    setNewForm({ ...newForm, [field]: value });
  };

  const exportToCSV = () => {
    if (!prices || prices.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Brand", "Commodity", "Month", "Price", "Size", "Store", "Variant", "Years"];
    const rows = prices.map(item => [
      item.brand || "-",
      item.commodity,
      item.month || "-",
      item.price,
      item.size || "-",
      item.store || "-",
      item.variant || "-",
      item.years || "-"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prime_commodities_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Count unique brands and commodities in filteredData
  const brandCount = useMemo(() => {
    const set = new Set();
    filteredData.forEach(item => {
      if (item.brand) set.add(item.brand.trim().toLowerCase());
    });
    return set.size;
  }, [filteredData]);

  const commodityCount = useMemo(() => {
    const set = new Set();
    filteredData.forEach(item => {
      if (item.commodity) set.add(item.commodity.trim().toLowerCase());
    });
    return set.size;
  }, [filteredData]);

  // Sort header component
  const SortHeader = ({ label, sortKey }) => (
    <th className="dm-table-th" onClick={() => handleSort(sortKey)}>
      <div className="dm-sort-header">
        {label}
        {sortConfig.key === sortKey && (
          <span className="dm-sort-arrow">
            <ArrowUpDown size={14} color={sortConfig.direction === "asc" ? "#38bdf8" : "#ef4444"} />
          </span>
        )}
      </div>
    </th>
  );

  return (
    <div className="dm-container">
      <div style={{ marginBottom: "12px", color: "#475569", fontWeight: 700 }}>
        Viewing: Prime Commodities
      </div>
      <div style={{ marginBottom: "12px", color: "#334155", fontWeight: 500, display: "flex", gap: "32px", flexWrap: "wrap" }}>
        <span>Brands: <strong>{brandCount}</strong></span>
        <span>Commodities: <strong>{commodityCount}</strong></span>
      </div>
      {/* Action Bar */}
      <div className="dm-action-bar">
        <div className="dm-action-bar-buttons">
          <button className="dm-btn dm-btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            {showAddForm ? "Cancel" : "Add New Record"}
          </button>
          <button className="dm-btn dm-btn-secondary" onClick={onImportClick}>
            <Upload size={16} style={{ marginRight: "6px" }} />
            Import Data
          </button>
          <button className="dm-btn dm-btn-secondary" onClick={exportToCSV}>
            <Download size={16} style={{ marginRight: "6px" }} />
            Export CSV
          </button>
          <button className="dm-btn dm-btn-secondary" onClick={toggleSelectAll}>
            {selectedIds.size === filteredData.length && selectedIds.size > 0 ? "Deselect All" : "Select All (filtered)"}
          </button>
          <button
            className={`dm-btn-delete-selected ${selectedCount ? "active" : ""}`}
            onClick={handleBulkDelete}
            disabled={selectedCount === 0}
          >
            Delete Selected
          </button>
        </div>
        <div className="dm-action-bar-info">
          Showing: <strong>{paginatedData.length}</strong> / <strong>{sortedData.length}</strong> of <strong>{prices?.length || 0}</strong> total • Selected: <strong>{selectedCount}</strong>
        </div>
      </div>

      {/* Add New Record Modal */}
      <AddRecordModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        formData={newForm}
        onChange={handleFormChange}
        onSave={handleAddNew}
      />

      {/* Edit Record Modal */}
      <EditRecordModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={editForm}
        onChange={handleEditFormChange}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, itemId: null, isBulk: false })}
        onConfirm={deleteConfirm.isBulk ? confirmBulkDelete : confirmSingleDelete}
        itemCount={deleteConfirm.isBulk ? selectedIds.size : 1}
      />

      {/* Search Bar */}
      <div className="dm-search-bar">
        <Search size={18} color="#64748b" />
        <input
          type="text"
          placeholder="Search by commodity, brand, store, or variant..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="dm-search-input"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm("");
              setCurrentPage(1);
            }}
            className="dm-clear-button"
          >
            <X size={16} />
          </button>
        )}
        
        {/* Year Filter Dropdown */}
        <div className="dm-filter-group">
          <Calendar size={18} color="#64748b" />
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setCurrentPage(1);
            }}
            className="dm-select"
          >
            <option value="all">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Month Filter Dropdown */}
        <div className="dm-filter-group">
          <Calendar size={18} color="#64748b" />
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="dm-select"
          >
            <option value="all">All Months</option>
            <option value="January">January</option>
            <option value="February">February</option>
            <option value="March">March</option>
            <option value="April">April</option>
            <option value="May">May</option>
            <option value="June">June</option>
            <option value="July">July</option>
            <option value="August">August</option>
            <option value="September">September</option>
            <option value="October">October</option>
            <option value="November">November</option>
            <option value="December">December</option>
          </select>
        </div>

        {/* Store Filter Dropdown */}
        <div className="dm-filter-group">
          <select
            value={selectedStore}
            onChange={(e) => {
              setSelectedStore(e.target.value);
              setCurrentPage(1);
            }}
            className="dm-select"
            style={{ minWidth: 160 }}
          >
            <option value="all">All Stores</option>
            {availableStores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="dm-table-container">
        <div style={{ overflowX: "auto" }}>
          <table className="dm-table">
            <thead>
              <tr className="dm-table-header">
                <th className="dm-table-th dm-checkbox-td">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => {
                      if (allPageSelected) {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          currentPageIds.forEach(id => next.delete(id));
                          return next;
                        });
                      } else {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          currentPageIds.forEach(id => next.add(id));
                          return next;
                        });
                      }
                    }}
                    className="dm-table-checkbox"
                  />
                </th>
                <SortHeader label="BRAND" sortKey="brand" />
                <SortHeader label="COMMODITY" sortKey="commodity" />
                <SortHeader label="MONTH" sortKey="month" />
                <SortHeader label="PRICE" sortKey="price" />
                <SortHeader label="SRP" sortKey="srp" />
                <SortHeader label="SIZE" sortKey="size" />
                <SortHeader label="STORE" sortKey="store" />
                <SortHeader label="VARIANT" sortKey="variant" />
                <SortHeader label="YEARS" sortKey="years" />
                <th className="dm-table-th">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    {searchTerm ? "No records match your search" : "No data available. Import or add new records to get started."}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const itemId = resolveId(item, index + (currentPage - 1) * itemsPerPage);

                  return (
                    <tr key={index} className="dm-table-row">
                      <td className="dm-checkbox-td">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(itemId)}
                          onChange={() => toggleSelectRow(item, index + (currentPage - 1) * itemsPerPage)}
                          className="dm-table-checkbox"
                        />
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-brand">{item.brand}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-commodity">{item.commodity}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-secondary">{item.month || "N/A"}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-price">₱{Number(item.price).toFixed(2)}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-secondary">{item.srp !== undefined && item.srp !== '' ? `₱${Number(item.srp).toFixed(2)}` : "--"}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-secondary">{item.size || "N/A"}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-store">{item.store}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-secondary">{item.variant || "N/A"}</span>
                      </td>
                      <td className="dm-table-td">
                        <span className="dm-text-secondary">{item.years || "N/A"}</span>
                      </td>
                      <td className="dm-table-td">
                        <div className="dm-action-buttons">
                          <button
                            className="dm-btn-edit"
                            onClick={() => handleEdit(item)}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="dm-btn-delete"
                            onClick={() => handleDelete(itemId)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="dm-pagination">
            <button
              className="dm-pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="dm-pagination-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>
            <button
              className="dm-pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
