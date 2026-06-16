import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Mail, Users, Heart } from 'lucide-react';
import { api } from '../services/api';
import NomineeForm from './NomineeForm';

export default function NomineeList({ onRefreshStats }) {
  const [nominees, setNominees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNominee, setSelectedNominee] = useState(null);
  const [error, setError] = useState('');

  const fetchNominees = async () => {
    setLoading(true);
    try {
      const data = await api.getNominees();
      setNominees(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch nominees. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNominees();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this nominee? Any assets assigned to them will be unassigned.')) {
      try {
        await api.deleteNominee(id);
        fetchNominees();
        if (onRefreshStats) onRefreshStats();
      } catch (err) {
        console.error(err);
        alert('Failed to delete nominee.');
      }
    }
  };

  const handleEdit = (nominee) => {
    setSelectedNominee(nominee);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedNominee(null);
    setIsFormOpen(true);
  };

  const handleFormSave = () => {
    fetchNominees();
    if (onRefreshStats) onRefreshStats();
  };

  const filteredNominees = nominees.filter(nominee => {
    const searchLower = searchQuery.toLowerCase();
    return (
      nominee.name.toLowerCase().includes(searchLower) ||
      nominee.email.toLowerCase().includes(searchLower) ||
      nominee.relationship.toLowerCase().includes(searchLower)
    );
  });

  const getRelationshipBadgeColor = (rel) => {
    switch (rel) {
      case 'Spouse': return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Child': return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'Parent': return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      case 'Sibling': return { backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' };
      case 'Friend': return { backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' };
      default: return { backgroundColor: 'rgba(100, 116, 139, 0.1)', color: '#64748b' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="view-header">
        <div className="view-title-container">
          <h2 className="view-title">Nominee Management</h2>
          <span className="view-subtitle">Manage trust beneficiaries and heirs for your digital legacy</span>
        </div>
        <button className="btn btn-primary" onClick={handleAddNew}>
          <UserPlus size={18} />
          Add Nominee
        </button>
      </div>

      <div className="controls-row">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search nominees by name, email, or relationship..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
          Loading nominees...
        </div>
      ) : filteredNominees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users size={32} />
          </div>
          <h4 className="empty-state-title">No Nominees Found</h4>
          <p className="empty-state-description">
            {searchQuery ? "No nominees match your search query." : "You haven't added any nominees yet. Designate heirs to inherit your digital assets."}
          </p>
          {!searchQuery && (
            <button className="btn btn-primary btn-sm" onClick={handleAddNew}>
              Add Your First Nominee
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {filteredNominees.map(nominee => {
            const relStyle = getRelationshipBadgeColor(nominee.relationship);
            return (
              <div key={nominee.id} className="card">
                <div className="card-header">
                  <div className="card-icon-title">
                    <div className="card-icon" style={{ backgroundColor: relStyle.color }}>
                      <Heart size={20} />
                    </div>
                    <div className="card-meta-info">
                      <h4 className="card-name">{nominee.name}</h4>
                      <span className="card-platform" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Mail size={12} />
                        {nominee.email}
                      </span>
                    </div>
                  </div>
                  <span className="badge" style={relStyle}>
                    {nominee.relationship}
                  </span>
                </div>

                <div className="card-description">
                  {nominee.asset_count > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Assigned Assets ({nominee.asset_count}):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {nominee.assigned_assets?.map(asset => (
                          <span 
                            key={asset.id} 
                            style={{ 
                              fontSize: '11px', 
                              backgroundColor: 'var(--bg-app)', 
                              border: '1px solid var(--border-color)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {asset.name} ({asset.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      No assets currently assigned to this nominee.
                    </span>
                  )}
                </div>

                <div className="card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(nominee)}>
                    <Edit2 size={12} />
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(nominee.id)}>
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NomineeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleFormSave}
        nomineeToEdit={selectedNominee}
      />
    </div>
  );
}
