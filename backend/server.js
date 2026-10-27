//auth
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Secret key for signing tokens (In production, put this in your .env file)
const JWT_SECRET = process.env.JWT_SECRET || 'tarwani_super_secret_key_2026';

require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
// ==========================================
// AUTHENTICATION ROUTES (This was missing)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // --- TEMPORARY DEMO OVERRIDE FOR PRESENTATION ---
        const demoAccounts = {
            'admin': { password: 'admin123', role: 'Admin' },
            'sales': { password: 'sales123', role: 'Sales' },
            'store': { password: 'store123', role: 'Store' },
            'production': { password: 'prod123', role: 'Production' }
        };

        if (demoAccounts[username] && password === demoAccounts[username].password) {
            const token = jwt.sign(
                { userId: 999, role: demoAccounts[username].role, username: username }, 
                process.env.JWT_SECRET || 'tarwani_super_secret_key_2026', 
                { expiresIn: '12h' }
            );
            return res.status(200).json({
                message: 'Login successful',
                token,
                user: { username: username, role: demoAccounts[username].role }
            });
        }
        // -----------------------------------------------------

        return res.status(401).json({ error: 'Invalid username or password' });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// ==========================================
// USER MANAGEMENT ROUTES (ADMIN ONLY)
// ==========================================

// 1. POST: Create a New Employee Account
app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    try {
        // Securely hash the password before saving it to the database
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('username', sql.VarChar, username)
            .input('passwordHash', sql.VarChar, hashedPassword)
            .input('role', sql.VarChar, role)
            .query(`
                INSERT INTO mridul.Users (Username, PasswordHash, Role, IsActive)
                VALUES (@username, @passwordHash, @role, 1)
            `);

        res.status(201).json({ message: 'User account created successfully!' });
    } catch (err) {
        console.error('Error creating user:', err);
        // Handle duplicate username error gracefully
        if (err.number === 2627) {
            return res.status(400).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: 'Failed to create user account' });
    }
});

// 2. GET: Fetch all active users (excluding passwords for security)
app.get('/api/users', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT UserID, Username, Role, IsActive 
            FROM mridul.Users 
            ORDER BY Role, Username
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// 3. PUT: Toggle User Active Status (Soft Delete)
app.put('/api/users/:id/toggle-status', async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('userId', sql.Int, id)
            .input('isActive', sql.Bit, isActive ? 1 : 0)
            .query(`
                UPDATE mridul.Users 
                SET IsActive = @isActive 
                WHERE UserID = @userId
            `);

        res.status(200).json({ message: 'User status updated successfully' });
    } catch (err) {
        console.error('Error toggling user status:', err);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// ==========================================
// EXECUTIVE DASHBOARD ROUTES
// ==========================================
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        // We run multiple queries simultaneously for maximum speed
        const [salesRes, purchaseRes, productionRes, lowStockRes] = await Promise.all([
            pool.request().query(`SELECT COUNT(*) as count FROM mridul.SalesOrderHeader WHERE Status = 'Pending'`),
            pool.request().query(`SELECT COUNT(*) as count FROM mridul.PurchaseOrderHeader WHERE Status = 'Pending'`),
            pool.request().query(`SELECT COUNT(*) as count FROM mridul.ProductionOrder WHERE Status = 'In Progress'`),
            pool.request().query(`SELECT ProductName, ClosingBalance FROM mridul.ProductMaster WHERE ClosingBalance <= 50 ORDER BY ClosingBalance ASC`)
        ]);

        res.status(200).json({
            pendingSales: salesRes.recordset[0].count,
            pendingPurchases: purchaseRes.recordset[0].count,
            activeProduction: productionRes.recordset[0].count,
            lowStockItems: lowStockRes.recordset
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
});

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
        const { designationName } = req.body; 
        
        if (!designationName) {
            return res.status(400).json({ error: 'Designation Name is required' });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, designationName) 
            // FIXED: Added 'mridul.' schema prefix
            .query('INSERT INTO mridul.DesignationMaster (DesignationName) VALUES (@name)');

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
        // FIXED: Added 'mridul.' schema prefix
        const result = await pool.request().query('SELECT * FROM mridul.DesignationMaster');
        
        res.status(200).json(result.recordset); 
    } catch (err) {
        console.error('Error fetching designations:', err);
        res.status(500).json({ error: 'Failed to fetch designations' });
    }
});

// Update an existing designation (EDIT)
app.put('/api/designations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { designationName } = req.body;
        
        if (!designationName) return res.status(400).json({ error: 'Designation name is required' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, designationName)
            .query('UPDATE mridul.DesignationMaster SET DesignationName = @name WHERE DesignationID = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Designation not found' });
        res.status(200).json({ message: 'Designation updated successfully!' });
    } catch (err) { 
        res.status(500).json({ error: 'Failed to update designation' }); 
    }
});

// Delete a designation (DELETE)
app.delete('/api/designations/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM mridul.DesignationMaster WHERE DesignationID = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Designation not found' });
        res.status(200).json({ message: 'Designation deleted successfully!' });
    } catch (err) { 
        // This will trigger if the designation is tied to an employee in PartyMaster via a Foreign Key
        res.status(500).json({ error: 'Failed to delete designation. Ensure no employees are assigned to this role first.' }); 
    }
});

// // ==========================================
// // UNIFIED PARTY MASTER ROUTES
// // ==========================================

// // 1. POST: Create a new Party (Employee, Vendor, or Customer)
// app.post('/api/parties', async (req, res) => {
//     try {
//         const { partyName, partyType, designationId, contactNumber, address } = req.body; 
        
//         if (!partyName || !partyType) {
//             return res.status(400).json({ error: 'Party Name and Type are required' });
//         }

//         const pool = await sql.connect(dbConfig);
//         await pool.request()
//             .input('name', sql.VarChar, partyName) 
//             .input('type', sql.VarChar, partyType) 
//             // If it's an Employee, save the Designation. Otherwise, save NULL.
//             .input('desigId', sql.Int, partyType === 'Employee' ? designationId : null) 
//             // If it's NOT an Employee, save Contact/Address. Otherwise, save NULL.
//             .input('contact', sql.VarChar, partyType !== 'Employee' ? contactNumber : null)
//             .input('address', sql.Text, partyType !== 'Employee' ? address : null)
//             .query(`
//                 INSERT INTO mridul.PartyMaster (PartyName, PartyType, DesignationID, ContactNumber, Address) 
//                 VALUES (@name, @type, @desigId, @contact, @address)
//             `);

//         res.status(201).json({ message: `${partyType} created successfully!` });
//     } catch (err) {
//         console.error('Error creating party:', err);
//         res.status(500).json({ error: 'Failed to create party record' });
//     }
// });

// // 2. GET: Fetch all Parties
// app.get('/api/parties', async (req, res) => {
//     try {
//         const pool = await sql.connect(dbConfig);
//         // LEFT JOIN ensures we get ALL parties, even if they don't have a Designation
//         const result = await pool.request().query(`
//             SELECT 
//                 p.PartyID, 
//                 p.PartyName, 
//                 p.PartyType, 
//                 p.ContactNumber,
//                 p.Address,
//                 d.DesignationName 
//             FROM mridul.PartyMaster p
//             LEFT JOIN mridul.DesignationMaster d ON p.DesignationID = d.DesignationID
//             ORDER BY p.PartyType, p.PartyName
//         `);
        
//         res.status(200).json(result.recordset); 
//     } catch (err) {
//         console.error('Error fetching parties:', err);
//         res.status(500).json({ error: 'Failed to fetch parties' });
//     }
// });

// // Update an existing party (EDIT)
// app.put('/api/parties/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { partyName, partyType, designationId, contactNumber, address, gstNumber } = req.body;
        
//         if (!partyName) return res.status(400).json({ error: 'Party Name is required' });

//         const pool = await sql.connect(dbConfig);
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .input('partyName', sql.VarChar, partyName)
//             .input('partyType', sql.VarChar, partyType)
//             .input('designationId', sql.Int, designationId || null)
//             .input('contactNumber', sql.VarChar, contactNumber || null)
//             .input('address', sql.VarChar, address || null)
//             .input('gstNumber', sql.VarChar, gstNumber || null)
//             .query(`
//                 UPDATE mridul.PartyMaster 
//                 SET PartyName = @partyName, 
//                     PartyType = @partyType, 
//                     DesignationID = @designationId, 
//                     ContactNumber = @contactNumber, 
//                     Address = @address, 
//                     GSTNumber = @gstNumber
//                 WHERE PartyID = @id
//             `);
        
//         if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Party not found' });
//         res.status(200).json({ message: 'Party updated successfully!' });
//     } catch (err) { 
//         res.status(500).json({ error: 'Failed to update party' }); 
//     }
// });

// // Delete a party (DELETE)
// app.delete('/api/parties/:id', async (req, res) => {
//     try {
//         const { id } = req.params;

//         const pool = await sql.connect(dbConfig);
//         const result = await pool.request()
//             .input('id', sql.Int, id)
//             .query('DELETE FROM mridul.PartyMaster WHERE PartyID = @id');
        
//         if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Party not found' });
//         res.status(200).json({ message: 'Party deleted successfully!' });
//     } catch (err) { 
//         res.status(500).json({ error: 'Failed to delete party. It is likely tied to existing orders.' }); 
//     }
// });

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

// Update an existing brand (EDIT)
app.put('/api/brands/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { brandName } = req.body;
        
        if (!brandName) return res.status(400).json({ error: 'Brand name is required' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, brandName)
            .query('UPDATE mridul.BrandMaster SET BrandName = @name WHERE BrandID = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Brand not found' });
        res.status(200).json({ message: 'Brand updated successfully!' });
    } catch (err) { 
        res.status(500).json({ error: 'Failed to update brand' }); 
    }
});

// Delete a brand (DELETE)
app.delete('/api/brands/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM mridul.BrandMaster WHERE BrandID = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Brand not found' });
        res.status(200).json({ message: 'Brand deleted successfully!' });
    } catch (err) { 
        res.status(500).json({ error: 'Failed to delete brand. It is likely tied to existing products.' }); 
    }
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
        const result = await pool.request().query(`
            SELECT p.ProductID, p.ProductName, p.ClosingBalance, b.BrandName 
            FROM mridul.ProductMaster p
            INNER JOIN mridul.BrandMaster b ON p.BrandID = b.BrandID
        `);
        res.status(200).json(result.recordset);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch products' }); }
});

// Update an existing product (EDIT)
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { productName, brandId } = req.body;
        
        if (!productName || !brandId) return res.status(400).json({ error: 'Name and Brand are required' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, productName)
            .input('brandId', sql.Int, brandId)
            .query('UPDATE mridul.ProductMaster SET ProductName = @name, BrandID = @brandId WHERE ProductID = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.status(200).json({ message: 'Product updated successfully!' });
    } catch (err) { 
        res.status(500).json({ error: 'Failed to update product' }); 
    }
});

// Delete a product (DELETE)
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM mridul.ProductMaster WHERE ProductID = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.status(200).json({ message: 'Product deleted successfully!' });
    } catch (err) { 
        // Handles Foreign Key constraint errors if the product is already used in active orders
        res.status(500).json({ error: 'Failed to delete product. It may be linked to existing production or sales orders.' }); 
    }
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

// Update an existing tank (EDIT)
app.put('/api/tanks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tankName, capacity } = req.body;
        
        if (!tankName || !capacity) return res.status(400).json({ error: 'Tank name and capacity are required' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, tankName)
            .input('capacity', sql.Int, capacity)
            .query('UPDATE mridul.TankMaster SET TankName = @name, Capacity = @capacity WHERE TankID = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Tank not found' });
        res.status(200).json({ message: 'Tank updated successfully!' });
    } catch (err) { 
        res.status(500).json({ error: 'Failed to update tank' }); 
    }
});

// Delete a tank (DELETE)
app.delete('/api/tanks/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM mridul.TankMaster WHERE TankID = @id');
        
        if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Tank not found' });
        res.status(200).json({ message: 'Tank deleted successfully!' });
    } catch (err) { 
        res.status(500).json({ error: 'Failed to delete tank. Ensure it is not tied to existing inventory records.' }); 
    }
});

//GST & parties
// 1. POST: Create a new Party
app.post('/api/parties', async (req, res) => {
    try {
        // Added gstNumber to the incoming request body
        const { partyName, partyType, designationId, contactNumber, address, gstNumber } = req.body; 
        
        if (!partyName || !partyType) {
            return res.status(400).json({ error: 'Party Name and Type are required' });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, partyName) 
            .input('type', sql.VarChar, partyType) 
            .input('desigId', sql.Int, partyType === 'Employee' ? designationId : null) 
            .input('contact', sql.VarChar, partyType !== 'Employee' ? contactNumber : null)
            .input('address', sql.Text, partyType !== 'Employee' ? address : null)
            // Save GST only if it is a Vendor or Customer
            .input('gst', sql.VarChar, partyType !== 'Employee' ? gstNumber : null)
            .query(`
                INSERT INTO mridul.PartyMaster (PartyName, PartyType, DesignationID, ContactNumber, Address, GSTNumber) 
                VALUES (@name, @type, @desigId, @contact, @address, @gst)
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
        const result = await pool.request().query(`
            SELECT 
                p.PartyID, p.PartyName, p.PartyType, p.ContactNumber, p.Address, p.GSTNumber, d.DesignationName 
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

// 3. PUT: Update an existing Party (EDIT)
app.put('/api/parties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { partyName, partyType, designationId, contactNumber, address, gstNumber } = req.body;
        
        if (!partyName || !partyType) {
            return res.status(400).json({ error: 'Party Name and Type are required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, partyName)
            .input('type', sql.VarChar, partyType)
            .input('desigId', sql.Int, partyType === 'Employee' ? designationId : null)
            .input('contact', sql.VarChar, partyType !== 'Employee' ? contactNumber : null)
            .input('address', sql.Text, partyType !== 'Employee' ? address : null)
            .input('gst', sql.VarChar, partyType !== 'Employee' ? gstNumber : null)
            .query(`
                UPDATE mridul.PartyMaster 
                SET PartyName = @name, 
                    PartyType = @type, 
                    DesignationID = @desigId, 
                    ContactNumber = @contact, 
                    Address = @address, 
                    GSTNumber = @gst
                WHERE PartyID = @id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Party not found' });
        }
        
        res.status(200).json({ message: 'Party updated successfully!' });
    } catch (err) { 
        console.error('Error updating party:', err);
        res.status(500).json({ error: 'Failed to update party' }); 
    }
});

// 4. DELETE: Remove a Party
app.delete('/api/parties/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM mridul.PartyMaster WHERE PartyID = @id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Party not found' });
        }
        
        res.status(200).json({ message: 'Party deleted successfully!' });
    } catch (err) { 
        console.error('Error deleting party:', err);
        // Foreign Key Protection: Will fail if the customer/vendor has active orders
        res.status(500).json({ error: 'Failed to delete party. They are likely tied to existing orders or ledger entries.' }); 
    }
});

// ==========================================
// PURCHASE ORDER ROUTES
// ==========================================

// 1. POST: Create a Purchase Order
app.post('/api/purchase-orders', async (req, res) => {
    const { vendorId, items } = req.body; 
    
    if (!vendorId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Vendor and at least one item are required' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); 

        const poNumber = `PO-${Date.now()}`;

        const headerReq = new sql.Request(transaction);
        const headerResult = await headerReq
            .input('poNumber', sql.VarChar, poNumber)
            .input('vendorId', sql.Int, vendorId)
            .query(`
                INSERT INTO mridul.PurchaseOrderHeader (PONumber, VendorID, Status) 
                OUTPUT INSERTED.PO_ID 
                VALUES (@poNumber, @vendorId, 'Pending')
            `);
        
        const newPoId = headerResult.recordset[0].PO_ID; 

        for (const item of items) {
            const detailReq = new sql.Request(transaction);
            await detailReq
                .input('poId', sql.Int, newPoId)
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, item.quantity)
                .input('rate', sql.Decimal(10, 2), item.rate)
                .query(`
                    INSERT INTO mridul.PurchaseOrderDetails (PO_ID, ProductID, Quantity, Rate) 
                    VALUES (@poId, @productId, @qty, @rate)
                `);
        }

        await transaction.commit(); 
        res.status(201).json({ message: 'Purchase Order created successfully!', poNumber });

    } catch (err) {
        // Enterprise Safe Rollback
        try { await transaction.rollback(); } catch (rollbackErr) { console.error(rollbackErr); }
        console.error('PO Transaction Failed:', err);
        res.status(500).json({ error: 'Failed to generate Purchase Order' });
    }
});

// 2. GET: Fetch Purchase Orders (Headers only for the list view)
app.get('/api/purchase-orders', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                po.PO_ID, po.PONumber, po.OrderDate, po.Status,
                v.PartyName AS VendorName
            FROM mridul.PurchaseOrderHeader po
            INNER JOIN mridul.PartyMaster v ON po.VendorID = v.PartyID
            ORDER BY po.OrderDate DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching POs:', err);
        res.status(500).json({ error: 'Failed to fetch Purchase Orders' });
    }
});

// 2b. GET: Fetch specific line items for a Purchase Order (used for PDF Generation)
app.get('/api/purchase-orders/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        
        const result = await pool.request()
            .input('poId', sql.Int, id)
            .query(`
                SELECT 
                    i.Quantity, 
                    i.Rate, 
                    p.ProductName 
                FROM mridul.PurchaseOrderDetails i
                INNER JOIN mridul.ProductMaster p ON i.ProductID = p.ProductID
                WHERE i.PO_ID = @poId
            `);
            
        res.status(200).json(result.recordset);
    } catch (err) { 
        console.error('Error fetching PO items:', err);
        res.status(500).json({ error: 'Failed to fetch purchase order items' }); 
    }
});

// 3. DELETE: Cancel a pending PO (Enterprise Best Practice)
app.delete('/api/purchase-orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        
        // Only allow deletion if the PO hasn't been received yet
        const result = await pool.request()
            .input('poId', sql.Int, id)
            .query(`
                DELETE FROM mridul.PurchaseOrderHeader 
                WHERE PO_ID = @poId AND Status = 'Pending'
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(400).json({ error: 'Cannot delete order. It is already received or does not exist.' });
        }

        res.status(200).json({ message: 'Purchase Order cancelled successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel Purchase Order' });
    }
});

// ==========================================
// PURCHASE RECEIVING & INVENTORY ROUTES
// ==========================================

// 1. POST: Process Received Goods and Update Tank Stock
app.post('/api/purchase-receiving', async (req, res) => {
    const { poId, productId, tankId, receivedQty, receivedBy } = req.body;

    // Strict validation to prevent negative or zero receipts
    if (!poId || !productId || !tankId || !receivedQty || receivedQty <= 0) {
        return res.status(400).json({ error: 'Valid PO, Product, Tank, and a positive Received Quantity are required.' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); 

        // Step 1: Update PO Status FIRST (Double-Entry Protection)
        // If it's already 'Received', rowsAffected will be 0, stopping the transaction.
        const statusReq = new sql.Request(transaction);
        const statusResult = await statusReq
            .input('poId', sql.Int, poId)
            .query(`
                UPDATE mridul.PurchaseOrderHeader 
                SET Status = 'Received' 
                WHERE PO_ID = @poId AND Status = 'Pending'
            `);

        if (statusResult.rowsAffected[0] === 0) {
            throw new Error('ALREADY_RECEIVED');
        }

        // Step 2: Log the Receiving Entry
        const receiptReq = new sql.Request(transaction);
        await receiptReq
            .input('poId', sql.Int, poId)
            .input('productId', sql.Int, productId)
            .input('tankId', sql.Int, tankId)
            .input('qty', sql.Int, receivedQty)
            .input('receivedBy', sql.VarChar, receivedBy || 'Store Admin')
            .query(`
                INSERT INTO mridul.PurchaseReceiving (PO_ID, ProductID, TankID, ReceivedQty, ReceivedBy)
                VALUES (@poId, @productId, @tankId, @qty, @receivedBy)
            `);

        // Step 3: Add to Tank WITH Overfill Protection
        const tankReq = new sql.Request(transaction);
        const tankResult = await tankReq
            .input('tankId', sql.Int, tankId)
            .input('qty', sql.Int, receivedQty)
            .query(`
                UPDATE mridul.TankMaster 
                SET CurrentStock = ISNULL(CurrentStock, 0) + @qty 
                OUTPUT INSERTED.CurrentStock, INSERTED.Capacity, INSERTED.TankName
                WHERE TankID = @tankId
            `);

        // Check if we just exceeded the physical capacity of the tank
        if (tankResult.recordset.length > 0) {
            const { CurrentStock, Capacity, TankName } = tankResult.recordset[0];
            if (CurrentStock > Capacity) {
                throw new Error(`OVERFILL:${TankName}:${Capacity}`);
            }
        }

        await transaction.commit(); 
        res.status(201).json({ message: 'Goods received and tank stock updated successfully!' });

    } catch (err) {
        // Safe Rollback
        try { await transaction.rollback(); } catch (rollbackErr) { console.error(rollbackErr); }
        
        console.error('Receiving Transaction Failed:', err.message || err);

        // Friendly UI Errors
        if (err.message === 'ALREADY_RECEIVED') {
            return res.status(400).json({ error: 'This Purchase Order has already been received.' });
        }
        if (err.message && err.message.startsWith('OVERFILL')) {
            const [_, tankName, capacity] = err.message.split(':');
            return res.status(400).json({ error: `Cannot receive items. This will overfill ${tankName} (Max Capacity: ${capacity}L).` });
        }

        res.status(500).json({ error: 'Failed to process receiving' });
    }
});

// ==========================================
// PRODUCTION ORDER ROUTES
// ==========================================

// 1. POST: Generate a new Production Order
app.post('/api/production-orders', async (req, res) => {
    try {
        const { productId, salesOrderRef, targetQuantity } = req.body;

        // Enhanced Validation
        if (!productId || !targetQuantity || targetQuantity <= 0) {
            return res.status(400).json({ error: 'Valid Product and a positive Target Quantity are required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('productId', sql.Int, productId)
            .input('salesOrderRef', sql.VarChar, salesOrderRef || null)
            .input('targetQty', sql.Int, targetQuantity)
            .query(`
                INSERT INTO mridul.ProductionOrder (ProductID, SalesOrderRef, TargetQuantity, Status)
                OUTPUT INSERTED.ProductionOrderID
                VALUES (@productId, @salesOrderRef, @targetQty, 'Pending')
            `);

        const newId = result.recordset[0].ProductionOrderID;

        res.status(201).json({ 
            message: 'Production Order generated successfully!',
            productionOrderId: newId
        });
    } catch (err) {
        console.error('Error creating Production Order:', err);
        res.status(500).json({ error: 'Failed to generate Production Order' });
    }
});

// 2. GET: Fetch all Production Orders with Product Details
app.get('/api/production-orders', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        // Excellent JOIN logic to pull in Product Name and current Inventory Balance
        const result = await pool.request().query(`
            SELECT 
                po.ProductionOrderID, 
                po.OrderDate, 
                po.SalesOrderRef, 
                po.TargetQuantity, 
                po.Status,
                p.ProductName,
                p.ClosingBalance
            FROM mridul.ProductionOrder po
            INNER JOIN mridul.ProductMaster p ON po.ProductID = p.ProductID
            ORDER BY po.OrderDate DESC
        `);
        
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching Production Orders:', err);
        res.status(500).json({ error: 'Failed to fetch Production Orders' });
    }
});

// 3. DELETE: Cancel a pending Production Order (Safe Delete)
app.delete('/api/production-orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        
        // We add "AND Status = 'Pending'" to ensure we never delete an active/completed order
        const result = await pool.request()
            .input('poId', sql.Int, id)
            .query(`
                DELETE FROM mridul.ProductionOrder 
                WHERE ProductionOrderID = @poId AND Status = 'Pending'
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(400).json({ error: 'Cannot delete order. It either does not exist, or it is already In Progress/Completed.' });
        }

        res.status(200).json({ message: 'Production Order cancelled successfully.' });
    } catch (err) {
        console.error('Error deleting Production Order:', err);
        res.status(500).json({ error: 'Failed to cancel Production Order' });
    }
});

// ==========================================
// ISSUAL MANAGEMENT ROUTES
// ==========================================

// 1. POST: Issue Materials and Deduct from Tanks
app.post('/api/issuals', async (req, res) => {
    const { productionOrderId, issuedBy, items } = req.body; 

    if (!productionOrderId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Production Order and at least one item are required' });
    }

    // Input Validation: Prevent zero or negative quantity issuals
    const invalidItem = items.find(item => item.quantity <= 0);
    if (invalidItem) {
        return res.status(400).json({ error: 'All issued quantities must be greater than zero.' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); 

        // Step 1: Generate a unique Issue Number
        const issueNumber = `ISSUE-${Date.now()}`;

        // Step 2: Insert into Issual Header
        const headerReq = new sql.Request(transaction);
        const headerResult = await headerReq
            .input('issueNum', sql.VarChar, issueNumber)
            .input('poId', sql.Int, productionOrderId)
            .input('issuedBy', sql.VarChar, issuedBy || 'System')
            .query(`
                INSERT INTO mridul.IssualHeader (IssueNumber, ProductionOrderID, IssuedBy)
                OUTPUT INSERTED.IssueID
                VALUES (@issueNum, @poId, @issuedBy)
            `);
        
        const newIssueId = headerResult.recordset[0].IssueID;

        // Step 3: Loop through the items to insert Details AND deduct Tank stock securely
        for (const item of items) {
            // A. Log the specific item issued
            const detailReq = new sql.Request(transaction);
            await detailReq
                .input('issueId', sql.Int, newIssueId)
                .input('tankId', sql.Int, item.tankId)
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, item.quantity)
                .query(`
                    INSERT INTO mridul.IssualDetails (IssueID, TankID, ProductID, Quantity)
                    VALUES (@issueId, @tankId, @productId, @qty)
                `);
            
            // B. Subtract the issued quantity from the physical Tank with Negative Stock Protection
            const tankReq = new sql.Request(transaction);
            const tankResult = await tankReq
                .input('tankId', sql.Int, item.tankId)
                .input('qty', sql.Int, item.quantity)
                .query(`
                    UPDATE mridul.TankMaster
                    SET CurrentStock = ISNULL(CurrentStock, 0) - @qty
                    OUTPUT INSERTED.CurrentStock, INSERTED.TankName
                    WHERE TankID = @tankId
                `);
            
            // Safety Check: If the stock drops below zero, abort the entire transaction
            if (tankResult.recordset.length > 0 && tankResult.recordset[0].CurrentStock < 0) {
                const tankName = tankResult.recordset[0].TankName;
                throw new Error(`INSUFFICIENT_STOCK:${tankName}`);
            }
        }

        // Step 4: Update the Production Order status to 'In Progress'
        const poReq = new sql.Request(transaction);
        await poReq
            .input('poId', sql.Int, productionOrderId)
            .query(`
                UPDATE mridul.ProductionOrder
                SET Status = 'In Progress'
                WHERE ProductionOrderID = @poId AND Status = 'Pending'
            `);

        await transaction.commit(); 
        res.status(201).json({ message: 'Materials successfully issued to the floor!', issueNumber });

    } catch (err) {
        // Safe Rollback Implementation
        try {
            await transaction.rollback();
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }
        
        console.error('Issual Transaction Failed:', err.message || err);
        
        // Return a clean, user-friendly error to the React frontend
        if (err.message && err.message.startsWith('INSUFFICIENT_STOCK')) {
            const tankName = err.message.split(':')[1];
            return res.status(400).json({ error: `Insufficient stock in ${tankName}. Please check tank levels.` });
        }
        
        res.status(500).json({ error: 'Failed to issue materials. Server encountered an error.' });
    }
});

// 2. GET: Fetch Issual History
app.get('/api/issuals', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                i.IssueID, 
                i.IssueNumber, 
                i.IssueDate, 
                i.IssuedBy, 
                po.ProductionOrderID AS ProductionRef,
                p.ProductName AS TargetProduct, 
                po.TargetQuantity
            FROM mridul.IssualHeader i
            INNER JOIN mridul.ProductionOrder po ON i.ProductionOrderID = po.ProductionOrderID
            INNER JOIN mridul.ProductMaster p ON po.ProductID = p.ProductID
            ORDER BY i.IssueDate DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching issuals:', err);
        res.status(500).json({ error: 'Failed to fetch Issual records' });
    }
});


// ==========================================
// FINISHED GOODS / PRODUCTION COMPLETION
// ==========================================

app.post('/api/finished-goods', async (req, res) => {
    const { productionOrderId, productId, producedQty, wastageQty, loggedBy } = req.body;

    // Enhanced Validation: Prevent negative inputs
    if (!productionOrderId || !productId || producedQty == null || producedQty <= 0) {
        return res.status(400).json({ error: 'Valid Production Order, Product, and a positive Produced Quantity are required.' });
    }

    if (wastageQty != null && wastageQty < 0) {
        return res.status(400).json({ error: 'Wastage quantity cannot be negative.' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); 

        // 1. Mark Production Order as Completed FIRST (Double-Entry Protection)
        const poReq = new sql.Request(transaction);
        const poResult = await poReq
            .input('poId', sql.Int, productionOrderId)
            .query(`
                UPDATE mridul.ProductionOrder
                SET Status = 'Completed'
                WHERE ProductionOrderID = @poId AND Status != 'Completed'
            `);

        // If rowsAffected is 0, it means the order doesn't exist OR was already completed!
        if (poResult.rowsAffected[0] === 0) {
            throw new Error('ALREADY_COMPLETED'); 
        }

        // 2. Log the Finished Good Receipt
        const receiptReq = new sql.Request(transaction);
        await receiptReq
            .input('poId', sql.Int, productionOrderId)
            .input('productId', sql.Int, productId)
            .input('produced', sql.Int, producedQty)
            .input('wastage', sql.Int, wastageQty || 0)
            .input('loggedBy', sql.VarChar, loggedBy || 'System')
            .query(`
                INSERT INTO mridul.FinishedGoodsReceipt (ProductionOrderID, ProductID, ProducedQuantity, WastageQuantity, LoggedBy)
                VALUES (@poId, @productId, @produced, @wastage, @loggedBy)
            `);

        // 3. Increase Product Closing Balance (Finished Goods Inventory)
        const stockReq = new sql.Request(transaction);
        await stockReq
            .input('productId', sql.Int, productId)
            .input('qty', sql.Int, producedQty)
            .query(`
                UPDATE mridul.ProductMaster
                SET ClosingBalance = ISNULL(ClosingBalance, 0) + @qty
                WHERE ProductID = @productId
            `);

        await transaction.commit(); 
        res.status(201).json({ message: 'Finished goods logged and inventory updated successfully!' });

    } catch (err) {
        // Safe Rollback
        try {
            await transaction.rollback(); 
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }

        console.error('Finished Goods Transaction Failed:', err.message || err);

        // Friendly error for the frontend
        if (err.message === 'ALREADY_COMPLETED') {
            return res.status(400).json({ error: 'This production order has already been completed.' });
        }

        res.status(500).json({ error: 'Failed to log finished goods' });
    }
});

// SALES ORDER ROUTES
// ==========================================

// 1. POST: Create a Sales Order (Header + Details Transaction)
app.post('/api/sales-orders', async (req, res) => {
    const { customerId, items } = req.body; 
    
    if (!customerId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Customer and at least one item are required' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Generate unique Sales Order Number
        const soNumber = `SO-${Date.now()}`;

        // Insert Header
        const headerReq = new sql.Request(transaction);
        const headerResult = await headerReq
            .input('soNumber', sql.VarChar, soNumber)
            .input('customerId', sql.Int, customerId)
            .query(`
                INSERT INTO mridul.SalesOrderHeader (SONumber, CustomerID) 
                OUTPUT INSERTED.SO_ID 
                VALUES (@soNumber, @customerId)
            `);
        
        const newSoId = headerResult.recordset[0].SO_ID; 

        // Insert Details
        for (const item of items) {
            const detailReq = new sql.Request(transaction);
            await detailReq
                .input('soId', sql.Int, newSoId)
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, item.quantity)
                .input('rate', sql.Decimal(10, 2), item.rate)
                .query(`
                    INSERT INTO mridul.SalesOrderDetails (SO_ID, ProductID, Quantity, Rate) 
                    VALUES (@soId, @productId, @qty, @rate)
                `);
        }

        await transaction.commit();
        res.status(201).json({ message: 'Sales Order generated successfully!', soNumber });

    } catch (err) {
        // Safe Rollback Implementation
        try {
            await transaction.rollback();
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }
        console.error('Sales Order Transaction Failed:', err);
        res.status(500).json({ error: 'Failed to generate Sales Order' });
    }
});

// 2. GET: Fetch Sales Orders
app.get('/api/sales-orders', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                so.SO_ID, so.SONumber, so.OrderDate, so.Status,
                c.PartyName AS CustomerName
            FROM mridul.SalesOrderHeader so
            INNER JOIN mridul.PartyMaster c ON so.CustomerID = c.PartyID
            ORDER BY so.OrderDate DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching Sales Orders:', err);
        res.status(500).json({ error: 'Failed to fetch Sales Orders' });
    }
});

// 3. GET: Fetch specific line items for a Sales Order (used for PDF Generation)
app.get('/api/sales-orders/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await sql.connect(dbConfig);
        
        // FIXED: Querying mridul.SalesOrderDetails to match the POST route
        const result = await pool.request()
            .input('soId', sql.Int, id)
            .query(`
                SELECT 
                    i.Quantity, 
                    i.Rate, 
                    p.ProductName 
                FROM mridul.SalesOrderDetails i
                INNER JOIN mridul.ProductMaster p ON i.ProductID = p.ProductID
                WHERE i.SO_ID = @soId
            `);
            
        res.status(200).json(result.recordset);
    } catch (err) { 
        res.status(500).json({ error: 'Failed to fetch sales order items' }); 
    }
});

// ==========================================
// SALES DISPATCH & OUTBOUND ROUTES
// ==========================================
// 1. POST: Process Outbound Dispatch and Deduct Finished Stock
app.post('/api/sales-dispatch', async (req, res) => {
    const { soId, vehicleNumber, dispatchedBy, items } = req.body;

    if (!soId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Sales Order and dispatch items are required' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        for (const item of items) {
            // A. Log the dispatch record
            const dispatchReq = new sql.Request(transaction);
            await dispatchReq
                .input('soId', sql.Int, soId)
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, item.quantity)
                .input('vehicle', sql.VarChar, vehicleNumber || null)
                .input('dispatchedBy', sql.VarChar, dispatchedBy)
                .query(`
                    INSERT INTO mridul.SalesDispatch (SO_ID, ProductID, DispatchedQty, VehicleNumber, DispatchedBy)
                    VALUES (@soId, @productId, @qty, @vehicle, @dispatchedBy)
                `);

            // B. Deduct Stock WITH a check to prevent negative inventory
            const stockReq = new sql.Request(transaction);
            const stockResult = await stockReq
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, item.quantity)
                .query(`
                    UPDATE mridul.ProductMaster 
                    SET ClosingBalance = ClosingBalance - @qty 
                    OUTPUT INSERTED.ClosingBalance
                    WHERE ProductID = @productId
                `);

            // Check if the resulting stock went negative (If DB doesn't have a CHECK constraint)
            if (stockResult.recordset.length > 0 && stockResult.recordset[0].ClosingBalance < 0) {
                throw new Error(`Insufficient stock for Product ID: ${item.productId}`);
            }
        }

        // C. Mark the Sales Order as Dispatched
        const statusReq = new sql.Request(transaction);
        await statusReq
            .input('soId', sql.Int, soId)
            .query(`
                UPDATE mridul.SalesOrderHeader 
                SET Status = 'Dispatched' 
                WHERE SO_ID = @soId
            `);

        await transaction.commit(); 
        res.status(201).json({ message: 'Goods dispatched and inventory deducted successfully!' });

    } catch (err) {
        // Safely rollback the transaction if it's active
        try {
            await transaction.rollback();
        } catch (rollbackErr) {
            console.error('Rollback failed:', rollbackErr);
        }
        
        console.error('Dispatch Transaction Failed:', err.message || err);
        
        // Return a friendly error to the frontend if it was a stock issue
        if (err.message && err.message.includes('Insufficient stock')) {
            return res.status(400).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Failed to process sales dispatch' });
    }
});
// 2. GET: Fetch Dispatch History
app.get('/api/sales-dispatch', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                d.DispatchID, d.DispatchDate, d.DispatchedQty, d.VehicleNumber, d.DispatchedBy,
                so.SONumber, p.ProductName
            FROM mridul.SalesDispatch d
            INNER JOIN mridul.SalesOrderHeader so ON d.SO_ID = so.SO_ID
            INNER JOIN mridul.ProductMaster p ON d.ProductID = p.ProductID
            ORDER BY d.DispatchDate DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching dispatches:', err);
        res.status(500).json({ error: 'Failed to fetch dispatch records' });
    }
});


const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});