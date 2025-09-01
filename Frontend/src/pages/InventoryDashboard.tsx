import React, { useState, useEffect } from 'react';
import { FiPackage, FiAlertTriangle, FiPlus, FiSearch } from 'react-icons/fi';
import { TbArrowsSort } from 'react-icons/tb';
import InventoryList from '../components/inventory/InventoryList';
import InventoryStats from '../components/inventory/InventoryStats';
import LowStockItems from '../components/inventory/LowStockItems';
import NewItemModal from '../components/inventory/NewItemModal';
import { getInventoryItems, getLowStockItems } from '../services/inventoryService';
import { InventoryItem } from '../types/inventory';
import LoadingSpinner from '../components/common/LoadingSpinner';

const InventoryDashboard: React.FC = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trigger refresh when needed
  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const itemsData = await getInventoryItems({ 
          search: searchTerm || undefined, 
          status: filterStatus !== 'all' ? filterStatus : undefined 
        });
        setInventoryItems(itemsData.items);
        
        const lowStockData = await getLowStockItems();
        setLowStockItems(lowStockData);
      } catch (error) {
        console.error('Failed to fetch inventory data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchTerm, filterStatus, refreshTrigger]);

  // Calculate statistics
  const totalItems = inventoryItems.length;
  const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = lowStockItems.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <FiPackage className="mr-3 text-indigo-600" />
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and track your inventory items effectively
            </p>
          </div>
          <button
            onClick={() => setShowNewItemModal(true)}
            className="mt-4 lg:mt-0 flex items-center px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow-md hover:shadow-lg"
          >
            <FiPlus className="mr-2" /> Add New Item
          </button>
        </div>

        {/* Stats Cards */}
        <InventoryStats 
          totalItems={totalItems} 
          totalQuantity={totalQuantity} 
          lowStockCount={lowStockCount} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main Inventory Section */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 sm:mb-0">
                Inventory Items
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-60"
                  />
                  <FiSearch className="absolute left-3 top-3 text-gray-400" />
                </div>

                {/* Filter Dropdown */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="low">Low Stock</option>
                  <option value="out">Out of Stock</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
              </div>
            ) : (
              <InventoryList 
                items={inventoryItems} 
                onRefresh={refreshData} 
              />
            )}
          </div>

          {/* Low Stock Panel */}
          <div className="lg:col-span-1">
            <LowStockItems 
              items={lowStockItems} 
              isLoading={isLoading} 
              onRefresh={refreshData} 
            />
          </div>
        </div>
      </div>

      {/* New Item Modal */}
      {showNewItemModal && (
        <NewItemModal 
          onClose={() => setShowNewItemModal(false)} 
          onItemCreated={refreshData}
        />
      )}
    </div>
  );
};

export default InventoryDashboard;
