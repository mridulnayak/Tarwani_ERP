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

export default function App() {
  const [activeTab, setActiveTab] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is already logged in when the app loads
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

  // Auto-route user to their most relevant screen upon login
const setDefaultTab = (role) => {
  if (role === 'Admin') setActiveTab('dashboard'); // Updated to dashboard
  else if (role === 'Sales') setActiveTab('sales');
  else if (role === 'Store') setActiveTab('purchase');
  else if (role === 'Production') setActiveTab('production');
};

  // IF NOT LOGGED IN, SHOW LOGIN SCREEN
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- ROLE-BASED ACCESS CONTROL (RBAC) ---
  // Define all possible navigation items, and restrict them by an array of allowed roles
  const allNavItems = [
    //dashboard
    { id: 'dashboard', label: '📊 Dashboard Overview', allowedRoles: ['Admin'] },
    { id: 'users', label: '👥 User Management', allowedRoles: ['Admin'] },
    // Core Masters (Admin Only)
    { id: 'party', label: 'Party Master', allowedRoles: ['Admin'] },
    { id: 'designation', label: 'Designation Master', allowedRoles: ['Admin'] },
    { id: 'brand', label: 'Brand Master', allowedRoles: ['Admin'] },
    { id: 'product', label: 'Product Master', allowedRoles: ['Admin', 'Production'] },
    { id: 'tank', label: 'Tank Master', allowedRoles: ['Admin', 'Store'] },
    
    // Purchase & Store
    { id: 'purchase', label: 'Purchase Orders', allowedRoles: ['Admin', 'Store'] },
    { id: 'receiving', label: 'Purchase Receiving', allowedRoles: ['Admin', 'Store'] },
    { id: 'issual', label: 'Issual Management', allowedRoles: ['Admin', 'Store'] },
    
    // Production Floor
    { id: 'production', label: 'Production Orders', allowedRoles: ['Admin', 'Production'] },
    { id: 'finished', label: 'Finished Goods Receipt', allowedRoles: ['Admin', 'Production'] },
    
    // Sales & Dispatch
    { id: 'sales', label: 'Sales Orders', allowedRoles: ['Admin', 'Sales'] },
    { id: 'dispatch', label: 'Sales Dispatch', allowedRoles: ['Admin', 'Sales', 'Store'] },
  ];

  // Filter the sidebar so the worker only sees what they are allowed to see
  const visibleNavItems = allNavItems.filter(item => item.allowedRoles.includes(user.role));

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'users': return <UserManagement />;
      case 'party': return <PartyMaster />;
      case 'designation': return <DesignationMaster />;
      case 'brand': return <BrandMaster />;
      case 'product': return <ProductMaster />;
      case 'tank': return <TankMaster />;
      case 'purchase': return <PurchaseOrder />;
      case 'receiving': return <PurchaseReceiving />;
      case 'production': return <ProductionOrder />;
      case 'issual': return <IssualManagement />;
      case 'finished': return <FinishedGoods />;
      case 'sales': return <SalesOrder />;
      case 'dispatch': return <SalesDispatch />;
      default: return <Dashboard user={user} />;
      // default: return (
      //   <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>
      //     <h2>Welcome, {user.username}</h2>
      //     <p>Please select an option from the menu.</p>
      //   </div>
      // );
    }
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ paddingBottom: '0.5rem' }}>
          Tarwani Soaps
          <div style={{ fontSize: '0.8rem', color: '#007bff', marginTop: '0.5rem' }}>Logged in as: {user.role}</div>
        </div>
        
        <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>☰ Menu</button>

        <nav className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNavClick(item.id)}
            >
              {item.label}
            </button>
          ))}
          
          {/* LOGOUT BUTTON */}
          <button 
            className="nav-button" 
            onClick={handleLogout}
            style={{ marginTop: 'auto', borderTop: '1px solid #333', color: '#dc3545', fontWeight: 'bold' }}
          >
            ⏻ Logout
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}