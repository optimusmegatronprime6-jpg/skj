/**
 * Shree Kamakshi Jewellers — Backend API Server
 * 
 * Express server with JSON file database providing:
 * - JWT-based admin authentication
 * - Shop status & metal rate management
 * - Jewelry inventory CRUD with image upload
 * - Reminder notes CRUD
 * - Rate change history tracking
 * - Activity log
 * - Analytics data endpoints
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { getDb, saveDb, nextId, initializeDatabase, closeDatabase } = require('./database');
const authMiddleware = require('./middleware/auth');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const MAX_IMAGE_SIZE = (parseInt(process.env.MAX_IMAGE_SIZE_MB) || 5) * 1024 * 1024;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve the frontend files from the sibling frontend directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─────────────────────────────────────────────
// Multer config for image uploads
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, uniqueName + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
        }
    }
});

// ─────────────────────────────────────────────
// Helper: Log activity
// ─────────────────────────────────────────────
function logActivity(type, message) {
    const db = getDb();
    db.activity_log.unshift({
        id: nextId('activity_log'),
        type,
        message,
        created_at: new Date().toISOString()
    });
    // Keep only last 100 entries
    if (db.activity_log.length > 100) db.activity_log.length = 100;
    saveDb();
}

// ═════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ═════════════════════════════════════════════

// ─── Root → Landing Page ───
app.get('/', (req, res) => {
    res.redirect('/landing.html');
});

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Get Shop Settings (public) ───
app.get('/api/settings', (req, res) => {
    try {
        const db = getDb();
        const s = db.settings;
        res.json({
            status: s.status,
            gold24kRate: s.gold_24k_rate,
            gold22kRate: s.gold_22k_rate,
            gold19kRate: s.gold_19k_rate,
            silverRate: s.silver_rate,
            updatedAt: s.updated_at
        });
    } catch (err) {
        console.error('GET /api/settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// ─── Get Inventory (public) ───
app.get('/api/inventory', (req, res) => {
    try {
        const db = getDb();
        const { category } = req.query;

        let items = db.inventory;
        if (category && category !== 'all') {
            items = items.filter(i => i.category === category);
        }

        // Map to frontend-friendly names
        const mapped = items.map(item => ({
            id: item.id,
            name: item.name,
            name_kn: item.name_kn,
            category: item.category,
            price: item.price,
            desc: item.description,
            desc_kn: item.description_kn,
            image: item.image_url,
            createdAt: item.created_at
        }));

        res.json(mapped);
    } catch (err) {
        console.error('GET /api/inventory error:', err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// ─── Get Rate History (public) ───
app.get('/api/rates/history', (req, res) => {
    try {
        const db = getDb();
        const history = db.rate_history.slice(0, 20);
        const mapped = history.map(h => ({
            id: h.id,
            gold24k: h.gold_24k,
            gold22k: h.gold_22k,
            gold19k: h.gold_19k,
            silver: h.silver,
            date: h.recorded_at
        }));
        res.json(mapped);
    } catch (err) {
        console.error('GET /api/rates/history error:', err);
        res.status(500).json({ error: 'Failed to fetch rate history' });
    }
});

// ═════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════

// ─── Admin Login ───
app.post('/api/auth/login', (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const db = getDb();
        const admin = db.admin;

        if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }

        // Generate JWT token (expires in 24 hours)
        const token = jwt.sign(
            { username: admin.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        logActivity('login', 'Admin logged in');

        res.json({
            message: 'Login successful',
            token,
            expiresIn: 86400
        });
    } catch (err) {
        console.error('POST /api/auth/login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ─── Verify Token ───
app.get('/api/auth/verify', authMiddleware, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ─── Change Admin Password ───
app.put('/api/auth/password', authMiddleware, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const db = getDb();

        if (!bcrypt.compareSync(currentPassword, db.admin.password_hash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        db.admin.password_hash = bcrypt.hashSync(newPassword, 10);
        saveDb();

        logActivity('status', 'Admin password changed');
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('PUT /api/auth/password error:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ═════════════════════════════════════════════
// ADMIN ROUTES (auth required)
// ═════════════════════════════════════════════

// ─── Update Shop Settings (status + rates) ───
app.put('/api/settings', authMiddleware, (req, res) => {
    try {
        const { status, gold24kRate, gold22kRate, gold19kRate, silverRate } = req.body;
        const db = getDb();
        const current = { ...db.settings };

        // Update settings
        db.settings.status = status || current.status;
        db.settings.gold_24k_rate = Number(gold24kRate) || current.gold_24k_rate;
        db.settings.gold_22k_rate = Number(gold22kRate) || current.gold_22k_rate;
        db.settings.gold_19k_rate = Number(gold19kRate) || current.gold_19k_rate;
        db.settings.silver_rate = Number(silverRate) || current.silver_rate;
        db.settings.updated_at = new Date().toISOString();

        // Log rate change to history
        const ratesChanged = (
            db.settings.gold_24k_rate !== current.gold_24k_rate ||
            db.settings.gold_22k_rate !== current.gold_22k_rate ||
            db.settings.gold_19k_rate !== current.gold_19k_rate ||
            db.settings.silver_rate !== current.silver_rate
        );

        if (ratesChanged) {
            db.rate_history.unshift({
                id: nextId('rate_history'),
                gold_24k: db.settings.gold_24k_rate,
                gold_22k: db.settings.gold_22k_rate,
                gold_19k: db.settings.gold_19k_rate,
                silver: db.settings.silver_rate,
                recorded_at: new Date().toISOString()
            });
            if (db.rate_history.length > 20) db.rate_history.length = 20;
            logActivity('rate', `Rates updated — 24K: ₹${db.settings.gold_24k_rate}, 22K: ₹${db.settings.gold_22k_rate}, 19K: ₹${db.settings.gold_19k_rate}, Silver: ₹${db.settings.silver_rate}`);
        }

        // Log status change
        if (status && status !== current.status) {
            logActivity('status', `Shop status changed to ${status}`);
        }

        saveDb();

        res.json({
            message: 'Settings updated successfully',
            settings: {
                status: db.settings.status,
                gold24kRate: db.settings.gold_24k_rate,
                gold22kRate: db.settings.gold_22k_rate,
                gold19kRate: db.settings.gold_19k_rate,
                silverRate: db.settings.silver_rate,
                updatedAt: db.settings.updated_at
            }
        });
    } catch (err) {
        console.error('PUT /api/settings error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ─── Add Inventory Item ───
app.post('/api/inventory', authMiddleware, upload.single('image'), (req, res) => {
    try {
        const { name, name_kn, category, price, description, description_kn } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Item name is required' });
        }
        if (!category || !['gold', 'silver', 'bridal', 'daily', 'male'].includes(category)) {
            return res.status(400).json({ error: 'Valid category is required (gold, silver, bridal, daily, male)' });
        }

        // Determine image URL
        let image_url = null;
        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
        } else if (req.body.image_url) {
            image_url = req.body.image_url;
        } else {
            const defaults = {
                gold: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=500&q=80',
                silver: 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=500&q=80',
                bridal: 'https://images.unsplash.com/photo-1599643478514-4a1101869e5d?auto=format&fit=crop&w=500&q=80',
                daily: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=500&q=80',
                male: 'https://images.unsplash.com/photo-1583095039304-411bd511c50e?auto=format&fit=crop&w=500&q=80'
            };
            image_url = defaults[category] || defaults.gold;
        }

        const db = getDb();
        const newItem = {
            id: nextId('inventory'),
            name,
            name_kn: name_kn || null,
            category,
            price: price ? Number(price) : null,
            description: description || null,
            description_kn: description_kn || null,
            image_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        db.inventory.unshift(newItem);
        saveDb();

        logActivity('add', `"${name}" added to inventory`);

        res.status(201).json({
            message: 'Item added successfully',
            item: {
                id: newItem.id,
                name: newItem.name,
                name_kn: newItem.name_kn,
                category: newItem.category,
                price: newItem.price,
                desc: newItem.description,
                desc_kn: newItem.description_kn,
                image: newItem.image_url,
                createdAt: newItem.created_at
            }
        });
    } catch (err) {
        console.error('POST /api/inventory error:', err);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// ─── Update Inventory Item ───
app.put('/api/inventory/:id', authMiddleware, upload.single('image'), (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, name_kn, category, price, description, description_kn } = req.body;
        const db = getDb();

        const idx = db.inventory.findIndex(i => i.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const existing = db.inventory[idx];

        let image_url = existing.image_url;
        if (req.file) {
            if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, existing.image_url);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            image_url = `/uploads/${req.file.filename}`;
        } else if (req.body.image_url) {
            image_url = req.body.image_url;
        }

        db.inventory[idx] = {
            ...existing,
            name: name || existing.name,
            name_kn: name_kn !== undefined ? name_kn : existing.name_kn,
            category: category || existing.category,
            price: price !== undefined ? (price ? Number(price) : null) : existing.price,
            description: description !== undefined ? description : existing.description,
            description_kn: description_kn !== undefined ? description_kn : existing.description_kn,
            image_url,
            updated_at: new Date().toISOString()
        };

        saveDb();
        logActivity('add', `"${name || existing.name}" updated in inventory`);

        const updated = db.inventory[idx];
        res.json({
            message: 'Item updated successfully',
            item: {
                id: updated.id,
                name: updated.name,
                name_kn: updated.name_kn,
                category: updated.category,
                price: updated.price,
                desc: updated.description,
                desc_kn: updated.description_kn,
                image: updated.image_url,
                createdAt: updated.created_at
            }
        });
    } catch (err) {
        console.error('PUT /api/inventory/:id error:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// ─── Delete Inventory Item ───
app.delete('/api/inventory/:id', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const db = getDb();

        const idx = db.inventory.findIndex(i => i.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const existing = db.inventory[idx];

        // Delete uploaded image file if local
        if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
            const imgPath = path.join(__dirname, existing.image_url);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }

        db.inventory.splice(idx, 1);
        saveDb();
        logActivity('remove', `"${existing.name}" removed from inventory`);

        res.json({ message: 'Item removed successfully' });
    } catch (err) {
        console.error('DELETE /api/inventory/:id error:', err);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// ─── Get Notes ───
app.get('/api/notes', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        res.json(db.notes.map(n => ({
            id: n.id,
            text: n.text,
            date: n.created_at
        })));
    } catch (err) {
        console.error('GET /api/notes error:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// ─── Add Note ───
app.post('/api/notes', authMiddleware, (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Note text is required' });
        }

        const db = getDb();
        const note = {
            id: nextId('notes'),
            text: text.trim(),
            created_at: new Date().toISOString()
        };

        db.notes.unshift(note);
        saveDb();
        logActivity('note', 'Reminder note added');

        res.status(201).json({
            message: 'Note added',
            note: { id: note.id, text: note.text, date: note.created_at }
        });
    } catch (err) {
        console.error('POST /api/notes error:', err);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

// ─── Delete Note ───
app.delete('/api/notes/:id', authMiddleware, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const db = getDb();

        const idx = db.notes.findIndex(n => n.id === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        db.notes.splice(idx, 1);
        saveDb();
        logActivity('note', 'Reminder note deleted');

        res.json({ message: 'Note deleted' });
    } catch (err) {
        console.error('DELETE /api/notes/:id error:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ─── Get Activity Log ───
app.get('/api/activity', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const limit = parseInt(req.query.limit) || 50;
        const log = db.activity_log.slice(0, limit);
        res.json(log.map(e => ({
            id: e.id,
            type: e.type,
            text: e.message,
            date: e.created_at
        })));
    } catch (err) {
        console.error('GET /api/activity error:', err);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});

// ─── Analytics Data ───
app.get('/api/analytics', authMiddleware, (req, res) => {
    try {
        const db = getDb();
        const inv = db.inventory;

        const totalItems = inv.length;
        const pricedItems = inv.filter(i => i.price && Number(i.price) > 0);
        const totalValue = pricedItems.reduce((sum, i) => sum + Number(i.price), 0);
        const avgPrice = pricedItems.length > 0 ? Math.round(totalValue / pricedItems.length) : 0;
        const categories = [...new Set(inv.map(i => i.category))].length;
        const maxPrice = pricedItems.length > 0 ? Math.max(...pricedItems.map(i => Number(i.price))) : 0;

        // Category distribution
        const catDistribution = {};
        inv.forEach(i => {
            catDistribution[i.category] = (catDistribution[i.category] || 0) + 1;
        });

        // Category value breakdown
        const catValues = {};
        pricedItems.forEach(i => {
            catValues[i.category] = (catValues[i.category] || 0) + Number(i.price);
        });

        // Price range distribution
        const priceRanges = [
            { label: 'Under ₹25K', min: 0, max: 25000 },
            { label: '₹25K – ₹50K', min: 25000, max: 50000 },
            { label: '₹50K – ₹1L', min: 50000, max: 100000 },
            { label: '₹1L – ₹2L', min: 100000, max: 200000 },
            { label: 'Above ₹2L', min: 200000, max: 999999999 }
        ];

        const priceDistribution = priceRanges.map(range => ({
            label: range.label,
            count: pricedItems.filter(i => Number(i.price) >= range.min && Number(i.price) < range.max).length
        }));

        // Top 5 most expensive items
        const topItems = [...pricedItems]
            .sort((a, b) => Number(b.price) - Number(a.price))
            .slice(0, 5)
            .map(item => ({
                id: item.id,
                name: item.name,
                name_kn: item.name_kn,
                category: item.category,
                price: item.price
            }));

        const totalNotes = db.notes.length;

        res.json({
            totalItems,
            totalValue: Math.round(totalValue),
            avgPrice,
            categories,
            maxPrice,
            totalNotes,
            catDistribution,
            catValues,
            priceDistribution,
            topItems
        });
    } catch (err) {
        console.error('GET /api/analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ─────────────────────────────────────────────
// Error handling for multer
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `Image too large. Maximum size is ${process.env.MAX_IMAGE_SIZE_MB || 5}MB.` });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
function startServer() {
    initializeDatabase(process.env.ADMIN_PASSWORD);

    app.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║   🏵️  Shree Kamakshi Jewellers Backend            ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║   🌐  Server:   http://localhost:${PORT}            ║`);
        console.log(`║   📄  API:      http://localhost:${PORT}/api        ║`);
        console.log(`║   🏪  Frontend: http://localhost:${PORT}/JWE.HTML   ║`);
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
});

startServer();
