import React from 'react';
import { FiPackage, FiAlertTriangle, FiShoppingBag } from 'react-icons/fi';

interface InventoryStatsProps {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
}

const InventoryStats: React.FC<InventoryStatsProps> = ({
  totalItems,
  totalQuantity,
  lowStockCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Items Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 border border-blue-100">
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full p-3 mr-4">
            <FiPackage className="h-6 w-6 text-blue-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700">Total Items</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalItems}</h3>
          </div>
        </div>
      </div>

      {/* Total Quantity Card */}
      <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl shadow-md p-6 border border-green-100">
        <div className="flex items-center">
          <div className="bg-green-100 rounded-full p-3 mr-4">
            <FiShoppingBag className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-700">Total Quantity</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{totalQuantity}</h3>
          </div>
        </div>
      </div>

      {/* Low Stock Card */}
      <div className={`bg-gradient-to-br ${lowStockCount > 0 ? 'from-amber-50 to-orange-50 border-amber-100' : 'from-gray-50 to-slate-50 border-gray-200'} rounded-xl shadow-md p-6 border`}>
        <div className="flex items-center">
          <div className={`${lowStockCount > 0 ? 'bg-amber-100' : 'bg-gray-100'} rounded-full p-3 mr-4`}>
            <FiAlertTriangle className={`h-6 w-6 ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
              Low Stock Items
            </p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {lowStockCount}
            </h3>
          </div>
        </div>
        {lowStockCount > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {lowStockCount} {lowStockCount === 1 ? 'item needs' : 'items need'} attention
          </p>
        )}
      </div>
    </div>
  );
};

export default InventoryStats;
