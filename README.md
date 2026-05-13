# 🏵️ Shree Kamakshi Jewellers

A full-stack web application for Shree Kamakshi Jewellers — a jewellery shop management and showcase platform.

## 📁 Project Structure

```
ShreeKamakshiJewellers/
├── frontend/               # Client-side files
│   ├── JWE.HTML            # Main application (storefront + admin dashboard)
│   ├── mp.html             # Additional page
│   ├── skj_logo.png        # Shop logo
│   ├── christmas_bg.png    # Festival theme background
│   ├── diwali_bg.png       # Festival theme background
│   ├── eid_bg.png          # Festival theme background
│   └── skj (1).pdf         # Shop document
│
├── backend/                # Server-side files
│   ├── server.js           # Express API server
│   ├── database.js         # JSON file database module
│   ├── .env                # Environment variables
│   ├── package.json        # Node.js dependencies
│   ├── data.json           # Database file (auto-generated)
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   └── uploads/            # Uploaded product images
│
├── Launch App.bat          # One-click launcher (Windows)
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)

### Installation
```bash
cd backend
npm install
```

### Running the App
**Option 1 — Double-click:**
> Just double-click `Launch App.bat`

**Option 2 — Terminal:**
```bash
cd backend
npm run dev
```

Then open: [http://localhost:3000/JWE.HTML](http://localhost:3000/JWE.HTML)

## 🔑 Default Admin Login
- **Password:** `admin123` (change via `.env` or admin panel)

## ⚙️ API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Health check |
| GET | `/api/settings` | ❌ | Shop status & metal rates |
| GET | `/api/inventory` | ❌ | Jewelry catalog |
| GET | `/api/rates/history` | ❌ | Rate change history |
| POST | `/api/auth/login` | ❌ | Admin login |
| PUT | `/api/settings` | ✅ | Update rates/status |
| POST | `/api/inventory` | ✅ | Add jewelry item |
| PUT | `/api/inventory/:id` | ✅ | Update jewelry item |
| DELETE | `/api/inventory/:id` | ✅ | Remove jewelry item |
| GET | `/api/notes` | ✅ | Get reminder notes |
| POST | `/api/notes` | ✅ | Add reminder note |
| DELETE | `/api/notes/:id` | ✅ | Delete reminder note |
| GET | `/api/activity` | ✅ | Activity log |
| GET | `/api/analytics` | ✅ | Dashboard analytics |
