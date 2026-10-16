import DesignationMaster from './components/DesignationMaster';
import PartyMaster from './components/PartyMaster';
import BrandMaster from './components/BrandMaster';
import ProductMaster from './components/ProductMaster';
import TankMaster from './components/TankMaster';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto', color: '#e0e0e0' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Tarwani Soaps ERP</h1>
      
      <DesignationMaster />
      <PartyMaster />
      <BrandMaster />
      <ProductMaster />
      <TankMaster />
      
    </div>
  );
}

export default App;