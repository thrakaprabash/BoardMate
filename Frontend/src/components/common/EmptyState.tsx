import React from 'react';
import { FiPackage, FiAlertCircle, FiSearch, FiFileText, FiInbox } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'inventory' | 'error' | 'search' | 'document' | 'inbox';
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  icon = 'document' 
}) => {
  const icons = {
    inventory: <FiPackage className="h-12 w-12 text-gray-400" />,
    error: <FiAlertCircle className="h-12 w-12 text-gray-400" />,
    search: <FiSearch className="h-12 w-12 text-gray-400" />,
    document: <FiFileText className="h-12 w-12 text-gray-400" />,
    inbox: <FiInbox className="h-12 w-12 text-gray-400" />
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        {icons[icon]}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 max-w-sm">{description}</p>
    </div>
  );
};

export default EmptyState;
