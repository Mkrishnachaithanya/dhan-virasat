import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

const ASSET_TYPE_CHOICES = [
  'Bank',
  'Stock',
  'Crypto',
  'Email',
  'Document',
  'Other'
];

export default function AssetForm({ isOpen, onClose, onSave, assetToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Other',
    platform: '',
    description: '',
    primary_nominee: '',
    secondary_nominee: ''
  });
  const [nominees, setNominees] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch nominees list to populate selectors
  useEffect(() => {
    if (isOpen) {
      api.getNominees()
        .then(data => setNominees(data))
        .catch(err => {
          console.error('Failed to load nominees', err);
          setError('Failed to load nominees list.');
        });
    }
  }, [isOpen]);

  useEffect(() => {
    if (assetToEdit) {
      setFormData({
        name: assetToEdit.name || '',
        type: assetToEdit.type || 'Other',
        platform: assetToEdit.platform || '',
        description: assetToEdit.description || '',
        primary_nominee: assetToEdit.primary_nominee || '',
        secondary_nominee: assetToEdit.secondary_nominee || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'Other',
        platform: '',
        description: '',
        primary_nominee: '',
        secondary_nominee: ''
      });
    }
    setError('');
  }, [assetToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.platform.trim()) {
      setError('Asset Name and Platform fields are required.');
      return;
    }

    if (formData.primary_nominee && formData.secondary_nominee && formData.primary_nominee === formData.secondary_nominee) {
      setError('Primary and Secondary nominees must be different people.');
      return;
    }

    setLoading(true);
    setError('');

    // Prepare payload (convert empty strings to null)
    const payload = {
      name: formData.name,
      type: formData.type,
      platform: formData.platform,
      description: formData.description,
      primary_nominee: formData.primary_nominee === '' ? null : parseInt(formData.primary_nominee, 10),
      secondary_nominee: formData.secondary_nominee === '' ? null : parseInt(formData.secondary_nominee, 10)
    };

    try {
      if (assetToEdit) {
        await api.updateAsset(assetToEdit.id, payload);
      } else {
        await api.createAsset(payload);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const keys = Object.keys(errorData);
          const firstErrorMsg = errorData[keys[0]];
          setError(`${keys[0]}: ${Array.isArray(firstErrorMsg) ? firstErrorMsg[0] : firstErrorMsg}`);
        } else {
          setError('Failed to save asset. Please verify inputs.');
        }
      } else {
        setError('Network error. Failed to save asset.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {assetToEdit ? 'Edit Digital Asset' : 'Add New Digital Asset'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Asset Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Family Savings Account, Main Gmail Account"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select
                name="type"
                className="form-select"
                value={formData.type}
                onChange={handleChange}
              >
                {ASSET_TYPE_CHOICES.map(choice => (
                  <option key={choice} value={choice}>{choice}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Platform / Institution</label>
              <input
                type="text"
                name="platform"
                className="form-input"
                placeholder="e.g. Chase Bank, Coinbase, Google"
                value={formData.platform}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Sensitive Instructions</label>
              <textarea
                name="description"
                className="form-textarea"
                placeholder="Describe access instructions or details. This field is encrypted at rest in the database."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Primary Nominee Select */}
            <div className="form-group">
              <label className="form-label">Primary Nominee (Nominee 1)</label>
              <select
                name="primary_nominee"
                className="form-select"
                value={formData.primary_nominee || ''}
                onChange={handleChange}
              >
                <option value="">-- Select Primary Nominee --</option>
                {nominees.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.relationship})
                  </option>
                ))}
              </select>
            </div>

            {/* Secondary Nominee Select */}
            <div className="form-group">
              <label className="form-label">Secondary Nominee (Nominee 2 - Backup)</label>
              <select
                name="secondary_nominee"
                className="form-select"
                value={formData.secondary_nominee || ''}
                onChange={handleChange}
              >
                <option value="">-- Select Secondary Nominee (None) --</option>
                {nominees.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.relationship})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : assetToEdit ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
