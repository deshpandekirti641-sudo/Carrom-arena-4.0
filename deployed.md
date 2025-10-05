# 🚀 Carrom Arena - Deployment Guide

> **Real-money Carrom gaming platform deployment documentation**  
> Complete guide for production deployment across multiple platforms

---

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [🔧 Prerequisites](#-prerequisites)
- [🌍 Environment Setup](#-environment-setup)
- [🚀 Deployment Platforms](#-deployment-platforms)
- [🔄 CI/CD Pipeline](#-cicd-pipeline)
- [🔒 Security Configuration](#-security-configuration)
- [🏥 Health Monitoring](#-health-monitoring)
- [📊 Performance Optimization](#-performance-optimization)
- [🛠️ Troubleshooting](#️-troubleshooting)
- [📞 Support](#-support)

---

## 🎯 Overview

Carrom Arena is a **production-ready real-money gaming platform** designed for the Indian market. This deployment guide covers:

- ✅ Multi-platform deployment (Vercel, Render, Netlify, Docker)
- ✅ Automated CI/CD with GitHub Actions
- ✅ Production security best practices
- ✅ Monitoring and error handling
- ✅ Performance optimization
- ✅ Regulatory compliance for Indian gaming laws

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Database      │
│   (Next.js)     │◄───┤   (Proxy)       │◄───┤   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Game Engine   │    │   Payment       │    │   Cache         │
│   (Phaser)      │    │   Gateway       │    │   (Redis)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔧 Prerequisites

### System Requirements
- **Node.js**: ≥18.17.0
- **NPM**: ≥8.0.0
- **Git**: Latest version
- **Memory**: Minimum 2GB RAM for build process

### Required Accounts & Services
- [ ] **GitHub** - For version control and CI/CD
- [ ] **Vercel** - Primary deployment platform
- [ ] **Render/Netlify** - Backup deployment options
- [ ] **Database Provider** - PostgreSQL (Supabase/Railway/PlanetScale)
- [ ] **Payment Gateway** - UPI/NetBanking integration
- [ ] **OTP Services** - DataGenIt (SMS) + GetOTP (Email)
- [ ] **Monitoring** - Analytics and error tracking

### Development Tools
```bash
# Install required global tools
npm install -g vercel
npm install -g @render/cli
npm install -g netlify-cli

# Verify installation
node --version  # Should be ≥18.17.0
npm --version   # Should be ≥8.0.0
```

---

## 🌍 Environment Setup

### 1. **Environment Files**

Create environment-specific configuration files:

```bash
# Development
.env.local

# Staging
.env.staging

# Production  
.env.production
```

### 2. **Required Environment Variables**

#### 🔐 **Authentication & Security**
```bash
JWT_SECRET=your_super_secure_jwt_secret_key_production_256_bits
SESSION_SECRET=your_super_secure_session_secret_production
ADMIN_SECRET_KEY=your_super_secure_admin_secret_key
```

#### 📱 **OTP Services**
```bash
# SMS OTP (DataGenIt)
DATAGEN_API_KEY=your_production_datagen_api_key
DATAGEN_API_URL=https://api.datagenit.com/sms
DATAGEN_SENDER_ID=CARROM

# Email OTP (GetOTP)
GETOTP_API_KEY=your_production_getotp_api_key
GETOTP_API_URL=https://api.getotp.com/email
GETOTP_SENDER_EMAIL=noreply@carromarena.com
```

#### 💳 **Payment Configuration**
```bash
# UPI Gateway
UPI_GATEWAY_KEY=your_production_upi_gateway_key
UPI_GATEWAY_SECRET=your_production_upi_gateway_secret

# Net Banking
NETBANKING_GATEWAY_KEY=your_production_netbanking_key
NETBANKING_GATEWAY_SECRET=your_production_netbanking_secret

# Limits (INR)
MIN_DEPOSIT_AMOUNT=10
MAX_DEPOSIT_AMOUNT=2000
```

#### 🎮 **Gaming Configuration**
```bash
GAME_SERVER_URL=wss://game.carromarena.com
MATCH_TIMEOUT_MINUTES=15
SERVER_FEE_PERCENTAGE=10
DEVELOPER_SHARE_PERCENTAGE=15
```

---

## 🚀 Deployment Platforms

### 1. **Vercel (Recommended)**

#### **Quick Deploy**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### **Manual Setup**
1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Carrom Arena repository

2. **Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`
   - Set different values for Preview/Development

3. **Build Settings**
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm ci
   ```

4. **Domain Configuration**
   - Add custom domain: `carromarena.com`
   - Configure DNS records
   - Enable SSL (automatic)

#### **Advanced Vercel Configuration**

**vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["bom1", "sin1"],
  "crons": [
    {
      "path": "/api/cron/health",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

### 2. **Render**

#### **Automatic Deploy**
```bash
# Connect repository to Render
# The deployed.yml workflow will handle deployment
```

#### **Manual Setup**
1. **Create Web Service**
   - Connect GitHub repository
   - Set branch to `main`
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`

2. **Environment Variables**
   - Add all production environment variables
   - Enable auto-deploy on push

3. **Resource Configuration**
   ```
   Region: Singapore (closest to India)
   Instance Type: Standard ($7/month)
   Memory: 2GB
   CPU: 1 vCPU
   ```

---

### 3. **Docker Deployment**

#### **Build & Run**
```bash
# Build the image
docker build -t carrom-arena:latest .

# Run locally
docker run -p 3000:3000 \
  --env-file .env.production \
  carrom-arena:latest

# Push to registry
docker tag carrom-arena:latest your-registry/carrom-arena:latest
docker push your-registry/carrom-arena:latest
```

#### **Docker Compose Production**
```yaml
version: '3.8'
services:
  app:
    image: carrom-arena:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: carrom_arena
      POSTGRES_USER: carrom_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

---

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**

The `deployed.yml` file provides automated deployment with:

- ✅ **Multi-stage builds** (test → build → deploy)
- ✅ **Multiple deployment targets** (Vercel, Render, Docker)
- ✅ **Security scanning** (dependency audit, secret detection)
- ✅ **Health checks** and verification
- ✅ **Rollback capabilities**

#### **Workflow Triggers**
- Push to `main` branch → Production deployment
- Pull request → Preview deployment
- Manual trigger → Custom environment deployment

#### **Required GitHub Secrets**
```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
RENDER_DEPLOY_HOOK=your_render_deploy_webhook
```

#### **Workflow Status**
Monitor deployments at: `https://github.com/your-username/carrom-arena/actions`

---

## 🔒 Security Configuration

### **Security Headers**
Implemented in `next.config.js`:
```javascript
headers: [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options', 
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  }
]
```

### **API Security**
- ✅ Rate limiting (100 requests/15 minutes)
- ✅ JWT token validation
- ✅ Input validation with Zod
- ✅ CORS configuration
- ✅ Request size limits

### **Database Security**
- ✅ Connection pooling
- ✅ Prepared statements
- ✅ Row-level security
- ✅ Encrypted connections (SSL)

### **Payment Security**
- ✅ PCI DSS compliance
- ✅ Webhook signature verification
- ✅ Transaction encryption
- ✅ Anti-fraud measures

---

## 🏥 Health Monitoring

### **Health Check Endpoints**
```bash
# Application health
GET /api/health
# Response: {"status": "ok", "timestamp": "2024-01-01T00:00:00Z"}

# Database health
GET /api/health/database
# Response: {"status": "ok", "latency": "12ms"}

# Payment gateway health
GET /api/health/payments
# Response: {"upi": "ok", "netbanking": "ok"}
```

### **Monitoring Setup**

#### **Vercel Analytics**
```javascript
// Automatic in production
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### **Error Tracking**
```bash
# Environment variables for error reporting
ERROR_REPORTING_URL=https://api.bugsnag.com
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

#### **Performance Monitoring**
- ✅ Core Web Vitals tracking
- ✅ API response time monitoring
- ✅ Database query performance
- ✅ Real user monitoring (RUM)

---

## 📊 Performance Optimization

### **Build Optimizations**
```javascript
// next.config.js
module.exports = {
  // Production optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  
  // Experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  }
}
```

### **Bundle Analysis**
```bash
# Analyze bundle size
npm run build
npm run analyze  # If analyzer is configured

# Check for unused dependencies
npx depcheck
```

### **Performance Targets**
- ⚡ First Contentful Paint: < 2s
- ⚡ Largest Contentful Paint: < 3s
- ⚡ Time to Interactive: < 4s
- ⚡ API Response Time: < 200ms
- ⚡ Lighthouse Score: > 90

---

## 🛠️ Troubleshooting

### **Common Deployment Issues**

#### **"Exited with status 1" Error**
```bash
# Check these common causes:
1. Package-lock.json conflicts
   → Delete package-lock.json and node_modules
   → Run: npm install

2. Environment variables missing
   → Verify all required env vars are set
   → Check .env.production file

3. TypeScript errors
   → Run: npm run type-check
   → Fix all type errors

4. Build path issues
   → Check render.yaml rootDir setting
   → Verify package.json location
```

#### **Build Timeout Issues**
```bash
# Increase build timeout
# For Render: Set build timeout to 20 minutes
# For Vercel: Upgrade to Pro plan for longer builds
# For Netlify: Increase timeout in site settings
```

#### **Memory Issues During Build**
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Or in package.json scripts:
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

### **Database Connection Issues**
```bash
# Check connection string
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Test connection
npx prisma db pull  # If using Prisma
```

### **Payment Gateway Issues**
```bash
# Verify webhook endpoints
curl -X POST https://your-app.com/api/payments/upi/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check API credentials
# Ensure production keys are different from sandbox
```

### **Performance Issues**
```bash
# Check build output
npm run build -- --analyze

# Monitor runtime performance
# Enable performance monitoring in production
PERFORMANCE_MONITORING_ENABLED=true
```

---

## 🔄 Deployment Checklist

### **Pre-Deployment**
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Payment gateway integration tested
- [ ] OTP services verified
- [ ] Security headers implemented
- [ ] HTTPS/SSL configured
- [ ] Domain name configured
- [ ] Monitoring tools setup

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Payment flows tested
- [ ] User registration working
- [ ] Game functionality verified
- [ ] Admin panel accessible
- [ ] Error tracking active
- [ ] Performance monitoring active
- [ ] Backup systems verified

---

## 📞 Support

### **Documentation**
- 📖 [Next.js Documentation](https://nextjs.org/docs)
- 🎮 [Phaser Documentation](https://phaser.io/learn)
- 🔐 [Security Best Practices](./security-guide.md)

### **Deployment Support**
- 🌐 **Vercel**: [Support Portal](https://vercel.com/support)
- 🚀 **Render**: [Documentation](https://render.com/docs)
- 🐳 **Docker**: [Docker Hub](https://hub.docker.com)

### **Team Contact**
- 📧 **Technical Support**: tech@carromarena.com
- 💬 **DevOps Team**: devops@carromarena.com
- 🆘 **Emergency**: emergency@carromarena.com

---

## 📈 Deployment History

| Version | Date | Platform | Status | Notes |
|---------|------|----------|--------|--------|
| 1.0.0 | 2024-01-01 | Vercel | ✅ Success | Initial production release |
| 1.0.1 | 2024-01-02 | Vercel | ✅ Success | Bug fixes and optimizations |
| 1.1.0 | 2024-01-15 | Multi | ✅ Success | Feature release with CI/CD |

---

*📝 Last Updated: January 2024*  
*🔄 This document is automatically updated with each deployment*

---

**🎯 Ready to Deploy?**  
Follow the [Production Checklist](./production-checklist.md) for final verification!