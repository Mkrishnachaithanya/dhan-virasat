import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';

const RELATIONSHIP_CHOICES = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Friend',
  'Other'
];

export default function NomineeForm({ isOpen, onClose, onSave, nomineeToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    relationship: 'Other'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (nomineeToEdit) {
      setFormData({
        name: nomineeToEdit.name || '',
        email: nomineeToEdit.email || '',
        relationship: nomineeToEdit.relationship || 'Other'
      });
    } else {
      setFormData({
        name: '',
        email: '',
        relationship: 'Other'
      });
    }
    setError('');
  }, [nomineeToEdit, isOpen]);

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
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and Email fields are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (nomineeToEdit) {
        await api.updateNominee(nomineeToEdit.id, formData);
      } else {
        await api.createNominee(formData);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        // Parse Django REST Framework error dictionary
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          const keys = Object.keys(errorData);
          const firstErrorMsg = errorData[keys[0]];
          setError(`${keys[0]}: ${Array.isArray(firstErrorMsg) ? firstErrorMsg[0] : firstErrorMsg}`);
        } else {
          setError('Failed to save nominee. Please check your inputs.');
        }
      } else {
        setError('Network error. Failed to save nominee.');
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
            {nomineeToEdit ? 'Edit Nominee' : 'Add New Nominee'}
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
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Jane Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="e.g. jane@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Relationship</label>
              <select
                name="relationship"
                className="form-select"
                value={formData.relationship}
                onChange={handleChange}
              >
                {RELATIONSHIP_CHOICES.map(choice => (
                  <option key={choice} value={choice}>{choice}</option>
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
              {loading ? 'Saving...' : nomineeToEdit ? 'Update Nominee' : 'Add Nominee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
