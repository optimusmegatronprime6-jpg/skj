/**
 * Database Module — JSON file-based storage for Shree Kamakshi Jewellers backend.
 * No native compilation needed — works on any system with Node.js.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

// Default database structure
const DEFAULT_DB = {
    admin: {
        username: 'admin',
        password_hash: ''
    },
    settings: {
        status: 'Open',
        gold_24k_rate: 7850,
        gold_22k_rate: 7450,
        gold_19k_rate: 6450,
        silver_rate: 92,
        updated_at: new Date().toISOString()
    },
    inventory: [],
    rate_history: [],
    activity_log: [],
    notes: [],
    next_id: {
        inventory: 1,
        notes: 1,
        rate_history: 1,
        activity_log: 1
    }
};

let db = null;

/**
 * Load database from disk, or create default if missing
 */
function loadDb() {
    if (db) return db;
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf-8');
            db = JSON.parse(raw);
            // Ensure all keys exist (migration safety)
            for (const key of Object.keys(DEFAULT_DB)) {
                if (!(key in db)) db[key] = DEFAULT_DB[key];
            }
        } else {
            db = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    } catch (err) {
        console.error('Error loading database, creating fresh:', err.message);
        db = JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    return db;
}

/**
 * Save database to disk
 */
function saveDb() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error saving database:', err.message);
    }
}

/**
 * Get next auto-increment ID for a given table
 */
function nextId(table) {
    const d = loadDb();
    const id = d.next_id[table] || 1;
    d.next_id[table] = id + 1;
    saveDb();
    return id;
}

/**
 * Initialize database and seed with defaults if empty
 */
function initializeDatabase(adminPassword) {
    const d = loadDb();

    // Seed admin password hash
    if (!d.admin.password_hash) {
        d.admin.password_hash = bcrypt.hashSync(adminPassword || 'admin123', 10);
        console.log('✅ Default admin user created (username: admin)');
    }

    // Seed default inventory
    if (d.inventory.length === 0) {
        const defaultImages = {
            gold: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=500&q=80',
            silver: 'https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=500&q=80',
            bridal: 'https://images.unsplash.com/photo-1599643478514-4a1101869e5d?auto=format&fit=crop&w=500&q=80',
            daily: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=500&q=80'
        };

        const seedItems = [
            { name: 'Traditional Bridal Choker', name_kn: 'ಸಾಂಪ್ರದಾಯಿಕ ಮದುವೆ ಚೋಕರ್', category: 'bridal', price: 150000, description: 'Intricate 22k gold choker perfect for weddings.', description_kn: 'ಮದುವೆಗೆ ಸೂಕ್ತವಾದ ಸಂಕೀರ್ಣ 22k ಚಿನ್ನದ ಚೋಕರ್.', image_url: defaultImages.bridal },
            { name: 'Everyday Simple Gold Chain', name_kn: 'ದೈನಂದಿನ ಸರಳ ಚಿನ್ನದ ಸರ', category: 'daily', price: 25000, description: 'Lightweight pure gold chain for daily wear.', description_kn: 'ದೈನಂದಿನ ಬಳಕೆಗಾಗಿ ಹಗುರ ಶುದ್ಧ ಚಿನ್ನದ ಸರ.', image_url: defaultImages.daily },
            { name: 'Silver Oxidized Jhumkas', name_kn: 'ಬೆಳ್ಳಿ ಆಕ್ಸಿಡೈಸ್ಡ್ ಜುಮ್ಕಾ', category: 'silver', price: 2500, description: 'Beautifully crafted antique silver earrings.', description_kn: 'ಸುಂದರವಾಗಿ ರಚಿಸಿದ ಪ್ರಾಚೀನ ಬೆಳ್ಳಿ ಕಿವಿಯೋಲೆ.', image_url: defaultImages.silver },
            { name: '22K Gold Bangles Set', name_kn: '22K ಚಿನ್ನದ ಬಳೆ ಸೆಟ್', category: 'gold', price: 85000, description: 'Set of 4 elegant 22K gold bangles.', description_kn: '4 ಸೊಗಸಾದ 22K ಚಿನ್ನದ ಬಳೆಗಳ ಸೆಟ್.', image_url: defaultImages.gold },
            { name: 'Diamond Studded Mangalsutra', name_kn: 'ವಜ್ರ ಖಚಿತ ಮಂಗಳಸೂತ್ರ', category: 'bridal', price: 95000, description: 'Modern mangalsutra with diamond pendant.', description_kn: 'ವಜ್ರದ ಲಾಕೆಟ್‌ನೊಂದಿಗೆ ಆಧುನಿಕ ಮಂಗಳಸೂತ್ರ.', image_url: defaultImages.bridal },
            { name: 'Pure Silver Anklets', name_kn: 'ಶುದ್ಧ ಬೆಳ್ಳಿ ಕಾಲ್ಕಡಗ', category: 'silver', price: 5500, description: 'Heavy weight pure silver payal for women.', description_kn: 'ಮಹಿಳೆಯರಿಗಾಗಿ ಭಾರವಾದ ಶುದ್ಧ ಬೆಳ್ಳಿ ಪಾಯಲ್.', image_url: defaultImages.silver },
            { name: 'Gold Drop Earrings', name_kn: 'ಚಿನ್ನದ ಡ್ರಾಪ್ ಕಿವಿಯೋಲೆ', category: 'daily', price: 18000, description: 'Minimalist gold earrings for everyday office wear.', description_kn: 'ದೈನಂದಿನ ಕಚೇರಿ ಧರಿಸಲು ಸರಳ ಚಿನ್ನದ ಕಿವಿಯೋಲೆ.', image_url: defaultImages.daily },
            { name: 'Antique Gold Necklace', name_kn: 'ಪ್ರಾಚೀನ ಚಿನ್ನದ ಹಾರ', category: 'gold', price: 125000, description: 'Temple jewellery style necklace set.', description_kn: 'ದೇವಸ್ಥಾನ ಶೈಲಿಯ ಆಭರಣ ಸೆಟ್.', image_url: defaultImages.gold },
            { name: 'Silver Pooja Thali Set', name_kn: 'ಬೆಳ್ಳಿ ಪೂಜಾ ತಾಟು ಸೆಟ್', category: 'silver', price: 12000, description: 'Complete 999 purity silver pooja set.', description_kn: 'ಸಂಪೂರ್ಣ 999 ಶುದ್ಧತೆಯ ಬೆಳ್ಳಿ ಪೂಜಾ ಸೆಟ್.', image_url: defaultImages.silver },
            { name: 'Bridal Maang Tikka', name_kn: 'ಮದುವೆ ಮಾಂಗ್ ಟಿಕ್ಕಾ', category: 'bridal', price: 35000, description: 'Traditional Kundan maang tikka.', description_kn: 'ಸಾಂಪ್ರದಾಯಿಕ ಕುಂದನ್ ಮಾಂಗ್ ಟಿಕ್ಕಾ.', image_url: defaultImages.bridal },
            { name: "Men's Gold Ring", name_kn: 'ಪುರುಷರ ಚಿನ್ನದ ಉಂಗುರ', category: 'daily', price: 22000, description: 'Solid 22K gold ring with plain finish.', description_kn: 'ಸರಳ ಮುಕ್ತಾಯದ ಘನ 22K ಚಿನ್ನದ ಉಂಗುರ.', image_url: defaultImages.daily },
            { name: 'Ruby and Emerald Gold Haram', name_kn: 'ಮಾಣಿಕ್ಯ ಮತ್ತು ಪಚ್ಚೆ ಚಿನ್ನದ ಹಾರ', category: 'gold', price: 210000, description: 'Long gold necklace studded with precious stones.', description_kn: 'ಅಮೂಲ್ಯ ಕಲ್ಲುಗಳಿಂದ ಕೂಡಿದ ಉದ್ದನೆ ಚಿನ್ನದ ಹಾರ.', image_url: defaultImages.gold }
        ];

        seedItems.forEach(item => {
            item.id = nextId('inventory');
            item.created_at = new Date().toISOString();
            item.updated_at = new Date().toISOString();
            d.inventory.push(item);
        });
        console.log(`✅ Seeded ${seedItems.length} inventory items`);
    }

    saveDb();
    console.log('✅ Database initialized');
}

function getDb() { return loadDb(); }
function closeDatabase() { db = null; console.log('🔒 Database reference cleared'); }

module.exports = { getDb, saveDb, nextId, initializeDatabase, closeDatabase };
