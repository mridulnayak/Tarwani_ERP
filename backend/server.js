require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// SQL Server configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, 
    trustServerCertificate: true // Necessary for this specific IP connection
  }
};

// Test the database connection
sql.connect(dbConfig).then(() => {
  console.log('Connected to MSSQL Database: uvtecgxh_sms successfully!');
}).catch(err => {
  console.error('Database connection failed:', err);
});


// ==========================================
// MASTER MANAGEMENT ROUTES
// ==========================================
// 1. POST: Create a new Designation
app.post('/api/designations', async (req, res) => {
    try {
        // Grab the name the user typed in the frontend
        const { designationName } = req.body; 
        
        if (!designationName) {
            return res.status(400).json({ error: 'Designation Name is required' });
        }

        // Connect to the DB and insert the new designation
        const pool = await sql.connect(dbConfig);
        await pool.request()
            // We use .input() to safely prevent SQL Injection attacks
            .input('name', sql.VarChar, designationName) 
            .query('INSERT INTO DesignationMaster (DesignationName) VALUES (@name)');

        res.status(201).json({ message: 'Designation created successfully!' });
    } catch (err) {
        console.error('Error creating designation:', err);
        res.status(500).json({ error: 'Failed to create designation' });
    }
});

// 2. GET: Fetch all Designations
app.get('/api/designations', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM DesignationMaster');
        
        // Send the database rows back to the frontend
        res.status(200).json(result.recordset); 
    } catch (err) {
        console.error('Error fetching designations:', err);
        res.status(500).json({ error: 'Failed to fetch designations' });
    }
});

// ==========================================
// UNIFIED PARTY MASTER ROUTES
// ==========================================

// 1. POST: Create a new Party (Employee, Vendor, or Customer)
app.post('/api/parties', async (req, res) => {
    try {
        const { partyName, partyType, designationId, contactNumber, address } = req.body; 
        
        if (!partyName || !partyType) {
            return res.status(400).json({ error: 'Party Name and Type are required' });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, partyName) 
            .input('type', sql.VarChar, partyType) 
            // If it's an Employee, save the Designation. Otherwise, save NULL.
            .input('desigId', sql.Int, partyType === 'Employee' ? designationId : null) 
            // If it's NOT an Employee, save Contact/Address. Otherwise, save NULL.
            .input('contact', sql.VarChar, partyType !== 'Employee' ? contactNumber : null)
            .input('address', sql.Text, partyType !== 'Employee' ? address : null)
            .query(`
                INSERT INTO mridul.PartyMaster (PartyName, PartyType, DesignationID, ContactNumber, Address) 
                VALUES (@name, @type, @desigId, @contact, @address)
            `);

        res.status(201).json({ message: `${partyType} created successfully!` });
    } catch (err) {
        console.error('Error creating party:', err);
        res.status(500).json({ error: 'Failed to create party record' });
    }
});

// 2. GET: Fetch all Parties
app.get('/api/parties', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        // LEFT JOIN ensures we get ALL parties, even if they don't have a Designation
        const result = await pool.request().query(`
            SELECT 
                p.PartyID, 
                p.PartyName, 
                p.PartyType, 
                p.ContactNumber,
                p.Address,
                d.DesignationName 
            FROM mridul.PartyMaster p
            LEFT JOIN mridul.DesignationMaster d ON p.DesignationID = d.DesignationID
            ORDER BY p.PartyType, p.PartyName
        `);
        
        res.status(200).json(result.recordset); 
    } catch (err) {
        console.error('Error fetching parties:', err);
        res.status(500).json({ error: 'Failed to fetch parties' });
    }
});

// ==========================================
// BRAND MASTER ROUTES
// ==========================================
app.post('/api/brands', async (req, res) => {
    try {
        const { brandName } = req.body;
        if (!brandName) return res.status(400).json({ error: 'Brand Name is required' });

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, brandName)
            .query('INSERT INTO mridul.BrandMaster (BrandName) VALUES (@name)');
        res.status(201).json({ message: 'Brand created successfully!' });
    } catch (err) { res.status(500).json({ error: 'Failed to create brand' }); }
});

app.get('/api/brands', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM mridul.BrandMaster');
        res.status(200).json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch brands' }); }
});

// ==========================================
// PRODUCT MASTER ROUTES
// ==========================================
app.post('/api/products', async (req, res) => {
    try {
        const { productName, brandId } = req.body;
        if (!productName || !brandId) return res.status(400).json({ error: 'Name and Brand are required' });

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, productName)
            .input('brandId', sql.Int, brandId)
            .query('INSERT INTO mridul.ProductMaster (ProductName, BrandID) VALUES (@name, @brandId)');
        res.status(201).json({ message: 'Product created successfully!' });
    } catch (err) { res.status(500).json({ error: 'Failed to create product' }); }
});

app.get('/api/products', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        // JOIN to get the actual Brand Name instead of just the ID
        const result = await pool.request().query(`
            SELECT p.ProductID, p.ProductName, b.BrandName 
            FROM mridul.ProductMaster p
            INNER JOIN mridul.BrandMaster b ON p.BrandID = b.BrandID
        `);
        res.status(200).json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch products' }); }
});

// ==========================================
// TANK MASTER ROUTES
// ==========================================
app.post('/api/tanks', async (req, res) => {
    try {
        const { tankName, capacity } = req.body;
        if (!tankName || !capacity) return res.status(400).json({ error: 'Name and Capacity required' });

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, tankName)
            .input('cap', sql.Int, capacity)
            .query('INSERT INTO mridul.TankMaster (TankName, Capacity) VALUES (@name, @cap)');
        res.status(201).json({ message: 'Tank created successfully!' });
    } catch (err) { res.status(500).json({ error: 'Failed to create tank' }); }
});

app.get('/api/tanks', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM mridul.TankMaster');
        res.status(200).json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch tanks' }); }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});