require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const { buildPremiseDocxBuffer } = require('./lib/premiseDocx');
const tzLocations = require('./data/tz-locations.json');

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/locations', (req, res) => {
    res.json(tzLocations);
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'client_registry',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
});

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const clientUploadDir = path.join(uploadDir, req.clientUploadFolder);
            fs.mkdirSync(clientUploadDir, { recursive: true });
            cb(null, clientUploadDir);
        },
        filename: (req, file, cb) => {
            const safeName = file.originalname
                .replace(/\.[^/.]+$/, '')
                .replace(/[^a-zA-Z0-9-_]+/g, '_');
            const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
            cb(null, `${Date.now()}-${safeName}${ext}`);
        },
    }),
    limits: { fileSize: 15 * 1024 * 1024 },
});

async function ensureOptionalAccountFields() {
    const [columns] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'
         AND COLUMN_NAME IN ('email', 'password', 'status')`
    );
    const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
    if (!existingColumns.has('email')) {
        await pool.query('ALTER TABLE clients ADD COLUMN email VARCHAR(255)');
    }
    if (!existingColumns.has('password')) {
        await pool.query('ALTER TABLE clients ADD COLUMN password VARCHAR(255)');
    }
    if (!existingColumns.has('status')) {
        await pool.query("ALTER TABLE clients ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending'");
    }
}

async function ensurePremiseFields() {
    const [columns] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients'
         AND COLUMN_NAME IN (
            'premise_region', 'premise_district', 'premise_ward', 'premise_street',
            'premise_plot_number', 'premise_ownership',
            'landlord_name', 'landlord_phone', 'lease_period'
         )`
    );
    const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
    const columnsToAdd = [
        ['premise_region', 'VARCHAR(150)'],
        ['premise_district', 'VARCHAR(150)'],
        ['premise_ward', 'VARCHAR(150)'],
        ['premise_street', 'VARCHAR(150)'],
        ['premise_plot_number', 'VARCHAR(100)'],
        ['premise_ownership', 'VARCHAR(20)'],
        ['landlord_name', 'VARCHAR(200)'],
        ['landlord_phone', 'VARCHAR(30)'],
        ['lease_period', 'VARCHAR(150)'],
    ];
    for (const [name, type] of columnsToAdd) {
        if (!existingColumns.has(name)) await pool.query(`ALTER TABLE clients ADD COLUMN ${name} ${type}`);
    }
}

async function ensureClientDocumentsTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS client_documents (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            document_type VARCHAR(100) NOT NULL,
            display_name VARCHAR(255) NOT NULL,
            stored_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            file_size INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
    `);
}

async function migrateDocumentsToClientFolders() {
    const [clients] = await pool.query('SELECT id, full_name FROM clients');
    const clientFolders = new Map();

    for (const client of clients) {
        const folderName = `client-${client.id}-${sanitizeName(client.full_name)}`;
        const oldFolder = path.join(uploadDir, `client-${client.id}`);
        const newFolder = path.join(uploadDir, folderName);
        clientFolders.set(client.id, folderName);

        if (fs.existsSync(oldFolder) && oldFolder !== newFolder) {
            fs.mkdirSync(newFolder, { recursive: true });
            for (const fileName of fs.readdirSync(oldFolder)) {
                const oldFile = path.join(oldFolder, fileName);
                const newFile = path.join(newFolder, fileName);
                if (!fs.existsSync(newFile)) fs.renameSync(oldFile, newFile);
            }
            if (fs.readdirSync(oldFolder).length === 0) fs.rmdirSync(oldFolder);
        }
    }

    const [documents] = await pool.query(
        'SELECT id, client_id, stored_name FROM client_documents'
    );
    for (const document of documents) {
        const folderName = clientFolders.get(document.client_id);
        if (!folderName) continue;
        const clientUploadDir = path.join(uploadDir, folderName);
        fs.mkdirSync(clientUploadDir, { recursive: true });
        const currentPath = path.join(uploadDir, document.stored_name);
        const oldClientPath = path.join(uploadDir, `client-${document.client_id}`, document.stored_name);
        const newPath = path.join(clientUploadDir, document.stored_name);
        if (!fs.existsSync(newPath)) {
            if (fs.existsSync(currentPath)) fs.renameSync(currentPath, newPath);
            if (fs.existsSync(oldClientPath)) fs.renameSync(oldClientPath, newPath);
        }
        await pool.query(
            'UPDATE client_documents SET file_path = ? WHERE id = ?',
            [`/uploads/${folderName}/${document.stored_name}`, document.id]
        );
    }
}

async function ensureClientChecklistTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS client_checklist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            step_key VARCHAR(80) NOT NULL,
            completed TINYINT(1) NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_client_step (client_id, step_key),
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )
    `);
}

function sanitizeName(value) {
    return String(value || 'document')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'document';
}

async function convertImageToPdf(inputPath, outputPath) {
    const pdfDoc = await PDFDocument.create();
    const bytes = fs.readFileSync(inputPath);
    const isPng = inputPath.toLowerCase().endsWith('.png');
    const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
}

async function loadClientUploadFolder(req, res, next) {
    try {
        const [rows] = await pool.query('SELECT id, full_name FROM clients WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Client hajapatikana' });
        req.clientUploadFolder = `client-${rows[0].id}-${sanitizeName(rows[0].full_name)}`;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kuandaa folder la client' });
    }
}

app.get('/api/clients/:id/documents', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM client_documents WHERE client_id = ? ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kupata documents za mteja' });
    }
});

app.post('/api/clients/:id/documents', loadClientUploadFolder, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Tafadhali chagua document.' });
        }

        const clientId = req.params.id;
        const documentType = req.body.document_type || 'general';
        const [clientRows] = await pool.query('SELECT full_name FROM clients WHERE id = ?', [clientId]);
        if (!clientRows.length) {
            return res.status(404).json({ error: 'Client hajapatikana' });
        }

        const mimeType = req.file.mimetype || 'application/octet-stream';
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(mimeType)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Aina ya file si sahihi. Tumia PDF, PNG, JPG au JPEG.' });
        }

        const clientName = sanitizeName(clientRows[0].full_name);
        const typeName = sanitizeName(documentType);
        let finalPath = req.file.path;
        let finalMime = mimeType;
        let finalFileName = req.file.filename;

        if (mimeType === 'application/pdf') {
            finalFileName = `${typeName}_${clientName}_${Date.now()}.pdf`;
            finalPath = path.join(path.dirname(req.file.path), finalFileName);
            fs.renameSync(req.file.path, finalPath);
        } else {
            finalFileName = `${typeName}_${clientName}_${Date.now()}.pdf`;
            finalPath = path.join(path.dirname(req.file.path), finalFileName);
            await convertImageToPdf(req.file.path, finalPath);
            fs.unlinkSync(req.file.path);
            finalMime = 'application/pdf';
        }

        const displayName = `${documentType.replace(/_/g, ' ')} - ${clientRows[0].full_name}.pdf`;
        const fileSize = fs.statSync(finalPath).size;

        await pool.query(
            `INSERT INTO client_documents (client_id, document_type, display_name, stored_name, file_path, mime_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [clientId, documentType, displayName, finalFileName, `/uploads/${req.clientUploadFolder}/${finalFileName}`, finalMime, fileSize]
        );

        res.status(201).json({ success: true, message: 'Document imesave' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kupakia document' });
    }
});

const workflowSteps = [
    { key: 'google_account', label: 'Create / kuwa na Google account' },
    { key: 'brela_account', label: 'Create account BRELA BOS', link: 'https://bos.brela.go.tz/Home/Register' },
    { key: 'brela_review', label: 'Piga simu kwa mwakilishi wa BRELA kwa push na review ya application' },
    { key: 'download_invoice', label: 'Download invoice na mtumie user/client' },
];

app.get('/api/clients/:id/checklist', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT step_key, completed FROM client_checklist WHERE client_id = ?',
            [req.params.id]
        );
        const completedSteps = new Map(rows.map((row) => [row.step_key, Boolean(row.completed)]));
        res.json(workflowSteps.map((step) => ({ ...step, completed: completedSteps.get(step.key) || false })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kupata checklist ya client' });
    }
});

app.put('/api/clients/:id/checklist/:stepKey', async (req, res) => {
    try {
        const step = workflowSteps.find((item) => item.key === req.params.stepKey);
        if (!step) return res.status(400).json({ error: 'Hatua ya checklist haijatambulika' });
        await pool.query(
            `INSERT INTO client_checklist (client_id, step_key, completed)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE completed = VALUES(completed)`,
            [req.params.id, step.key, req.body.completed ? 1 : 0]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana ku-update checklist' });
    }
});

// GET all clients (with optional search)
app.get('/api/clients', async (req, res) => {
    try {
        const search = req.query.search;
        let rows;
        if (search) {
            const like = `%${search}%`;
            [rows] = await pool.query(
                `SELECT * FROM clients WHERE full_name LIKE ? OR phone_number LIKE ? OR nida_number LIKE ? ORDER BY created_at DESC`,
                [like, like, like]
            );
        } else {
            [rows] = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
        }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kupata taarifa za wateja' });
    }
});

// GET single client
app.get('/api/clients/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Client hajapatikana' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kupata taarifa' });
    }
});

app.get('/api/clients/:id/premise-certificate', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Client hajapatikana' });
        const buffer = await buildPremiseDocxBuffer(rows[0]);
        const fileName = `Uthibitisho_wa_Eneo_${sanitizeName(rows[0].full_name)}.docx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kutengeneza Uthibitisho wa Eneo' });
    }
});

// CREATE client
app.post('/api/clients', async (req, res) => {
    try {
        const {
            full_name, phone_number, nida_number, business_type, email, password, notes,
            mother_full_name, birth_place, std7_info,
            registered_phone_numbers, permanent_residence,
            nida_registration_place, premise_region, premise_district, premise_ward, premise_street,
            premise_plot_number, premise_ownership, landlord_name, landlord_phone, lease_period,
        } = req.body;
        const normalizedNidaNumber = String(nida_number || '').replace(/\D/g, '');
        if (!full_name || !phone_number || !normalizedNidaNumber || !business_type) {
            return res.status(400).json({ error: 'Tafadhali jaza fields zote muhimu' });
        }
        const [result] = await pool.query(
            `INSERT INTO clients (
                full_name, phone_number, nida_number, business_type, email, password, notes,
                mother_full_name, birth_place, std7_info,
                registered_phone_numbers, permanent_residence,
                nida_registration_place, premise_region, premise_district, premise_ward, premise_street,
                premise_plot_number, premise_ownership, landlord_name, landlord_phone, lease_period
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
            [
                full_name, phone_number, normalizedNidaNumber, business_type, email || null, password || null, notes || null,
                mother_full_name || null, birth_place || null, std7_info || null,
                registered_phone_numbers || null, permanent_residence || null,
                nida_registration_place || null,
                premise_region || null, premise_district || null, premise_ward || null, premise_street || null,
                premise_plot_number || null, premise_ownership || null, landlord_name || null, landlord_phone || null, lease_period || null,
            ]
        );
        res.status(201).json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana kusave client' });
    }
});

// UPDATE client
app.put('/api/clients/:id', async (req, res) => {
    try {
        const {
            full_name, phone_number, nida_number, business_type, email, password, notes,
            mother_full_name, birth_place, std7_info,
            registered_phone_numbers, permanent_residence,
            nida_registration_place, premise_region, premise_district, premise_ward, premise_street,
            premise_plot_number, premise_ownership, landlord_name, landlord_phone, lease_period,
        } = req.body;
        const normalizedNidaNumber = String(nida_number || '').replace(/\D/g, '');
        await pool.query(
            `UPDATE clients SET
                full_name=?, phone_number=?, nida_number=?, business_type=?, email=?, password=?, notes=?,
                mother_full_name=?, birth_place=?, std7_info=?,
                registered_phone_numbers=?, permanent_residence=?,
                nida_registration_place=?, premise_region=?, premise_district=?, premise_ward=?, premise_street=?,
                premise_plot_number=?, premise_ownership=?, landlord_name=?, landlord_phone=?, lease_period=?
            WHERE id=?`,
            [
                full_name, phone_number, normalizedNidaNumber, business_type, email || null, password || null, notes || null,
                mother_full_name || null, birth_place || null, std7_info || null,
                registered_phone_numbers || null, permanent_residence || null,
                nida_registration_place || null,
                premise_region || null, premise_district || null, premise_ward || null, premise_street || null,
                premise_plot_number || null, premise_ownership || null, landlord_name || null, landlord_phone || null, lease_period || null,
                req.params.id,
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana ku-update client' });
    }
});

app.patch('/api/clients/:id/status', async (req, res) => {
    const allowedStatuses = ['pending', 'in_progress', 'submitted', 'approved', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: 'Status si sahihi' });
    }
    try {
        await pool.query('UPDATE clients SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana ku-update status' });
    }
});

// DELETE client
app.delete('/api/clients/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM clients WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Imeshindikana ku-delete client' });
    }
});

const PORT = process.env.PORT || 4000;
Promise.all([
    ensureOptionalAccountFields(),
    ensurePremiseFields(),
    ensureClientDocumentsTable(),
    ensureClientChecklistTable(),
])
    .then(() => {
        return migrateDocumentsToClientFolders();
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Client Registry inaendesha kwenye http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Imeshindikana kuandaa database/fields za documents:', err.message);
        process.exit(1);
    });
