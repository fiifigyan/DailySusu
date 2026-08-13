# DailySusu
A daily and a cyclic susu app that help friends and family to contribute and daily and one member receives a payout on that day. It goes round till every cashes out.


# XSusu - Secure Susu Group Management Platform

<div align="center">
  <img src="https://via.placeholder.com/120" alt="XSusu Logo" width="120" />
  
  <h3>🇬🇭 Digital Susu Group Management for Ghana</h3>
  
  <p>
    <strong>Secure • Transparent • Automated</strong>
  </p>

  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
  [![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
  [![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
  [![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
  [![Paystack](https://img.shields.io/badge/Paystack-0099D8?style=for-the-badge&logo=paystack&logoColor=white)](https://paystack.com)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [What is Susu?](#-what-is-susu)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Revenue Model](#-revenue-model)
- [Security](#-security)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Migrations & Deployment](#-migrations--deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📖 Overview

**XSusu** is a comprehensive digital platform for managing **Susu groups** (Rotating Savings and Credit Associations) in Ghana. It digitizes the traditional daily contribution and payout cycle, eliminating disputes, preventing cash mismanagement, and providing full transparency to all members.

The system consists of:
- **XSusuBackend** - Secure Node.js/Express API server
- **XSusu** - React Native mobile application (iOS & Android)

---

## 🇬🇭 What is Susu?

Susu is a traditional savings mechanism where a group of people contribute a fixed amount daily. Each day, one member receives the full collection. This rotates until every member has received their payout.

**Traditional Susu Problems:**
- ❌ No written records - disputes over who paid
- ❌ Cash mismanagement by the collector
- ❌ No transparency on when you'll receive
- ❌ Difficult to track missed payments
- ❌ Funds can be lost or stolen

**XSusu Solution:**
- ✅ Digital ledger - every payment recorded
- ✅ Automated surplus distribution
- ✅ Clear payout schedule
- ✅ Real-time payment tracking
- ✅ Secure mobile money integration

---

## ✨ Key Features

### 👥 For Group Members
- **One-tap Check-in** - Mark your daily payment in seconds
- **Real-time Dashboard** - See who has paid today
- **Payout Schedule** - Know exactly when you'll receive
- **Payment History** - Full record of all contributions
- **Mobile Money Integration** - Pay via MTN, Vodafone, or AirtelTigo

### 👤 For Group Admin
- **Create Groups** - Set up new Susu groups in minutes
- **Invite Members** - Share links, add by phone, or share group codes
- **Daily Oversight** - Track payments and complete payouts
- **Automatic Surplus** - System handles all money distribution
- **Member Management** - Track positions and payout history

### 💰 For Platform Owner
- **Automatic Revenue** - 40% of daily surplus goes to you
- **Revenue Dashboard** - Track earnings per group
- **Failed Payment Retry** - Automatic retry of failed disbursements
- **Compliance Ready** - Full audit trail of all transactions

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP (XSusu)                     │
│                     React Native + Expo                     │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Sign In │ │ Dashboard│ │ Today's  │ │   Payout     │  │
│  │  Screen  │ │  Screen  │ │ Check-in │ │  Schedule    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│         │           │           │              │            │
│         └───────────┴───────────┴──────────────┘            │
│                         │                                   │
│              ┌──────────▼──────────┐                        │
│              │    API Client       │                        │
│              │  (Axios + JWT)      │                        │
│              └──────────┬──────────┘                        │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          │ HTTPS (TLS 1.3)
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   BACKEND (XSusuBackend)                     │
│                   Node.js + Express + TypeScript             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              SECURITY MIDDLEWARE LAYER               │  │
│  │  Helmet │ CORS │ Rate Limiter │ Firewall │ JWT       │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │   Auth   │ │  Groups  │ │   Contri-│ │   Payment    │  │
│  │  Routes  │ │  Routes  │ │  butions │ │   Routes     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│         │           │           │              │            │
│         └───────────┴───────────┴──────────────┘            │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │                    SERVICES                         │  │
│  │  AuthService │ GroupService │ ContributionService   │  │
│  │  PaymentService (Paystack) │ NotificationService    │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │              DATA LAYER                             │  │
│  │  PostgreSQL (Prisma) │ Redis (Cache/Rate Limiting)  │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │          EXTERNAL SERVICES                          │  │
│  │  Paystack API │ Mobile Money (MTN/Vodafone/Tigo)    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Mobile Frontend** | React Native + Expo SDK 54 | Cross-platform mobile app |
| **Backend** | Node.js + Express | RESTful API server |
| **Language** | TypeScript | Type-safe development |
| **Database** | PostgreSQL | Primary data store |
| **ORM** | Prisma | Database access & migrations |
| **Cache** | Redis | Rate limiting & session management |
| **Payments** | Paystack | Mobile money collection & disbursement |
| **Auth** | JWT + bcrypt | Token-based authentication |
| **Real-time** | Socket.IO | Live update notifications |
| **Logging** | Winston | Structured logging |
| **Validation** | Zod | Request/response validation |
| **Containerization** | Docker | Deployment & scaling |

---

## 💰 Revenue Model

XSusu uses a **surplus-based revenue model**. Members pay **ZERO fees**—the platform earns entirely from the daily surplus generated by the group structure.

### How the Surplus Works

```
Daily Collection: 35 members × GHS 22 = GHS 770
Daily Payout to Recipient:            GHS 700
Daily Surplus:                        GHS 70
```

### System-Enforced Allocation

| Allocation | Percentage | Example (GHS 70) | Purpose |
|:---|:---|:---|:---|
| **App Maintenance** | 40% | GHS 28.00/day | Platform owner revenue |
| **Emergency Fund** | 35% | GHS 24.50/day | Group emergency savings |
| **Savings Pool** | 15% | GHS 10.50/day | Long-term group savings |
| **Admin Compensation** | 10% | GHS 7.00/day | Group admin payment |

### Platform Owner Earnings

| Scale | Groups | Monthly Revenue |
|:---|:---|:---|
| Small | 1 group (35 members) | GHS 840 |
| Medium | 5 groups (175 members) | GHS 4,200 |
| Large | 10 groups (350 members) | GHS 8,400 |
| Enterprise | 20 groups (700 members) | GHS 16,800 |

### Paystack Fees (Deducted Before Allocation)

| Fee Type | Rate | Example |
|:---|:---|:---|
| Collection Fee | 1.95% + VAT | GHS 15.02 on GHS 770 |
| Disbursement Fee | GHS 10 flat | GHS 10 per batch |

---

## 🔒 Security

XSusu implements **enterprise-grade security** at every layer:

### Network Security
- **TLS 1.3** - All traffic encrypted in transit
- **Helmet.js** - Security headers (HSTS, CSP, XSS protection)
- **CORS** - Strict origin validation
- **Rate Limiting** - Per-endpoint and global limits

### Application Security
- **JWT Authentication** - 1-hour access tokens + 7-day refresh tokens
- **bcrypt** - Passwords hashed with 12 rounds of salt
- **Input Validation** - Zod schema validation on all endpoints
- **SQL Injection Protection** - Prisma ORM with parameterized queries

### Firewall & Attack Detection
- **Custom Firewall Middleware** - Detects and blocks:
  - SQL injection attempts
  - XSS attacks
  - Path traversal
  - Command injection
  - Malicious user agents (sqlmap, nikto, etc.)
- **Rapid-Fire Detection** - Blocks IPs making >50 requests in 5 seconds
- **Auto-Blocking** - IPs blocked for 24 hours after 3 suspicious activities

### Data Protection
- **AES-256-GCM** - Encrypts sensitive data at rest
- **Phone Hashing** - Phone numbers stored as HMAC-SHA256 hashes
- **Secure Storage** - Tokens stored in Expo SecureStore (Keychain/Keystore)

### Mobile Security
- **Biometric Authentication** - Face ID / Fingerprint lock
- **Anti-Screen-Capture** - Prevents screenshots of sensitive data
- **Auto-Lock** - App locks after 30 seconds in background
- **Device Fingerprinting** - Every request includes device ID

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **PostgreSQL** 14+
- **Redis** 7+
- **Expo Go** app (for mobile testing)
- **Paystack Account** (for payments)

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/Susu.git
cd Susu/XSusuBackend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Start Redis (in separate terminal)
redis-server

# 7. Start development server
npm run dev
```

**Expected output:**
```
✅ Database connected successfully
✅ Redis connected successfully
🚀 XSusu Backend running on port 3000
📝 Environment: development
```

### Frontend Setup

```bash
# 1. Navigate to frontend
cd ../XSusu

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your API URL and Paystack key

# 4. Start Expo
npx expo start

# 5. Scan QR code with Expo Go app
```

### Docker Setup (Alternative)

```bash
# Start everything with Docker Compose
cd Susu/XSusuBackend
docker-compose up -d

# This starts:
# - PostgreSQL (production + staging)
# - Redis (production + staging)
# - API servers (production + staging)
```

---

## 📁 Project Structure

```
Susu/
├── XSusuBackend/                        # Backend API
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema
│   │   ├── migrations/                  # Migration files
│   │   │   └── 20260808_add_payment/
│   │   │       ├── migration.sql        # Safe migration
│   │   │       └── rollback.sql         # Rollback script
│   │   └── seeds/
│   │       └── seed.ts                  # Test data
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts              # Prisma client
│   │   │   ├── redis.ts                 # Redis client
│   │   │   ├── environment.ts           # Environment variables
│   │   │   ├── payment.ts               # Paystack config
│   │   │   └── susu-rules.ts            # System rules (hardcoded)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                  # JWT authentication
│   │   │   ├── firewall.ts              # Attack detection
│   │   │   ├── rateLimiter.ts           # Rate limiting
│   │   │   ├── security.ts              # Security headers
│   │   │   └── validator.ts             # Zod validation
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── group.controller.ts
│   │   │   ├── contribution.controller.ts
│   │   │   ├── payment.controller.ts
│   │   │   └── admin.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── group.service.ts
│   │   │   ├── contribution.service.ts  # Surplus distribution
│   │   │   ├── payment.service.ts       # Paystack integration
│   │   │   └── notification.service.ts
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── group.routes.ts
│   │   │   ├── contribution.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   ├── admin.routes.ts
│   │   │   └── webhook.routes.ts        # Paystack webhooks
│   │   │
│   │   ├── jobs/
│   │   │   └── retryFailedDisbursements.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── encryption.ts
│   │   │   ├── hackersDetector.ts
│   │   │   ├── logger.ts
│   │   │   └── tokenGenerator.ts
│   │   │
│   │   └── app.ts                       # Main entry point
│   │
│   ├── scripts/
│   │   ├── migrate-safe.sh              # Zero-downtime migrations
│   │   └── rollback.sh                  # Rollback script
│   │
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   └── package.json
│
├── XSusu/                               # Mobile App
│   ├── App.tsx                          # Entry point
│   ├── src/
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx
│   │   │
│   │   ├── screens/
│   │   │   ├── auth/
│   │   │   │   ├── SignInScreen.tsx
│   │   │   │   ├── SignUpScreen.tsx
│   │   │   │   └── VerifyOTPScreen.tsx
│   │   │   ├── tabs/
│   │   │   │   ├── HomeScreen.tsx
│   │   │   │   ├── TodayScreen.tsx
│   │   │   │   ├── GroupsScreen.tsx
│   │   │   │   ├── ScheduleScreen.tsx
│   │   │   │   └── ProfileScreen.tsx
│   │   │   ├── group/
│   │   │   │   ├── CreateGroupScreen.tsx
│   │   │   │   ├── GroupDetailScreen.tsx
│   │   │   │   └── InviteMembersScreen.tsx
│   │   │   └── payment/
│   │   │       └── MakePaymentScreen.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── susu/
│   │   │   │   ├── GroupCard.tsx
│   │   │   │   ├── MemberRow.tsx
│   │   │   │   └── ProgressCircle.tsx
│   │   │   └── ui/
│   │   │       └── EmptyState.tsx
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── SecurityContext.tsx
│   │   │
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useGroup.ts
│   │   │   └── useContributions.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── types/
│   │       └── navigation.ts
│   │
│   ├── app.json
│   └── package.json
│
└── README.md                            # This file
```

---

## 🗄 Database Schema

### Core Tables

| Table | Description | Key Fields |
|:---|:---|:---|
| `users` | App users | email, phoneHash, password, role |
| `susuGroups` | Susu group definitions | memberCount, dailyContribution, dailyPayout |
| `groupMembers` | Group membership | groupId, userId, position |
| `contributions` | Daily payments | groupId, memberId, day, status |
| `payouts` | Daily payout records | groupId, recipientId, day, amount |
| `appFees` | Revenue tracking | groupId, amount, type, month |
| `failedDisbursements` | Failed payment retry | groupId, amount, retryCount |
| `auditLogs` | Security audit trail | userId, action, metadata |

### Full Schema

See `XSusuBackend/prisma/schema.prisma` for the complete schema definition.

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Sign in |
| POST | `/api/v1/auth/verify-otp` | Verify email OTP |
| POST | `/api/v1/auth/resend-otp` | Resend verification code |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | Sign out |
| GET | `/api/v1/auth/profile` | Get current user |

### Groups

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/v1/groups` | Create group |
| GET | `/api/v1/groups` | Get my groups |
| GET | `/api/v1/groups/:id` | Get group details |
| POST | `/api/v1/groups/:id/members` | Add member |
| POST | `/api/v1/groups/:id/start` | Start group |
| GET | `/api/v1/groups/:id/schedule` | Get payout schedule |

### Contributions

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/v1/contributions/record` | Record manual payment |
| POST | `/api/v1/contributions/verify` | Verify payment |
| GET | `/api/v1/contributions/:groupId/today` | Get today's status |
| POST | `/api/v1/contributions/:groupId/complete-payout` | Complete payout |
| GET | `/api/v1/contributions/:groupId/history` | Get history |

### Payments

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/v1/payments/initialize` | Initialize Paystack payment |
| GET | `/api/v1/payments/verify/:reference` | Verify payment |

### Admin

| Method | Endpoint | Description |
|:---|:---|:---|
| GET | `/api/v1/admin/dashboard` | Dashboard stats |
| GET | `/api/v1/admin/revenue` | Revenue report |
| GET | `/api/v1/admin/security-logs` | Security audit logs |

### Webhooks

| Method | Endpoint | Description |
|:---|:---|:---|
| POST | `/api/v1/webhooks/paystack` | Paystack webhook |

---

## 🔄 Migrations & Deployment

### Safe Migration Strategy

XSusu uses **zero-downtime migrations**:

1. **Add-before-Remove** - New columns added with defaults before old ones are removed
2. **Staging First** - All migrations run on staging environment first
3. **Rollback Ready** - Every migration has a corresponding rollback script
4. **Backup Always** - Automatic database backup before every migration

### Running Migrations

```bash
# Staging (run first)
bash scripts/migrate-safe.sh staging

# Production (only after staging verified)
bash scripts/migrate-safe.sh production
```

### Rollback

```bash
# Rollback staging
bash scripts/rollback.sh staging

# Rollback production
bash scripts/rollback.sh production <timestamp>
```

---

## 🧪 Testing

```bash
# Backend tests
cd XSusuBackend
npm test

# Run specific test
npm test -- --testPathPattern=auth

# Frontend type checking
cd XSusu
npx tsc --noEmit
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- TypeScript strict mode
- ESLint with `@typescript-eslint` rules
- All new code requires tests
- Follow existing patterns in the codebase

---

## 📄 License

This project is **proprietary and confidential**. Unauthorized copying, distribution, or use is strictly prohibited.

© 2026 BiigggX. All Rights Reserved.

---

## 📞 Support

For deployment inquiries, customization requests, or technical support:

- 📧 Email: biigggx@gmail.com
- 📱 WhatsApp: +233 50 513 0717
- 🌐 Website: https://biigggx.com

---

<div align="center">
  <p>
    <strong>Built with ❤️ for financial inclusion in Ghana</strong>
  </p>
  <p>
    <sub>Made in Takoradi, Ghana 🇬🇭</sub>
  </p>
</div>