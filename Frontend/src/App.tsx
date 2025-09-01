import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import InventoryDashboard from './pages/InventoryDashboard';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="/" element={<InventoryDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
