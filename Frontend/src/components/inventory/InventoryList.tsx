import React, { useState } from 'react';
import { FiEdit2, FiTrash2, FiPlusCircle, FiMinusCircle } from 'react-icons/fi';
import { InventoryItem } from '../../types/inventory';
import AdjustQuantityModal from './AdjustQuantityModal';
import EditItemModal from './EditItemModal';
import DeleteConfirmModal from '../common/DeleteConfirmModal';
import { deleteInventoryItem } from '../../services/inventoryService';
import { formatDate } from '../../utils/formatters';
import EmptyState from '../common/EmptyState';

interface InventoryListProps {
  items: InventoryItem[];
  onRefresh: () => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ items, onRefresh }) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteInventoryItem(selectedItem._id);
      onRefresh();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      low: 'bg-amber-100 text-amber-800',
      out: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="No inventory items found"
        description="Add items to your inventory to get started"
        icon="inventory"
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Level
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.hostel_id && (
                    <div className="text-xs text-gray-500">Hostel: {item.hostel_id}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`font-medium ${item.quantity <= item.min_level ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.quantity}
                    </span>
                    <div className="ml-2 flex">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsAdjustModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-1"
                        title="Adjust quantity"
                      >
                        <FiPlusCircle className="h-4 w-4" />
                      </button>
                      {item.quantity > 0 && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsAdjustModalOpen(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Reduce quantity"
                        >
                          <FiMinusCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {item.min_level}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(item.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(item.updatedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsEditModalOpen(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjust Quantity Modal */}
      {isAdjustModalOpen && selectedItem && (
        <AdjustQuantityModal
          item={selectedItem}
          onClose={() => setIsAdjustModalOpen(false)}
          onAdjust={onRefresh}
        />
      )}

      {/* Edit Item Modal */}
      {isEditModalOpen && selectedItem && (
        <EditItemModal
          item={selectedItem}
          onClose={() => setIsEditModalOpen(false)}
          onSave={onRefresh}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmModal
          title="Delete Inventory Item"
          message={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </>
  );
};

export default InventoryList;
