import { useState, useEffect } from 'react';
import Login from './components/Login';
import PartyMaster from './components/PartyMaster';
import DesignationMaster from './components/DesignationMaster';
import BrandMaster from './components/BrandMaster';
import ProductMaster from './components/ProductMaster';
import TankMaster from './components/TankMaster';
import PurchaseOrder from './components/PurchaseOrder';
import PurchaseReceiving from './components/PurchaseReceiving';
import ProductionOrder from './components/ProductionOrder';
import IssualManagement from './components/IssualManagement';
import FinishedGoods from './components/FinishedGoods';
import SalesOrder from './components/SalesOrder';
import SalesDispatch from './components/SalesDispatch';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import ProductionEntry from './components/ProductionEntry';
import RoleAllocation from './components/RoleAllocation';

export default function App() {
  const [activeTab, setActiveTab] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('Overview');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setDefaultTab(parsedUser.role);
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setDefaultTab(userData.role);
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setUser(null);
  };

  const setDefaultTab = (role) => {
    if (role === 'Admin') { setActiveTab('dashboard'); setExpandedCategory('Overview'); }
    else if (role === 'Sales') { setActiveTab('sales'); setExpandedCategory('Despatch'); }
    else if (role === 'Store') { setActiveTab('purchase'); setExpandedCategory('Store & Inventory'); }
    else if (role === 'Production') { setActiveTab('production'); setExpandedCategory('Production'); }
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- ALIGNED WITH UNCLE's BUSINESS LOGIC ---
  const menuCategories = [
    {
      title: 'Overview',
      allowedRoles: ['Admin', 'Sales', 'Store', 'Production'],
      items: [{ id: 'dashboard', label: '📊 Dashboard Overview', roles: ['Admin'] }]
    },
    {
      title: 'Master Management',
      allowedRoles: ['Admin', 'Production', 'Store'],
      items: [
        { id: 'party', label: 'Employee / Party Register', roles: ['Admin'] },
        { id: 'designation', label: 'Employee Designation', roles: ['Admin'] },
        { id: 'brand', label: 'Brand Master', roles: ['Admin'] },
        { id: 'product', label: 'Product / Box Master', roles: ['Admin', 'Production'] },
      ]
    },
    {
      // Separated Tank Management as requested
      title: 'Tank Management',
      allowedRoles: ['Admin', 'Store'],
      items: [
        { id: 'tank', label: 'Tank Dashboard / Master', roles: ['Admin', 'Store'] },
      ]
    },
    {
      title: 'Production',
      allowedRoles: ['Admin', 'Production'],
      items: [
        { id: 'production', label: 'Production Orders', roles: ['Admin', 'Production'] },
        // Added the new Production Entry component here
        { id: 'production_entry', label: 'Production Batch Entry', roles: ['Admin', 'Production'] },
        { id: 'finished', label: 'Finished Goods Receipt', roles: ['Admin', 'Production'] },
      ]
    },
    {
      title: 'Despatch',
      allowedRoles: ['Admin', 'Sales', 'Store'],
      items: [
        { id: 'sales', label: 'Sales Orders', roles: ['Admin', 'Sales'] },
        { id: 'dispatch', label: 'Daily Despatch Entry', roles: ['Admin', 'Sales', 'Store'] },
      ]
    },
    {
      title: 'Store & Inventory',
      allowedRoles: ['Admin', 'Store'],
      items: [
        { id: 'purchase', label: 'Purchase Orders', roles: ['Admin', 'Store'] },
        { id: 'receiving', label: 'Purchase Receiving', roles: ['Admin', 'Store'] },
        { id: 'issual', label: 'Physical Stock Issual', roles: ['Admin', 'Store'] },
      ]
    },
    {
      title: 'Sec Admin',
      allowedRoles: ['Admin'],
      items: [
        { id: 'users', label: 'User Registration', roles: ['Admin'] },
        // Added the new Role Allocation component here
        { id: 'roles', label: 'Role Allocation', roles: ['Admin'] }
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'users': return <UserManagement user={user} />;
      case 'roles': return <RoleAllocation user={user} />; // Added Route
      case 'party': return <PartyMaster user={user} />;
      case 'designation': return <DesignationMaster user={user} />;
      case 'brand': return <BrandMaster user={user} />;
      case 'product': return <ProductMaster user={user} />;
      case 'tank': return <TankMaster user={user} />;
      case 'purchase': return <PurchaseOrder user={user} />;
      case 'receiving': return <PurchaseReceiving user={user} />;
      case 'production': return <ProductionOrder user={user} />;
      case 'production_entry': return <ProductionEntry user={user} />; // Added Route
      case 'issual': return <IssualManagement user={user} />;
      case 'finished': return <FinishedGoods user={user} />;
      case 'sales': return <SalesOrder user={user} />;
      case 'dispatch': return <SalesDispatch user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* MOBILE TOP BAR */}
<div className="md:hidden fixed top-0 left-0 w-full h-16 bg-blue-700 text-white flex items-center px-4 z-50 shadow-md gap-3">
  <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain bg-white rounded p-0.5" />
  <span className="font-bold text-lg tracking-wide">Tarwani Soaps</span>
</div>

      {/* SIDEBAR (Hidden on mobile unless toggled, fixed on desktop) */}
      <aside className={`absolute md:relative top-0 left-0 h-full w-72 bg-gray-900 text-gray-300 flex flex-col z-40 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0 pt-16' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* DESKTOP HEADER */}
        <div className="hidden md:flex flex-col items-center justify-center p-5 bg-gray-950 border-b border-gray-800 text-center">
          <img 
            src="/tarwani.png" 
            alt="Tarwani Soaps Logo" 
            className="h-12 w-auto object-contain mb-2"
            onError={(e) => {
              // Fallback if image fails to load
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-lg font-black text-white tracking-wider uppercase">Tarwani Soaps</h1>
          <p className="text-xs text-blue-400 mt-1 font-medium">Logged in as: {user.role}</p>
        </div>

        {/* NAVIGATION ACCORDION */}
        <nav className="flex-1 overflow-y-auto py-4">
          {(menuCategories || []).filter(cat => cat.allowedRoles.includes(user.role)).map((category, index) => {
            const isExpanded = expandedCategory === category.title;
            const visibleItems = (category.items || []).filter(item => item.roles.includes(user.role));
            
            if (visibleItems.length === 0) return null;

            return (
              <div key={index} className="mb-2">
                <button 
                  onClick={() => setExpandedCategory(isExpanded ? '' : category.title)}
                  className="w-full text-left px-6 py-3 font-semibold text-sm uppercase tracking-widest hover:text-white hover:bg-gray-800 transition-colors flex justify-between items-center"
                >
                  {category.title}
                  <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                </button>
                
                {isExpanded && (
                  <div className="bg-gray-950 py-2">
                    {(visibleItems || []).map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full text-left pl-10 pr-6 py-2.5 text-sm transition-colors
                          ${activeTab === item.id ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                        `}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON */}
        <div className="p-4 border-t border-gray-800 bg-gray-950">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* MOBILE BACKDROP OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full pt-16 md:pt-0 overflow-y-auto bg-gray-100">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      
    </div>
  );
}