# 🌱 IrriSmart - AI Irrigation Management System

A production-ready full-stack application for AI-powered farm irrigation management.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (Access + Refresh Tokens) + bcrypt |
| State | React Query + Context API |
| Forms | React Hook Form + Zod |
| Docs | Swagger / OpenAPI 3.0 |

## 📁 Project Structure

```
Infosys-project/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, JWT, Swagger config
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── middleware/      # Auth, validation, error, rate limiter
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic layer
│   │   └── utils/           # Helpers (logger, jwt, password, email)
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Initial seed data
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Auth context
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   └── package.json
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

### 3. Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed with sample data
npx ts-node prisma/seed.ts
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Runs on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000
```

## 🔑 Default Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@irrigation.com | Admin@123456 |
| Farmer | rajesh@example.com | Farmer@123456 |

## 📚 API Documentation

Swagger UI: http://localhost:5000/api/docs

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register new farmer |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset password |
| POST | /api/auth/change-password | Change password |
| GET | /api/profile | Get profile |
| PUT | /api/profile | Update profile |
| POST | /api/profile/photo | Upload profile photo |
| GET | /api/dashboard | Dashboard data |
| GET | /api/health | Health check |

## 🔐 Security Features

- ✅ JWT Access + Refresh Token pair
- ✅ bcrypt password hashing (12 rounds)
- ✅ Helmet HTTP security headers
- ✅ CORS configured
- ✅ Rate limiting (100 req/15min general, 10 for auth)
- ✅ Input validation (express-validator + Zod)
- ✅ SQL injection protection via Prisma ORM
- ✅ XSS protection via Helmet
- ✅ httpOnly cookie for refresh tokens
- ✅ Soft delete support
- ✅ Role-based access control

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# Stop
docker-compose down
```

## 🌐 Pages

| Route | Description |
|---|---|
| / | Landing page |
| /register | Farmer registration |
| /login | Login |
| /forgot-password | Forgot password |
| /reset-password | Reset password |
| /dashboard | Main dashboard |
| /dashboard/profile | User profile |
| /dashboard/fields | Field management |
| /dashboard/sensors | Sensor management |
| /dashboard/weather | Weather forecast |

## 🔮 Phase 2 (Coming Soon)

- Field & Sensor CRUD operations
- IoT MQTT sensor data streaming
- OpenWeather API integration
- AI irrigation recommendations
- Push notifications
- Mobile app (React Native)
