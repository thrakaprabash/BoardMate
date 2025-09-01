import React from 'react';
import { FiAlertTriangle, FiPlusCircle } from 'react-icons/fi';
import { InventoryItem } from '../../types/inventory';
import AdjustQuantityModal from './AdjustQuantityModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface LowStockItemsProps {
  items: InventoryItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

const LowStockItems: React.FC<LowStockItemsProps> = ({ items, isLoading, onRefresh }) => {
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 h-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FiAlertTriangle className="mr-2 text-amber-500" />
          Low Stock Items
        </h2>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6 h-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FiAlertTriangle className="mr-2 text-amber-500" />
          Low Stock Items
        </h2>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-green-100 rounded-full p-4 mb-4">
              <FiAlertTriangle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800">All stocked up!</h3>
            <p className="text-gray-600 mt-2">
              You don't have any items that need restocking right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div 
                key={item._id} 
                className="border border-amber-200 bg-amber-50 rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <div className="flex items-center mt-1">
                    <div className="text-sm text-amber-800 flex items-center">
                      <span className="font-bold">{item.quantity}</span>
                      <span className="mx-1">of</span>
                      <span>{item.min_level} min</span>
                    </div>
                    <div className="ml-2">
                      {item.quantity === 0 ? (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Out of stock
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                          Low stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setIsAdjustModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 transition-colors duration-200"
                >
                  <FiPlusCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adjust Quantity Modal */}
      {isAdjustModalOpen && selectedItem && (
        <AdjustQuantityModal
          item={selectedItem}
          onClose={() => setIsAdjustModalOpen(false)}
          onAdjust={onRefresh}
          defaultIsAdding={true}
        />
      )}
    </>
  );
};

export default LowStockItems;
