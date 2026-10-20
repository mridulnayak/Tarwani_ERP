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
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // --- TEMPORARY DEMO OVERRIDE FOR YOUR PRESENTATION ---
        if (username === 'admin' && password === 'admin123') {
            const token = jwt.sign(
                { userId: 1, role: 'Admin', username: 'admin' }, 
                JWT_SECRET, 
                { expiresIn: '12h' }
            );
            return res.status(200).json({
                message: 'Login successful',
                token,
                user: { username: 'admin', role: 'Admin' }
            });
        }
        // -----------------------------------------------------

        const pool = await sql.connect(dbConfig);
        const userResult = await pool.request()
            .input('username', sql.VarChar, username)
            .query(`SELECT UserID, Username, PasswordHash, Role, EmployeeID FROM mridul.Users WHERE Username = @username AND IsActive = 1`);
        
        const user = userResult.recordset[0];

        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        if (!isPasswordValid) return res.status(401).json({ error: 'Invalid username or password' });

        const token = jwt.sign(
            { userId: user.UserID, role: user.Role, username: user.Username },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.status(200).json({ message: 'Login successful', token, user: { username: user.Username, role: user.Role } });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error during login' });
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
        const result = await pool.request().query(`
            SELECT p.ProductID, p.ProductName, p.ClosingBalance, b.BrandName 
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

// ==========================================
// PURCHASE ORDER ROUTES
// ==========================================

// 1. POST: Create a Purchase Order (Header + Details Transaction)
app.post('/api/purchase-orders', async (req, res) => {
    // We expect the frontend to send a vendorId and an array of items
    const { vendorId, items } = req.body; 
    
    if (!vendorId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Vendor and at least one item are required' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); // START THE TRANSACTION

        // Step 1: Generate a unique PO Number (e.g., PO-169824...)
        const poNumber = `PO-${Date.now()}`;

        // Step 2: Insert into Header Table
        const headerReq = new sql.Request(transaction);
        const headerResult = await headerReq
            .input('poNumber', sql.VarChar, poNumber)
            .input('vendorId', sql.Int, vendorId)
            .query(`
                INSERT INTO mridul.PurchaseOrderHeader (PONumber, VendorID) 
                OUTPUT INSERTED.PO_ID 
                VALUES (@poNumber, @vendorId)
            `);
        
        // Grab the auto-generated ID of the new Header
        const newPoId = headerResult.recordset[0].PO_ID; 

        // Step 3: Loop through the items array and insert into Details Table
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

        await transaction.commit(); // IF EVERYTHING SUCCEEDS, SAVE TO DATABASE
        res.status(201).json({ message: 'Purchase Order created successfully!', poNumber });

    } catch (err) {
        await transaction.rollback(); // IF ANYTHING FAILS, UNDO EVERYTHING
        console.error('Transaction Failed:', err);
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

// ==========================================
// PURCHASE RECEIVING & INVENTORY ROUTES
// ==========================================
// 1. POST: Process Received Goods and Update Tank Stock
app.post('/api/purchase-receiving', async (req, res) => {
    const { poId, productId, tankId, receivedQty, receivedBy } = req.body;

    if (!poId || !productId || !tankId || !receivedQty) {
        return res.status(400).json({ error: 'Missing required receiving details' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); // START INVENTORY TRANSACTION

        // Step 1: Log the Receiving Entry
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

        // Step 2: Add the received quantity to the Tank's CurrentStock
        const tankReq = new sql.Request(transaction);
        await tankReq
            .input('tankId', sql.Int, tankId)
            .input('qty', sql.Int, receivedQty)
            .query(`
                UPDATE mridul.TankMaster 
                SET CurrentStock = CurrentStock + @qty 
                WHERE TankID = @tankId
            `);

        // Step 3: Update the PO Status (Mark as Received/Completed)
        const statusReq = new sql.Request(transaction);
        await statusReq
            .input('poId', sql.Int, poId)
            .query(`
                UPDATE mridul.PurchaseOrderHeader 
                SET Status = 'Received' 
                WHERE PO_ID = @poId
            `);

        await transaction.commit(); // COMMIT ALL CHANGES TO DATABASE
        res.status(201).json({ message: 'Goods received and tank stock updated successfully!' });

    } catch (err) {
        await transaction.rollback(); // UNDO IF ANYTHING FAILS
        console.error('Receiving Transaction Failed:', err);
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

        if (!productId || !targetQuantity || targetQuantity <= 0) {
            return res.status(400).json({ error: 'Valid Product and Target Quantity are required' });
        }

        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('productId', sql.Int, productId)
            .input('salesOrderRef', sql.VarChar, salesOrderRef || null)
            .input('targetQty', sql.Int, targetQuantity)
            .query(`
                INSERT INTO mridul.ProductionOrder (ProductID, SalesOrderRef, TargetQuantity)
                VALUES (@productId, @salesOrderRef, @targetQty)
            `);

        res.status(201).json({ message: 'Production Order generated successfully!' });
    } catch (err) {
        console.error('Error creating Production Order:', err);
        res.status(500).json({ error: 'Failed to generate Production Order' });
    }
});

// 2. GET: Fetch all Production Orders with Product Details
app.get('/api/production-orders', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        // We JOIN with ProductMaster to get the ProductName and current ClosingBalance
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

// ==========================================
// ISSUAL MANAGEMENT ROUTES
// ==========================================
// 1. POST: Issue Materials and Deduct from Tanks
app.post('/api/issuals', async (req, res) => {
    // The frontend will send the linked Production Order and an array of raw materials taken
    const { productionOrderId, issuedBy, items } = req.body; 

    if (!productionOrderId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Production Order and at least one item are required' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); // START TRANSACTION

        // Step 1: Generate a unique Issue Number
        const issueNumber = `ISSUE-${Date.now()}`;

        // Step 2: Insert into Issual Header
        const headerReq = new sql.Request(transaction);
        const headerResult = await headerReq
            .input('issueNum', sql.VarChar, issueNumber)
            .input('poId', sql.Int, productionOrderId)
            .input('issuedBy', sql.VarChar, issuedBy)
            .query(`
                INSERT INTO mridul.IssualHeader (IssueNumber, ProductionOrderID, IssuedBy)
                OUTPUT INSERTED.IssueID
                VALUES (@issueNum, @poId, @issuedBy)
            `);
        
        const newIssueId = headerResult.recordset[0].IssueID;

        // Step 3: Loop through the items to insert Details AND deduct Tank stock
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
            
            // B. Subtract the issued quantity from the physical Tank
            const tankReq = new sql.Request(transaction);
            await tankReq
                .input('tankId', sql.Int, item.tankId)
                .input('qty', sql.Int, item.quantity)
                .query(`
                    UPDATE mridul.TankMaster
                    SET CurrentStock = CurrentStock - @qty
                    WHERE TankID = @tankId
                `);
        }

        // Step 4: Update the Production Order status to 'In Progress'
        const poReq = new sql.Request(transaction);
        await poReq
            .input('poId', sql.Int, productionOrderId)
            .query(`
                UPDATE mridul.ProductionOrder
                SET Status = 'In Progress'
                WHERE ProductionOrderID = @poId
            `);

        await transaction.commit(); // SAVE ALL CHANGES
        res.status(201).json({ message: 'Materials successfully issued to the floor!', issueNumber });

    } catch (err) {
        await transaction.rollback(); // UNDO IF ANYTHING FAILS (e.g., negative stock error)
        console.error('Issual Transaction Failed:', err);
        res.status(500).json({ error: 'Failed to issue materials' });
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
                po.ProductionOrderID AS ProductionRef, -- Corrected column name here
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

    if (!productionOrderId || !productId || producedQty == null) {
        return res.status(400).json({ error: 'Missing required production completion details' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); // START INVENTORY TRANSACTION

        // 1. Log the Finished Good Receipt
        const receiptReq = new sql.Request(transaction);
        await receiptReq
            .input('poId', sql.Int, productionOrderId)
            .input('productId', sql.Int, productId)
            .input('produced', sql.Int, producedQty)
            .input('wastage', sql.Int, wastageQty || 0)
            .input('loggedBy', sql.VarChar, loggedBy)
            .query(`
                INSERT INTO mridul.FinishedGoodsReceipt (ProductionOrderID, ProductID, ProducedQuantity, WastageQuantity, LoggedBy)
                VALUES (@poId, @productId, @produced, @wastage, @loggedBy)
            `);

        // 2. Increase Product Closing Balance (Finished Goods Inventory)
        const stockReq = new sql.Request(transaction);
        await stockReq
            .input('productId', sql.Int, productId)
            .input('qty', sql.Int, producedQty)
            .query(`
                UPDATE mridul.ProductMaster
                SET ClosingBalance = ClosingBalance + @qty
                WHERE ProductID = @productId
            `);

        // 3. Mark Production Order as Completed
        const poReq = new sql.Request(transaction);
        await poReq
            .input('poId', sql.Int, productionOrderId)
            .query(`
                UPDATE mridul.ProductionOrder
                SET Status = 'Completed'
                WHERE ProductionOrderID = @poId
            `);

        await transaction.commit(); // COMMIT ALL CHANGES TO DATABASE
        res.status(201).json({ message: 'Finished goods logged and inventory updated successfully!' });

    } catch (err) {
        await transaction.rollback(); // UNDO IF ANYTHING FAILS
        console.error('Finished Goods Transaction Failed:', err);
        res.status(500).json({ error: 'Failed to log finished goods' });
    }
});

// ==========================================
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
        await transaction.rollback();
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
 
// ==========================================
// SALES DISPATCH & OUTBOUND ROUTES
// ==========================================

// 1. POST: Process Outbound Dispatch and Deduct Finished Stock
app.post('/api/sales-dispatch', async (req, res) => {
    // We expect the Sales Order ID, truck details, and the items being shipped
    const { soId, vehicleNumber, dispatchedBy, items } = req.body;

    if (!soId || !items || items.length === 0) {
        return res.status(400).json({ error: 'Sales Order and dispatch items are required' });
    }

    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin(); // START OUTBOUND INVENTORY TRANSACTION

        // Step 1: Loop through shipped items to log dispatch and deduct stock
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

            // B. Deduct the shipped quantity from the Product's Closing Balance
            const stockReq = new sql.Request(transaction);
            await stockReq
                .input('productId', sql.Int, item.productId)
                .input('qty', sql.Int, item.quantity)
                .query(`
                    UPDATE mridul.ProductMaster 
                    SET ClosingBalance = ClosingBalance - @qty 
                    WHERE ProductID = @productId
                `);
        }

        // Step 2: Mark the Sales Order as Dispatched
        const statusReq = new sql.Request(transaction);
        await statusReq
            .input('soId', sql.Int, soId)
            .query(`
                UPDATE mridul.SalesOrderHeader 
                SET Status = 'Dispatched' 
                WHERE SO_ID = @soId
            `);

        await transaction.commit(); // COMMIT ALL CHANGES
        res.status(201).json({ message: 'Goods dispatched and inventory deducted successfully!' });

    } catch (err) {
        await transaction.rollback(); // UNDO IF ANYTHING FAILS (e.g., negative stock error)
        console.error('Dispatch Transaction Failed:', err);
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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});