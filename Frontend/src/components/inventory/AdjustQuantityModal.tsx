import React, { useState } from 'react';
import { FiX, FiPlus, FiMinus } from 'react-icons/fi';
import Modal from '../common/Modal';
import { adjustInventoryItemQuantity } from '../../services/inventoryService';
import { InventoryItem } from '../../types/inventory';

interface AdjustQuantityModalProps {
  item: InventoryItem;
  onClose: () => void;
  onAdjust: () => void;
  defaultIsAdding?: boolean;
}

const AdjustQuantityModal: React.FC<AdjustQuantityModalProps> = ({ 
  item, 
  onClose, 
  onAdjust,
  defaultIsAdding = true
}) => {
  const [amount, setAmount] = useState('1');
  const [isAdding, setIsAdding] = useState(defaultIsAdding);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNumber = parseInt(amount, 10);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    // Calculate the delta - positive for adding, negative for removing
    const delta = isAdding ? amountNumber : -amountNumber;

    // Check if removing would result in negative quantity
    if (!isAdding && amountNumber > item.quantity) {
      setError(`Cannot remove more than the current quantity (${item.quantity})`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      
      await adjustInventoryItemQuantity(item._id, { delta });
      
      onAdjust();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust quantity');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-sm mx-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Adjust Quantity
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="font-medium text-gray-800">{item.name}</p>
            <p className="text-sm text-gray-600 mt-1">Current quantity: {item.quantity}</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjust Type
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center ${
                    isAdding
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiPlus className="h-5 w-5 mr-2" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  disabled={item.quantity <= 0}
                  className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center ${
                    !isAdding
                      ? 'bg-red-600 text-white'
                      : item.quantity <= 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiMinus className="h-5 w-5 mr-2" />
                  Remove
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <input
                type="number"
                id="amount"
                min="1"
                max={isAdding ? undefined : item.quantity}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
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
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  isAdding ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmitting
                  ? 'Processing...'
                  : isAdding
                  ? `Add ${amount}`
                  : `Remove ${amount}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AdjustQuantityModal;
