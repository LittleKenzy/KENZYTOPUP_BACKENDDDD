# 🛒 Kenzy Store — Backend API

**Platform layanan digital:** top-up game, e-wallet, Token PLN, pulsa, dan paket data.

> Production-ready Node.js backend dengan Express.js, Prisma ORM (SQLite), JWT Auth, dan fitur keamanan lengkap.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client & jalankan migration
npx prisma migrate dev --name init

# 3. Seed database (akun demo + produk + transaksi)
npm run seed

# 4. Jalankan server
npm run dev
```

Server berjalan di: `http://localhost:3000`

---

## 📦 Tech Stack

| Komponen     | Teknologi                    |
| ------------ | ---------------------------- |
| Runtime      | Node.js + Express.js         |
| Database     | SQLite (via Prisma ORM)      |
| Auth         | JWT (access + refresh token) |
| Hash         | bcrypt (12 rounds)           |
| Validasi     | Zod                          |
| Security     | Helmet, CORS, Rate Limiting  |
| Architecture | MVC (modular)                |

---
## 📋 API Endpoints

### Health Check
| Method | Endpoint       | Description    |
| ------ | -------------- | -------------- |
| GET    | /api/health    | Status server  |

### Auth
| Method | Endpoint           | Description                | Auth     |
| ------ | ------------------ | -------------------------- | -------- |
| POST   | /api/auth/register | Daftar akun baru           | Public   |
| POST   | /api/auth/login    | Login                      | Public   |
| POST   | /api/auth/refresh  | Perbarui access token      | Public   |
| POST   | /api/auth/logout   | Hapus refresh token        | Public   |
| GET    | /api/auth/me       | Data user yang login       | Bearer   |

### Products
| Method | Endpoint           | Description                | Auth     |
| ------ | ------------------ | -------------------------- | -------- |
| GET    | /api/products      | List produk (filter+page)  | Public   |
| GET    | /api/products/:id  | Detail produk              | Public   |
| POST   | /api/products      | Tambah produk              | Admin    |
| PUT    | /api/products/:id  | Update produk              | Admin    |
| DELETE | /api/products/:id  | Hapus produk (soft delete) | Admin    |

**Query params:** `?category=GAME|EWALLET|PLN|PULSA|PAKET_DATA&page=1&limit=20`

### Transactions
| Method | Endpoint                | Description                 | Auth     |
| ------ | ----------------------- | --------------------------- | -------- |
| POST   | /api/transactions       | Buat transaksi baru         | Bearer   |
| GET    | /api/transactions       | Riwayat transaksi sendiri   | Bearer   |
| GET    | /api/transactions/:id   | Detail transaksi sendiri    | Bearer   |
| GET    | /api/admin/transactions | Semua transaksi (admin)     | Admin    |

**Query params:** `?status=PENDING|SUCCESS|FAILED&page=1&limit=10`

---

## 📁 Struktur Folder

```
kenzy-backend/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.js              # Seed data
├── src/
│   ├── config/
│   │   ├── db.js            # Prisma client singleton
│   │   ├── env.js           # Environment config
│   │   └── jwt.js           # JWT helpers
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   ├── role.js          # Role-based authorization
│   │   ├── rateLimiter.js   # Rate limiting
│   │   ├── errorHandler.js  # Global error handler + AppError
│   │   └── sanitize.js      # Input sanitization
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.route.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   ├── products/
│   │   │   ├── product.route.js
│   │   │   ├── product.controller.js
│   │   │   ├── product.service.js
│   │   │   └── product.validation.js
│   │   └── transactions/
│   │       ├── transaction.route.js
│   │       ├── transaction.controller.js
│   │       ├── transaction.service.js
│   │       └── transaction.validation.js
│   └── app.js               # Express entry point
├── .env                     # Environment variables (jangan commit!)
├── .env.example             # Template env
├── package.json
└── README.md
```

---

## 🔒 Fitur Keamanan

- **JWT Auth** — Access token (15 menit) + Refresh token (7 hari) disimpan di database
- **bcrypt** — Password di-hash dengan 12 salt rounds
- **Helmet.js** — Security headers otomatis
- **CORS** — Whitelist domain frontend
- **Rate Limiting** — General: 100 req/15 menit, Auth: 5 req/menit per IP
- **Input Sanitization** — Strip HTML tags & control characters
- **Zod Validation** — Validasi input ketat di setiap endpoint

---

## 📝 Format Response

Semua response menggunakan format konsisten:

```json
{
  "success": true,
  "message": "Deskripsi hasil operasi",
  "data": { ... }
}
```

Error response:
```json
{
  "success": false,
  "message": "Deskripsi error",
  "errors": [{ "field": "email", "message": "Format email tidak valid" }]
}
```

---

## 🧪 Contoh Request (cURL)

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"081234567890","email":"test@example.com","password":"Test123!"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@kenzystore.com","password":"User123!"}'
```

### List Products
```bash
curl http://localhost:3000/api/products?category=GAME
```

### Create Transaction
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"productId":"PRODUCT_UUID","targetId":"123456789","quantity":1}'
```

---

## ⚙️ Environment Variables

| Variable              | Description                  | Default         |
| --------------------- | ---------------------------- | --------------- |
| PORT                  | Server port                  | 3000            |
| NODE_ENV              | Environment                  | development     |
| DATABASE_URL          | Prisma database URL          | file:./dev.db   |
| JWT_ACCESS_SECRET     | Access token secret          | (required)      |
| JWT_REFRESH_SECRET    | Refresh token secret         | (required)      |
| JWT_ACCESS_EXPIRES_IN | Access token expiry           | 15m             |
| JWT_REFRESH_EXPIRES_IN| Refresh token expiry          | 7d              |
| CORS_ORIGINS          | Allowed origins (comma-sep)  | localhost:5173  |

---

## 📄 License

MIT © Kenzy Store
