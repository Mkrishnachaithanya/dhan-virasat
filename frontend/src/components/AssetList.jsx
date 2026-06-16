import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, CreditCard, TrendingUp, Key, Mail, FileText, HelpCircle } from 'lucide-react';
import { api } from '../services/api';
import AssetForm from './AssetForm';

export default function AssetList({ onRefreshStats }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [error, setError] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await api.getAssets();
      setAssets(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assets. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await api.deleteAsset(id);
        fetchAssets();
        if (onRefreshStats) onRefreshStats();
      } catch (err) {
        console.error(err);
        alert('Failed to delete asset.');
      }
    }
  };

  const handleEdit = (asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAsset(null);
    setIsFormOpen(true);
  };

  const handleFormSave = () => {
    fetchAssets();
    if (onRefreshStats) onRefreshStats();
  };

  const getAssetIcon = (type) => {
    switch (type) {
      case 'Bank': return <CreditCard size={20} />;
      case 'Stock': return <TrendingUp size={20} />;
      case 'Crypto': return <Key size={20} />;
      case 'Email': return <Mail size={20} />;
      case 'Document': return <FileText size={20} />;
      default: return <HelpCircle size={20} />;
    }
  };

  const getAssetColorClass = (type) => {
    switch (type) {
      case 'Bank': return 'var(--color-bank)';
      case 'Stock': return 'var(--color-stock)';
      case 'Crypto': return 'var(--color-crypto)';
      case 'Email': return 'var(--color-email)';
      case 'Document': return 'var(--color-document)';
      default: return 'var(--color-other)';
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.description && asset.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = typeFilter === 'All' || asset.type === typeFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="view-header">
        <div className="view-title-container">
          <h2 className="view-title">Asset Management</h2>
          <span className="view-subtitle">Document, categorize, and assign your digital accounts and physical trusts</span>
        </div>
        <button className="btn btn-primary" onClick={handleAddNew}>
          <Plus size={18} />
          Add Asset
        </button>
      </div>

      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search assets by name, platform, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Type:</span>
          <select 
            className="filter-select" 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Bank">Bank Account</option>
            <option value="Stock">Stock Portfolio</option>
            <option value="Crypto">Cryptocurrency</option>
            <option value="Email">Email Account</option>
            <option value="Document">Digital Document</option>
            <option value="Other">Other Asset</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading assets...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <HelpCircle size={32} />
          </div>
          <h4 className="empty-state-title">No Assets Found</h4>
          <p className="empty-state-description">
            {searchQuery || typeFilter !== 'All' 
              ? "No assets match your search filters." 
              : "You haven't recorded any digital assets yet. Begin by adding bank accounts, domains, keys, or folders."}
          </p>
          {typeFilter === 'All' && !searchQuery && (
            <button className="btn btn-primary btn-sm" onClick={handleAddNew}>
              Add Your First Asset
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredAssets.map(asset => {
            const color = getAssetColorClass(asset.type);
            return (
              <div key={asset.id} className="card">
                <div className="card-header">
                  <div className="card-icon-title">
                    <div className="card-icon" style={{ backgroundColor: color }}>
                      {getAssetIcon(asset.type)}
                    </div>
                    <div className="card-meta-info">
                      <h4 className="card-name">{asset.name}</h4>
                      <span className="card-platform">{asset.platform}</span>
                    </div>
                  </div>
                  <span className="badge" style={{ backgroundColor: `rgba(from ${color} r g b / 0.1)`, borderColor: color, borderWidth: '1px', borderStyle: 'solid', color: color }}>
                    {asset.type}
                  </span>
                </div>

                <div className="card-description">
                  {asset.description || (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No detailed descriptions provided.
                    </span>
                  )}
                </div>

                <div className="card-nominee-box" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span className="card-nominee-label">Nominee 1 (Primary):</span>
                    {asset.primary_nominee_detail ? (
                      <span className="card-nominee-name">
                        {asset.primary_nominee_detail.name} ({asset.primary_nominee_detail.relationship})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                        None Designated
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                    <span className="card-nominee-label">Nominee 2 (Backup):</span>
                    {asset.secondary_nominee_detail ? (
                      <span className="card-nominee-name" style={{ color: 'var(--text-secondary)' }}>
                        {asset.secondary_nominee_detail.name} ({asset.secondary_nominee_detail.relationship})
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                        None Designated
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(asset)}>
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(asset.id)}>
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AssetForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleFormSave}
        assetToEdit={selectedAsset}
      />
    </div>
  );
}
