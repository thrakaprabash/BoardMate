import React, { useState, useEffect } from 'react';
import { FiX, FiPackage } from 'react-icons/fi';
import Modal from '../common/Modal';
import { updateInventoryItem } from '../../services/inventoryService';
import { getHostels } from '../../services/hostelService';
import { InventoryItem } from '../../types/inventory';
import { Hostel } from '../../types/hostel';

interface EditItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: () => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onSave }) => {
  const [name, setName] = useState(item.name);
  const [minLevel, setMinLevel] = useState(String(item.min_level));
  const [hostelId, setHostelId] = useState(item.hostel_id || '');
  const [status, setStatus] = useState(item.status);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const response = await getHostels();
        setHostels(response.items || []);
      } catch (err) {
        console.error('Failed to load hostels', err);
      }
    };

    fetchHostels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Item name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await updateInventoryItem(item._id, {
        name,
        min_level: Number(minLevel),
        hostel_id: hostelId || undefined,
        status,
      });
      
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-md mx-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FiPackage className="h-6 w-6 text-indigo-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-800">Edit Item</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Item Name*
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Current Quantity
              </label>
              <input
                type="number"
                id="quantity"
                value={item.quantity}
                disabled
                className="w-full border border-gray-200 bg-gray-100 rounded-lg px-4 py-2 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use the adjust feature to change quantity
              </p>
            </div>

            <div>
              <label htmlFor="minLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Level
              </label>
              <input
                type="number"
                id="minLevel"
                min="0"
                value={minLevel}
                onChange={(e) => setMinLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="hostel" className="block text-sm font-medium text-gray-700 mb-1">
              Associate with Hostel
            </label>
            <select
              id="hostel"
              value={hostelId}
              onChange={(e) => setHostelId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">None (Global Item)</option>
              {hostels.map((hostel) => (
                <option key={hostel._id} value={hostel._id}>
                  {hostel.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditItemModal;
