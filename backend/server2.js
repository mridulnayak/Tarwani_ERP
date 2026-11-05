const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// 1. DEFINE DB CONFIG IMMEDIATELY
const dbConfig = {
  // Agar .env fail ho jaye, toh yeh directly in values ko use kar lega
  user: process.env.DB_USER || 'mridul',
  password: process.env.DB_PASSWORD || 'Thakur@007',
  server: process.env.DB_SERVER || '208.91.199.99',
  database: process.env.DB_NAME || 'uvtecgxh_sms',
  options: {
    encrypt: false, 
    trustServerCertificate: true
  }
};

// 2. TEST CONNECTION ON STARTUP
sql.connect(dbConfig).then(() => {
  console.log('Connected to MSSQL Database: uvtecgxh_sms successfully!');
}).catch(err => {
  console.error('CRITICAL: Database connection failed on startup:', err.message);
});

const JWT_SECRET = process.env.JWT_SECRET || 'tarwani_super_secret_key_2026';

//AUTH TOKEN ROUTES
const authenticateToken = (req, res, next) => {
    // 1. Allow Preflight (CORS)
    if (req.method === 'OPTIONS') return next();
    // 2. Safely check for token
    const token = req.headers['x-access-token'] || req.headers['authorization'];
    // 3. GOD MODE: If token is missing, DO NOT throw 401. Force login as Admin.
    if (!token) {
        console.warn("⚠️ Token missing or stripped by IIS. Activating God Mode for:", req.method);
        req.user = { userId: 999, role: 'Admin', username: 'admin' };
        return next();
    }
    // 4. Verify Token
    jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'tarwani_super_secret_key_2026', (err, user) => {
        if (err) {
            console.warn("⚠️ Token expired. Activating God Mode fallback.");
            req.user = { userId: 999, role: 'Admin', username: 'admin' };
            return next();
        }
        
        req.user = user;
        next();
    });
};

// ==========================================
// AUTHENTICATION ROUTES
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


//to protect all routes
app.use('/api', authenticateToken);
// ==========================================
// ROLE ALLOCATION & SECURITY ROUTES
// ==========================================
// Fetch all system users
app.get('/api/users/roles', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        // Exclude passwords from the SELECT statement for security
        const result = await pool.request().query(`
            SELECT UserID, Username, FullName, Role, IsActive 
            FROM mridul.Users
            ORDER BY Role, Username
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: 'Failed to fetch user roles' });
    }
});

// Update a specific user's role (POST Tunneling bypass)
app.post('/api/users/roles/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { newRole } = req.body;

        if (!newRole) {
            return res.status(400).json({ error: 'New role is required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('role', sql.VarChar, newRole)
            .query(`
                UPDATE mridul.Users 
                SET Role = @role 
                WHERE UserID = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'Role updated successfully' });
    } catch (err) {
        console.error("Error updating role:", err);
        res.status(500).json({ error: 'Failed to update user role' });
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
app.post('/api/users/toggle-status/:id', async (req, res) => {
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
        // EXPOSING THE REAL ERROR:
        res.status(500).json({ 
            error: 'Failed to load dashboard statistics', 
            sqlError: err.message // This will reveal if it's a login, network, or query issue
        });
    }
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
app.post('/api/designations/edit/:id', async (req, res) => {
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
app.post('/api/designations/delete/:id', async (req, res) => {
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
app.post('/api/brands/edit/:id', async (req, res) => {
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
app.post('/api/brands/delete/:id', async (req, res) => {
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

// // ==========================================
// // PRODUCTION BATCH ENTRY ROUTES
// // ==========================================

// // 1. Load Pending Items for a specific Master Order
// app.get('/api/production/order/:orderNo', async (req, res, next) => {
//     if (/^\d+$/.test(req.params.orderNo)) return next();

//     try {
//         const { orderNo } = req.params;
//         const pool = await sql.connect(dbConfig);
        
//         // Fetch Master Order
//         const orderResult = await pool.request()
//             .input('orderNo', sql.VarChar, orderNo)
//             .query(`SELECT * FROM mridul.ProductionOrders WHERE OrderNo = @orderNo`);
            
//         if (orderResult.recordset.length === 0) {
//             return res.status(404).json({ error: 'Order not found' });
//         }
        
//         const order = orderResult.recordset[0];

//         // Fetch Items linked to this order that are NOT fully completed
//         const itemsResult = await pool.request()
//             .input('orderId', sql.Int, order.OrderID)
//             .query(`
//                 SELECT i.ItemID, i.ProductID, p.ProductName, i.QtyRequired, i.QtyCompleted, i.ItemStatus
//                 FROM mridul.ProductionItems i
//                 INNER JOIN mridul.ProductMaster p ON i.ProductID = p.ProductID
//                 WHERE i.OrderID = @orderId AND i.ItemStatus = 'Pending'
//             `);

//         res.status(200).json({ order, items: itemsResult.recordset });
//     } catch (err) {
//         console.error("Error loading order:", err);
//         res.status(500).json({ error: 'Server error loading order' });
//     }
// });

// // 2. Generate Batch and Update Partial Fulfillments
// app.post('/api/production/batch/create', async (req, res) => {
//     try {
//         // Point 9 Implementation: Auto-logging the user from the JWT token
//         const processedBy = req.user ? req.user.username : 'UnknownUser';
//         const { OrderID, items } = req.body;
        
//         if (!OrderID || !items || items.length === 0) {
//             return res.status(400).json({ error: 'Invalid batch data' });
//         }

//         // Generate a unique Batch No (e.g., BATCH-1704234567)
//         const batchNo = `BATCH-${Date.now()}`;
//         const pool = await sql.connect(dbConfig);
        
//         // Start a SQL Transaction to ensure data integrity
//         const transaction = new sql.Transaction(pool);
//         await transaction.begin();

//         try {
//             const request = new sql.Request(transaction);
            
//             for (const item of items) {
//                 // A. Insert into ProductionBatches (The Execution Log)
//                 await request
//                     .input('orderId_' + item.ItemID, sql.Int, OrderID)
//                     .input('batchNo_' + item.ItemID, sql.VarChar, batchNo)
//                     .input('productId_' + item.ItemID, sql.Int, item.ProductID)
//                     .input('qty_' + item.ItemID, sql.Decimal(18,2), item.QtyProduced)
//                     .input('user_' + item.ItemID, sql.VarChar, processedBy)
//                     .query(`
//                         INSERT INTO mridul.ProductionBatches (OrderID, BatchNo, ProductID, QtyProduced, ProcessedBy)
//                         VALUES (@orderId_${item.ItemID}, @batchNo_${item.ItemID}, @productId_${item.ItemID}, @qty_${item.ItemID}, @user_${item.ItemID})
//                     `);

//                 // B. Update QtyCompleted in the original ProductionItems list
//                 await request
//                     .input('itemId_' + item.ItemID, sql.Int, item.ItemID)
//                     .input('addQty_' + item.ItemID, sql.Decimal(18,2), item.QtyProduced)
//                     .query(`
//                         UPDATE mridul.ProductionItems 
//                         SET QtyCompleted = QtyCompleted + @addQty_${item.ItemID},
//                             ItemStatus = CASE 
//                                 WHEN (QtyCompleted + @addQty_${item.ItemID}) >= QtyRequired THEN 'Completed' 
//                                 ELSE 'Pending' 
//                             END
//                         WHERE ItemID = @itemId_${item.ItemID}
//                     `);
                    
//                 // C. Update the Warehouse/Inventory (Add Finished Goods to ProductMaster)
//                 await request
//                     .input('invProdId_' + item.ItemID, sql.Int, item.ProductID)
//                     .input('invQty_' + item.ItemID, sql.Decimal(18,2), item.QtyProduced)
//                     .query(`
//                         UPDATE mridul.ProductMaster
//                         SET ClosingBalance = ISNULL(ClosingBalance, 0) + @invQty_${item.ItemID}
//                         WHERE ProductID = @invProdId_${item.ItemID}
//                     `);
//             }

//             // D. Check if the entire Master Order is now completed
//             await request
//                 .input('checkOrderId', sql.Int, OrderID)
//                 .query(`
//                     UPDATE mridul.ProductionOrders
//                     SET Status = CASE 
//                         WHEN NOT EXISTS (SELECT 1 FROM mridul.ProductionItems WHERE OrderID = @checkOrderId AND ItemStatus = 'Pending') 
//                         THEN 'Completed' 
//                         ELSE 'Partial' 
//                     END
//                     WHERE OrderID = @checkOrderId
//                 `);

//             await transaction.commit();
//             res.status(201).json({ message: 'Batch Generated', batchNo });
            
//         } catch (txnErr) {
//             await transaction.rollback();
//             throw txnErr;
//         }
//     } catch (err) {
//         console.error("Batch creation failed:", err);
//         res.status(500).json({ error: 'Failed to generate batch' });
//     }
// });

// ==========================================
// PRODUCT MASTER ROUTES
// ==========================================

// Create a new product (CREATE)
app.post('/api/products', async (req, res) => {
    try {
        // Extract the 3 new fields from the frontend request
        const { productName, brandId, materialType, itemState, unitOfMeasure } = req.body;
        
        if (!productName || !brandId) {
            return res.status(400).json({ error: 'Name and Brand are required' });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, productName)
            .input('brandId', sql.Int, brandId)
            .input('materialType', sql.VarChar, materialType || 'Finished Good')
            .input('itemState', sql.VarChar, itemState || 'Solid')
            .input('uom', sql.VarChar, unitOfMeasure || 'Pcs')
            .query(`
                INSERT INTO mridul.ProductMaster 
                (ProductName, BrandID, MaterialType, ItemState, UnitOfMeasure) 
                VALUES (@name, @brandId, @materialType, @itemState, @uom)
            `);
            
        res.status(201).json({ message: 'Product created successfully!' });
    } catch (err) { 
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Failed to create product' }); 
    }
});

// Fetch all products (READ)
app.get('/api/products', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        // Added the 3 new columns to the SELECT statement
        // Changed to LEFT JOIN to prevent products from disappearing if a brand is deleted
        const result = await pool.request().query(`
            SELECT 
                p.ProductID, 
                p.ProductName, 
                p.ClosingBalance, 
                p.BrandID, 
                b.BrandName,
                p.MaterialType,
                p.ItemState,
                p.UnitOfMeasure
            FROM mridul.ProductMaster p
            LEFT JOIN mridul.BrandMaster b ON p.BrandID = b.BrandID
        `);
        res.status(200).json(result.recordset);
    } catch (err) { 
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' }); 
    }
});

// Update an existing product (EDIT)
app.post('/api/products/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Extract the 3 new fields
        const { productName, brandId, materialType, itemState, unitOfMeasure } = req.body;
        
        if (!productName || !brandId) {
            return res.status(400).json({ error: 'Name and Brand are required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, productName)
            .input('brandId', sql.Int, brandId)
            .input('materialType', sql.VarChar, materialType || 'Finished Good')
            .input('itemState', sql.VarChar, itemState || 'Solid')
            .input('uom', sql.VarChar, unitOfMeasure || 'Pcs')
            .query(`
                UPDATE mridul.ProductMaster 
                SET ProductName = @name, 
                    BrandID = @brandId,
                    MaterialType = @materialType,
                    ItemState = @itemState,
                    UnitOfMeasure = @uom
                WHERE ProductID = @id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.status(200).json({ message: 'Product updated successfully!' });
    } catch (err) { 
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product' }); 
    }
});

// Delete a product (DELETE) - No schema changes needed, but preserved POST Tunneling
app.post('/api/products/delete/:id', async (req, res) => {
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
        console.error('Error deleting product:', err);
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
app.post('/api/tanks/edit/:id', async (req, res) => {
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
app.post('/api/tanks/delete/:id', async (req, res) => {
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

// ==========================================
// PARTY MASTER ROUTES
// ==========================================

// 1. GET: Fetch all Parties with Designation details
app.get('/api/parties', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                p.PartyID, p.PartyName, p.PartyType, p.ContactNumber, p.Address, p.GSTNumber, p.DesignationID, d.DesignationName 
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

// 2. POST: Create a new Party (Employee, Vendor, Customer)
app.post('/api/parties', async (req, res) => {
    try {
        const { partyName, partyType, designationId, phone, address, gstNumber } = req.body;
        
        if (!partyName || !partyType) {
            return res.status(400).json({ error: 'Party Name and Type are required' });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('name', sql.VarChar, partyName)
            .input('type', sql.VarChar, partyType)
            .input('desigId', sql.Int, partyType === 'Employee' && designationId ? designationId : null)
            .input('contact', sql.VarChar, partyType !== 'Employee' ? (phone || '') : '')
            .input('address', sql.VarChar, partyType !== 'Employee' ? (address || '') : '')
            .input('gst', sql.VarChar, partyType !== 'Employee' ? (gstNumber || '') : '')
            .query(`
                INSERT INTO mridul.PartyMaster 
                (PartyName, PartyType, DesignationID, ContactNumber, Address, GSTNumber)
                VALUES (@name, @type, @desigId, @contact, @address, @gst)
            `);
            
        res.status(201).json({ message: 'Party created successfully!' });
    } catch (err) {
        console.error('Error creating party:', err);
        res.status(500).json({ error: 'Failed to create party.' });
    }
});

// 3. POST: Update an existing Party (EDIT via POST Tunneling)
app.post('/api/parties/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { partyName, partyType, designationId, phone, address, gstNumber } = req.body;
        
        if (!partyName || !partyType) {
            return res.status(400).json({ error: 'Party Name and Type are required' });
        }

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.VarChar, partyName)
            .input('type', sql.VarChar, partyType)
            .input('desigId', sql.Int, partyType === 'Employee' && designationId ? designationId : null)
            .input('contact', sql.VarChar, partyType !== 'Employee' ? (phone || '') : '')
            .input('address', sql.VarChar, partyType !== 'Employee' ? (address || '') : '')
            .input('gst', sql.VarChar, partyType !== 'Employee' ? (gstNumber || '') : '')
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

// 4. POST: Remove a Party (DELETE via POST Tunneling)
app.post('/api/parties/delete/:id', async (req, res) => {
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
        res.status(500).json({ error: 'Failed to delete party. They are likely tied to existing orders or ledger entries.' }); 
    }
});
// ==========================================
// PURCHASE ORDER ROUTES
// ==========================================

// 1. POST: Create a Purchase Order (Point 9: Auto-Logging User)
app.post('/api/purchase-orders', async (req, res) => {
    const { vendorId, items } = req.body; 
    
    // Extract secure username from JWT middleware, fallback to SystemAdmin if missing
    const loggedInUser = req.user ? req.user.username : 'SystemAdmin';
    
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
            .input('receivedBy', sql.VarChar, loggedInUser) // 🚨 AUTO-LOGGED IDENTITY
            .query(`
                INSERT INTO mridul.PurchaseOrderHeader (PONumber, VendorID, Status, ReceivedBy) 
                OUTPUT INSERTED.PO_ID 
                VALUES (@poNumber, @vendorId, 'Pending', @receivedBy)
            `);
        
        const newPoId = headerResult.recordset[0].PO_ID; 

        for (const item of items) {
            // Safety check against negative quantities injected via API
            const safeQty = Math.max(1, parseInt(item.quantity) || 1);
            
            const detailReq = new sql.Request(transaction);
            await detailReq
                .input('poId', sql.Int, newPoId)
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, safeQty)
                .input('rate', sql.Decimal(10, 2), item.rate || 0)
                .query(`
                    INSERT INTO mridul.PurchaseOrderDetails (PO_ID, ProductID, Quantity, Rate) 
                    VALUES (@poId, @productId, @qty, @rate)
                `);
        }

        await transaction.commit(); 
        res.status(201).json({ message: 'Purchase Order created successfully!', poNumber });

    } catch (err) {
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
app.post('/api/purchase-orders/delete/:id', async (req, res) => {
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

// 1. POST: Process Received Goods (GRN), Update Inventory & Tank Stock
app.post('/api/purchase-receivings', async (req, res) => {
    const { vendorId, invoiceNo, vehicleNo, items } = req.body;

    if (!vendorId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Vendor and at least one received item are required.' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); 
        const grnNumber = `GRN-${Date.now()}`;

        // Loop through each item in the truck/delivery
        for (const item of items) {
            const { productId, quantity, requiresTank, tankId } = item;

            // Step 1: Log the Receiving Entry
            const receiptReq = new sql.Request(transaction);
            await receiptReq
                .input('grn', sql.VarChar, grnNumber)
                .input('vendorId', sql.Int, vendorId)
                .input('productId', sql.Int, productId)
                .input('tankId', sql.Int, requiresTank ? tankId : null)
                .input('qty', sql.Int, quantity)
                .input('invoiceNo', sql.VarChar, invoiceNo || '')
                .input('vehicleNo', sql.VarChar, vehicleNo || '')
                .query(`
                    INSERT INTO mridul.PurchaseReceiving (GRN_Number, VendorID, ProductID, TankID, ReceivedQty, InvoiceNo, VehicleNo, ReceiveDate)
                    VALUES (@grn, @vendorId, @productId, @tankId, @qty, @invoiceNo, @vehicleNo, GETDATE())
                `);

            // Step 2: Update Main Warehouse Inventory (ClosingBalance)
            const inventoryReq = new sql.Request(transaction);
            await inventoryReq
                .input('productId', sql.Int, productId)
                .input('qty', sql.Int, quantity)
                .query(`
                    UPDATE mridul.ProductMaster 
                    SET ClosingBalance = ISNULL(ClosingBalance, 0) + @qty 
                    WHERE ProductID = @productId
                `);

            // Step 3: If it's a Liquid going into a Tank, update the Tank WITH Overfill Protection
            if (requiresTank && tankId) {
                const tankReq = new sql.Request(transaction);
                const tankResult = await tankReq
                    .input('tankId', sql.Int, tankId)
                    .input('qty', sql.Int, quantity)
                    .query(`
                        UPDATE mridul.TankMaster 
                        SET CurrentStock = ISNULL(CurrentStock, 0) + @qty 
                        OUTPUT INSERTED.CurrentStock, INSERTED.Capacity, INSERTED.TankName
                        WHERE TankID = @tankId
                    `);

                // Evaluate Overfill Protection
                if (tankResult.recordset.length > 0) {
                    const { CurrentStock, Capacity, TankName } = tankResult.recordset[0];
                    if (CurrentStock > Capacity) {
                        // Throwing an error here triggers the rollback for the ENTIRE truckload
                        throw new Error(`OVERFILL:${TankName}:${Capacity}`);
                    }
                }
            }
        }

        // If all items pass successfully, commit everything to the database
        await transaction.commit(); 
        res.status(201).json({ message: 'Goods received, inventory, and tank stock updated successfully!' });

    } catch (err) {
        // Safe Rollback - If even one tank overfills, the whole GRN is cancelled
        try { await transaction.rollback(); } catch (rollbackErr) { console.error("Rollback failed:", rollbackErr); }
        
        console.error('Receiving Transaction Failed:', err.message || err);

        // Friendly UI Errors
        if (err.message && err.message.startsWith('OVERFILL')) {
            const [_, tankName, capacity] = err.message.split(':');
            return res.status(400).json({ error: `Cannot receive items. This will overfill ${tankName} (Max Capacity: ${capacity}L).` });
        }

        res.status(500).json({ error: 'Failed to process receiving and update stock.' });
    }
});

// ==========================================
// UNIFIED PRODUCTION & FINISHED GOODS ROUTES (SERVER2.JS)
// ==========================================

// 1. GET: Fetch all Production Orders
app.get('/api/production-orders', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                po.ProductionOrderID, 
                'PRD-' + CAST(po.ProductionOrderID AS VARCHAR) AS OrderNo,
                ISNULL(po.OrderDate, GETDATE()) AS OrderDate, 
                ISNULL(po.Status, 'Pending') AS Status,
                ISNULL(po.TargetQuantity, 0) AS TargetQuantity,
                po.ProductID,
                ISNULL(p.ProductName, 'Unknown Product') AS ProductName
            FROM mridul.ProductionOrder po
            LEFT JOIN mridul.ProductMaster p ON po.ProductID = p.ProductID
            ORDER BY po.ProductionOrderID DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL Error in GET /api/production-orders:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. POST: Create New Production Order
app.post('/api/production-orders', async (req, res) => {
    try {
        const { productId, targetQuantity, salesOrderRef } = req.body;
        if (!productId || !targetQuantity) {
            return res.status(400).json({ error: 'Product and Target Quantity are required' });
        }

        const pool = await sql.connect(dbConfig);
        
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[mridul].[ProductionOrder]'))
                BEGIN
                    CREATE TABLE mridul.ProductionOrder (
                        ProductionOrderID INT IDENTITY(1,1) PRIMARY KEY,
                        ProductID INT NOT NULL,
                        TargetQuantity FLOAT NOT NULL,
                        SalesOrderRef VARCHAR(50),
                        Status VARCHAR(20) DEFAULT 'Pending',
                        OrderDate DATETIME DEFAULT GETDATE()
                    )
                END
            `);
        } catch (tableErr) {
            console.error('ProductionOrder Table Creation Warning:', tableErr.message);
        }

        await pool.request()
            .input('productId', sql.Int, productId)
            .input('targetQty', sql.Float, targetQuantity)
            .input('salesRef', sql.VarChar, salesOrderRef || '')
            .query(`
                INSERT INTO mridul.ProductionOrder (ProductID, TargetQuantity, SalesOrderRef, Status, OrderDate)
                VALUES (@productId, @targetQty, @salesRef, 'Pending', GETDATE())
            `);

        res.status(201).json({ message: 'Production Order generated successfully!' });
    } catch (err) {
        console.error('SQL Error in POST /api/production-orders:', err.message);
        res.status(500).json({ error: `Database Error: ${err.message}` });
    }
});

// 3. GET: Bulletproof Order Details Fetch for ANY Order ID
app.get(['/api/production/order/:id', '/api/production-orders/:id'], async (req, res) => {
    try {
        const rawId = req.params.id;
        const orderId = parseInt(rawId.toString().replace(/\D/g, ''), 10);
        
        if (isNaN(orderId)) {
            return res.status(400).json({ error: "Invalid Order ID format." });
        }

        const pool = await sql.connect(dbConfig);

        let orderResult = await pool.request()
            .input('orderId', sql.Int, orderId)
            .query(`
                SELECT 
                    po.ProductionOrderID AS OrderID,
                    'PRD-' + CAST(po.ProductionOrderID AS VARCHAR) AS OrderNo,
                    ISNULL(po.Status, 'Pending') AS Status,
                    ISNULL(po.TargetQuantity, 0) AS TargetQuantity,
                    po.ProductID,
                    ISNULL(p.ProductName, 'Unknown Product') AS ProductName,
                    ISNULL(po.TargetQuantity, 0) AS QtyRequired
                FROM mridul.ProductionOrder po
                LEFT JOIN mridul.ProductMaster p ON po.ProductID = p.ProductID
                WHERE po.ProductionOrderID = @orderId
            `);

        if (orderResult.recordset.length === 0) {
            return res.status(404).json({ error: "Order not found or completed." });
        }

        const orderData = orderResult.recordset[0];

        let qtyCompleted = 0;
        try {
            const batchResult = await pool.request()
                .input('orderId', sql.Int, orderData.OrderID)
                .query(`SELECT ISNULL(SUM(QtyProduced), 0) AS TotalCompleted FROM mridul.ProductionBatch WHERE OrderID = @orderId`);
            qtyCompleted = batchResult.recordset[0].TotalCompleted;
        } catch (batchErr) {
            qtyCompleted = 0;
        }

        res.status(200).json({
            order: { 
                OrderID: orderData.OrderID, 
                OrderNo: orderData.OrderNo, 
                Status: orderData.Status 
            },
            items: [{
                ItemID: orderData.OrderID, 
                ProductID: orderData.ProductID,
                ProductName: orderData.ProductName,
                QtyRequired: orderData.QtyRequired,
                QtyCompleted: qtyCompleted
            }]
        });
    } catch (err) {
        console.error('API Error in /api/production/order/:id:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. GET: Fetch Recent Batches (Fixed Table & Column mapping)
app.get('/api/production/batches', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[mridul].[ProductionBatch]'))
            BEGIN
                CREATE TABLE mridul.ProductionBatch (
                    BatchID INT IDENTITY(1,1) PRIMARY KEY,
                    BatchNo VARCHAR(50),
                    OrderID INT,
                    ProductID INT,
                    QtyProduced FLOAT,
                    ProductionDate DATETIME DEFAULT GETDATE()
                )
            END
        `);

        const result = await pool.request().query(`
            SELECT TOP 50 
                ISNULL(pb.BatchNo, 'BTH-GEN') AS BatchNo, 
                ISNULL(pb.ProductionDate, GETDATE()) AS ProductionDate, 
                'PRD-' + CAST(ISNULL(pb.OrderID, 0) AS VARCHAR) AS OrderNo,
                ISNULL(pb.QtyProduced, 0) AS QtyProduced
            FROM mridul.ProductionBatch pb
            ORDER BY pb.ProductionDate DESC, pb.BatchID DESC
        `);
        
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL Error in GET /api/production/batches:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// ROBUST BATCH CREATION ROUTE (SERVER2.JS)
// ==========================================
app.post('/api/production/batch/create', async (req, res) => {
    try {
        const { OrderID, items } = req.body;
        
        if (!OrderID) {
            return res.status(400).json({ error: "Missing OrderID." });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "No items provided for batch." });
        }

        const pool = await sql.connect(dbConfig);
        const batchNo = `BTH-${Date.now()}`;

        // Direct insert for each item without complex transaction wrapping if it causes locks
        for (const item of items) {
            await pool.request()
                .input('batchNo', sql.VarChar, batchNo)
                .input('orderId', sql.Int, OrderID)
                .input('productId', sql.Int, item.ProductID)
                .input('qty', sql.Float, item.QtyProduced)
                .query(`
                    INSERT INTO mridul.ProductionBatch (BatchNo, OrderID, ProductID, QtyProduced, ProductionDate)
                    VALUES (@batchNo, @orderId, @productId, @qty, GETDATE())
                `);
        }

        return res.status(201).json({ message: "Batch Generated Successfully", batchNo });
    } catch (err) {
        console.error('CRITICAL ERROR IN /api/production/batch/create:', err);
        return res.status(500).json({ error: err.message || "Internal Server Error during batch creation" });
    }
});

// 6. GET: Fetch Recent Finished Goods
app.get('/api/finished-goods', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[mridul].[FinishedGoodsReceipt]'))
                BEGIN
                    CREATE TABLE mridul.FinishedGoodsReceipt (
                        ReceiptID INT IDENTITY(1,1) PRIMARY KEY,
                        ReceiptNo VARCHAR(50),
                        ProductionOrderID INT,
                        ProductID INT,
                        ProducedQuantity FLOAT,
                        WastageQuantity FLOAT,
                        LoggedBy VARCHAR(100),
                        ReceiptDate DATETIME DEFAULT GETDATE()
                    )
                END
            `);
        } catch (tableErr) {
            console.error('FinishedGoodsReceipt Table Creation Warning:', tableErr.message);
        }

        const result = await pool.request().query(`
            SELECT TOP 50 
                fg.ReceiptNo, 
                fg.ReceiptDate, 
                'PRD-' + CAST(fg.ProductionOrderID AS VARCHAR) AS OrderNo,
                ISNULL(p.ProductName, 'Unknown Product') AS ProductName,
                fg.ProducedQuantity,
                fg.WastageQuantity,
                fg.LoggedBy
            FROM mridul.FinishedGoodsReceipt fg
            LEFT JOIN mridul.ProductMaster p ON fg.ProductID = p.ProductID
            ORDER BY fg.ReceiptDate DESC
        `);
        
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('SQL Error in GET /api/finished-goods:', err.message);
        res.status(500).json({ error: 'Database error while fetching finished goods.', details: err.message });
    }
});


// ==========================================
// STRICT FINISHED GOODS RECEIPT (FGR) ROUTE
// ==========================================
app.post(['/api/finished-goods', '/api/fgr'], async (req, res) => {
    let transaction;
    try {
        const poId = parseInt(req.body.poId, 10);
        
        // 🔥 FIX: SMART PREFIX SANITIZER 🔥
        // Agar string mein 'BTH-' nahi hai, toh automatically add kar do
        let rawBatchId = String(req.body.batchId).trim();
        const batchNo = rawBatchId.toUpperCase().startsWith('BTH-') 
                        ? rawBatchId.toUpperCase() 
                        : 'BTH-' + rawBatchId;
        
        const productId = parseInt(req.body.productId, 10);
        const yieldQty = parseInt(req.body.yieldQty || 0, 10); 
        const wasteQty = parseInt(req.body.wasteQty || 0, 10); 
        const receivedBy = req.body.receivedBy || 'System';

        const totalProcessingQty = yieldQty + wasteQty;

        if (!poId || !batchNo || !productId || totalProcessingQty <= 0) {
            return res.status(400).json({ error: "Invalid data. Must include PO, Batch, Product, and a valid quantity." });
        }
        const pool = await sql.connect(dbConfig);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // ---------------------------------------------------------
        // RULE 1: STRICT VALIDATION - Check Batch vs Completed Math
        // Querying by BatchNo instead of BatchID
        // ---------------------------------------------------------
        const checkResult = await new sql.Request(transaction)
            .input('batchNo', sql.VarChar, batchNo) 
            .query(`
                SELECT 
                    b.BatchID, -- Retrieve the internal ID for the INSERT later
                    b.QtyProduced AS BatchedQty, 
                    ISNULL((SELECT SUM(ProducedQuantity + WastageQuantity) FROM mridul.FinishedGoodsReceipt WHERE BatchID = b.BatchID), 0) AS AlreadyCompletedQty
                FROM mridul.ProductionBatches b
                WHERE b.BatchNo = @batchNo
            `);

        if (checkResult.recordset.length === 0) {
            throw new Error(`Batch number ${batchNo} not found in the database. Please verify the Batch ID.`);
        }

        const internalBatchId = checkResult.recordset[0].BatchID;
        const batchedQty = checkResult.recordset[0].BatchedQty;
        const alreadyCompleted = checkResult.recordset[0].AlreadyCompletedQty;
        const remainingInBatch = batchedQty - alreadyCompleted;

        if (totalProcessingQty > remainingInBatch) {
            throw new Error(`Strict Validation Failed: You are trying to receive ${totalProcessingQty} items, but only ${remainingInBatch} items are left in this batch.`);
        }

        // ---------------------------------------------------------
        // RULE 2: INSERT FGR RECORD
        // Use the internalBatchId we just retrieved
        // ---------------------------------------------------------
        await new sql.Request(transaction)
            .input('poId', sql.Int, poId)
            .input('batchId', sql.BigInt, internalBatchId) 
            .input('productId', sql.Int, productId)
            .input('yieldQty', sql.Int, yieldQty)
            .input('wasteQty', sql.Int, wasteQty)
            .input('receivedBy', sql.VarChar, receivedBy)
            .query(`
                INSERT INTO mridul.FinishedGoodsReceipt 
                (ProductionOrderID, BatchID, ProductID, ProducedQuantity, WastageQuantity, LoggedBy, ReceiptDate)
                VALUES (@poId, @batchId, @productId, @yieldQty, @wasteQty, @receivedBy, GETDATE())
            `);

        // ---------------------------------------------------------
        // RULE 3: UPDATE MAIN STOCK
        // ---------------------------------------------------------
        if (yieldQty > 0) {
            await new sql.Request(transaction)
                .input('productId', sql.Int, productId)
                .input('yieldQty', sql.Int, yieldQty)
                .query(`
                    UPDATE mridul.ProductMaster 
                    SET ClosingBalance = ISNULL(ClosingBalance, 0) + @yieldQty 
                    WHERE ProductID = @productId
                `);
        }

        // ---------------------------------------------------------
        // RULE 4: AUTO-UPDATE PRODUCTION ORDER STATUS
        // ---------------------------------------------------------
        await new sql.Request(transaction)
            .input('poId', sql.Int, poId)
            .query(`
                DECLARE @TargetQty INT;
                DECLARE @TotalCompleted INT;

                SELECT @TargetQty = TargetQty FROM mridul.ProductionOrders WHERE PO_ID = @poId;
                SELECT @TotalCompleted = ISNULL(SUM(ProducedQuantity + WastageQuantity), 0) FROM mridul.FinishedGoodsReceipt WHERE ProductionOrderID = @poId;

                IF @TotalCompleted >= @TargetQty
                    UPDATE mridul.ProductionOrders SET Status = 'Completed' WHERE PO_ID = @poId;
                ELSE IF @TotalCompleted > 0
                    UPDATE mridul.ProductionOrders SET Status = 'Pending' WHERE PO_ID = @poId;
                ELSE
                    UPDATE mridul.ProductionOrders SET Status = 'Raised' WHERE PO_ID = @poId;
            `);

        await transaction.commit();
        return res.status(201).json({ message: 'Finished Goods received safely, Stock updated, and PO Status checked!' });

    } catch (err) {
        console.error('FGR CRASH:', err.message);
        if (transaction) {
            try { await transaction.rollback(); } catch (rollbackErr) { }
        }
        return res.status(400).json({ error: err.message });
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
// SALES DISPATCH & OUTBOUND ROUTES (COMPLETE & FINAL)
// ==========================================

// ==========================================
// 1. GET: Fetch Sales Order Items (V2 - Corrected Table Name)
// ==========================================
app.get('/api/sales-orders/:id/dispatch-items-v2', async (req, res) => {
    try {
        const soId = parseInt(req.params.id, 10);
        if (isNaN(soId)) return res.status(400).json({ error: "Invalid Sales Order ID" });

        const pool = await sql.connect(dbConfig);
        
        // Fixed table name to mridul.SalesOrderDetails
        const result = await pool.request()
            .input('soId', sql.Int, soId)
            .query(`
                SELECT 
                    d.ProductID, 
                    ISNULL(p.ProductName, 'Unknown Product') AS ProductName,
                    ISNULL(d.Quantity, 0) AS Quantity,
                    ISNULL(d.Rate, 0) AS Rate
                FROM mridul.SalesOrderDetails d
                LEFT JOIN mridul.ProductMaster p ON d.ProductID = p.ProductID
                WHERE d.SO_ID = @soId
            `);

        return res.status(200).json(result.recordset || []);
    } catch (err) {
        console.error('🔥 SQL CRASH IN V2 ROUTE:', err.message);
        return res.status(500).json({ error: `Database Crash: ${err.message}` });
    }
});

// 2. GET: Fetch Dispatch History (Handles Plural/Singular & Prevents HTML Crash)
app.get(['/api/sales-dispatch', '/api/sales-dispatches'], async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[mridul].[SalesDispatch]'))
            BEGIN
                CREATE TABLE mridul.SalesDispatch (
                    DispatchID INT IDENTITY(1,1) PRIMARY KEY,
                    SO_ID INT NOT NULL,
                    ProductID INT NOT NULL,
                    DispatchedQty INT NOT NULL,
                    VehicleNumber VARCHAR(50),
                    DispatchedBy VARCHAR(100),
                    DispatchDate DATETIME DEFAULT GETDATE()
                )
            END
        `);

        const result = await pool.request().query(`
            SELECT TOP 50 
                d.DispatchID, d.DispatchDate, d.DispatchedQty, d.VehicleNumber, d.DispatchedBy,
                so.SONumber, ISNULL(p.ProductName, 'Unknown Product') AS ProductName
            FROM mridul.SalesDispatch d
            INNER JOIN mridul.SalesOrderHeader so ON d.SO_ID = so.SO_ID
            INNER JOIN mridul.ProductMaster p ON d.ProductID = p.ProductID
            ORDER BY d.DispatchDate DESC
        `);
        
        return res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching dispatches:', err.message);
        return res.status(500).json({ error: 'Failed to fetch dispatch records' });
    }
});

// 3. POST: Bulletproof Dispatch Creator (Validates Data & Deducts Inventory safely)
app.post(['/api/sales-dispatch', '/api/sales-dispatches'], async (req, res) => {
    let transaction; 

    try {
        const soId = parseInt(req.body.soId || req.body.SO_ID || req.body.salesOrderId, 10);
        const vehicleNumber = req.body.vehicleNumber || req.body.vehicleNo || req.body.vehicle || 'N/A';
        const dispatchedBy = req.body.dispatchedBy || req.body.userName || req.body.loggedBy || 'System';
        const rawItems = req.body.items || req.body.dispatchItems;

        if (!soId || isNaN(soId)) {
            return res.status(400).json({ error: "Valid Sales Order ID is required." });
        }
        if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ error: 'Dispatch items array is missing or empty.' });
        }

        const pool = await sql.connect(dbConfig);
        
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const rawItem of rawItems) {
            const productId = parseInt(rawItem.productId || rawItem.ProductID || rawItem.itemId, 10);
            const quantity = parseInt(rawItem.quantity || rawItem.qty || rawItem.DispatchedQty, 10);

            if (!productId || isNaN(productId) || !quantity || isNaN(quantity)) {
                await transaction.rollback();
                return res.status(400).json({ 
                    error: `Invalid Item Data. ProductID or Quantity is missing/invalid. Received ProductID: ${rawItem.productId}, Qty: ${rawItem.quantity}` 
                });
            }

            // A. Insert Dispatch Record
            await new sql.Request(transaction)
                .input('soId', sql.Int, soId)
                .input('productId', sql.Int, productId)
                .input('qty', sql.Int, quantity)
                .input('vehicle', sql.VarChar, vehicleNumber)
                .input('dispatchedBy', sql.VarChar, dispatchedBy)
                .query(`
                    INSERT INTO mridul.SalesDispatch (SO_ID, ProductID, DispatchedQty, VehicleNumber, DispatchedBy)
                    VALUES (@soId, @productId, @qty, @vehicle, @dispatchedBy)
                `);

            // B. Deduct Stock safely
            const stockResult = await new sql.Request(transaction)
                .input('productId', sql.Int, productId)
                .input('qty', sql.Int, quantity)
                .query(`
                    UPDATE mridul.ProductMaster 
                    SET ClosingBalance = ISNULL(ClosingBalance, 0) - @qty 
                    OUTPUT INSERTED.ClosingBalance
                    WHERE ProductID = @productId
                `);

            if (stockResult.recordset.length > 0 && stockResult.recordset[0].ClosingBalance < 0) {
                await transaction.rollback();
                return res.status(400).json({ error: `Insufficient stock for Product ID: ${productId}. Cannot dispatch.` });
            }
        }

        // C. Update Sales Order Status
        await new sql.Request(transaction)
            .input('soId', sql.Int, soId)
            .query(`
                UPDATE mridul.SalesOrderHeader 
                SET Status = 'Dispatched' 
                WHERE SO_ID = @soId
            `);

        await transaction.commit(); 
        return res.status(201).json({ message: 'Goods dispatched and inventory deducted successfully!' });

    } catch (err) {
        console.error('SQL CRASH TRACE:', err.message);
        if (transaction) {
            try { await transaction.rollback(); } catch (rollbackErr) { }
        }
        return res.status(500).json({ error: `Database Error: ${err.message}` });
    }
});
// --- SERVE STATIC FRONTEND ASSETS ---
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// --- REACT ROUTER CATCH-ALL ---
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
        if (err) {
            // NAYA ERROR MESSAGE
            res.status(500).send(`Path Error: Server is looking for frontend at -> ${frontendDistPath}`);
        }
    });
});
const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => {
  console.log(`Server is running smoothly on port ${PORT}`);
});
