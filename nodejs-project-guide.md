# CARROM ARENA - Node.js Project Structure Guide

This comprehensive guide demonstrates how to build a complete real-money gaming platform using Node.js, with focus on the Carrom Arena project structure and implementation patterns.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [API Endpoints Guide](#api-endpoints-guide)
4. [Service Layer](#service-layer)
5. [Data Models](#data-models)
6. [Database Integration](#database-integration)
7. [Authentication System](#authentication-system)
8. [Payment Integration](#payment-integration)
9. [Real-time Features](#real-time-features)
10. [Security Best Practices](#security-best-practices)
11. [Testing Strategy](#testing-strategy)
12. [Deployment Guide](#deployment-guide)

## 🎯 Project Overview

Carrom Arena is a real-money gaming platform built with Next.js and Node.js, targeting the Indian market with features including:

- **Real-money gameplay** with ₹10-₹2000 stakes
- **OTP-based authentication** via SMS and Email
- **UPI and Net Banking** payment integration
- **Automatic prize distribution**
- **Developer and Player** account types
- **Tournament system** with brackets
- **Fraud detection** and security measures

## 🏗️ Architecture

### Project Structure

```
carrom-arena/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── game/          # Game management
│   │   │   ├── wallet/        # Payment system
│   │   │   └── profile/       # User management
│   │   └── page.tsx           # Frontend pages
│   ├── services/              # Business logic
│   │   ├── AuthService.ts     # Authentication service
│   │   ├── GameService.ts     # Game management
│   │   ├── WalletService.ts   # Payment handling
│   │   └── NotificationService.ts
│   ├── models/                # Data models
│   │   ├── User.ts           # User model
│   │   ├── Game.ts           # Game model
│   │   ├── Transaction.ts    # Transaction model
│   │   └── Tournament.ts     # Tournament model
│   ├── types/                 # TypeScript types
│   │   ├── api.ts            # API interfaces
│   │   ├── game.ts           # Game types
│   │   └── user.ts           # User types
│   ├── utils/                 # Utilities
│   │   ├── validation.ts     # Input validation
│   │   ├── crypto.ts         # Encryption helpers
│   │   └── payments.ts       # Payment utilities
│   └── middleware/            # Custom middleware
│       ├── auth.ts           # Authentication middleware
│       ├── rateLimit.ts      # Rate limiting
│       └── logging.ts        # Request logging
├── docs/                      # Documentation
├── tests/                     # Test files
└── package.json              # Dependencies and scripts
```

## 🛠️ API Endpoints Guide

### Authentication Endpoints

#### POST /api/auth/register
**Purpose**: Register new user with OTP verification

```typescript
// Request
{
  "mobile": "9876543210",
  "email": "user@example.com",
  "name": "John Doe",
  "password": "secure123",
  "userType": "PLAYER",
  "referralCode": "REF123"
}

// Response
{
  "success": true,
  "message": "Registration initiated",
  "data": {
    "userId": "user_123",
    "smsSessionId": "sess_sms_456",
    "emailSessionId": "sess_email_789",
    "expiresAt": "2024-01-01T12:05:00Z",
    "walletId": "wallet_abc"
  }
}
```

**Implementation Steps**:
1. **Validate input data** using Zod schema
2. **Check for existing users** by mobile/email
3. **Generate OTP** for SMS and email
4. **Create temporary user record**
5. **Send OTP via external APIs** (DataGenIt, GetOTP)
6. **Return session IDs** for verification

#### POST /api/auth/verify-otp
**Purpose**: Verify OTP and complete registration

```typescript
// Request
{
  "sessionId": "sess_sms_456",
  "otp": "123456",
  "type": "SMS"
}

// Response
{
  "success": true,
  "verified": true,
  "nextStep": "COMPLETE_REGISTRATION",
  "user": { /* user data */ },
  "tokens": { /* JWT tokens */ }
}
```

#### POST /api/auth/login
**Purpose**: Authenticate existing user

```typescript
// Request
{
  "identifier": "user@example.com", // email or mobile
  "password": "secure123",
  "twoFactorCode": "654321" // if 2FA enabled
}

// Response
{
  "success": true,
  "user": { /* sanitized user data */ },
  "tokens": {
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresAt": "2024-01-01T13:00:00Z"
  }
}
```

### Game Management Endpoints

#### POST /api/game/lobby
**Purpose**: Join game lobby or create room

```typescript
// Join Lobby Request
{
  "action": "join",
  "userId": "user_123",
  "gameMode": "CLASSIC",
  "stakeAmount": 100,
  "skillLevel": "INTERMEDIATE"
}

// Create Room Request
{
  "action": "create",
  "userId": "user_123",
  "roomName": "John's Room",
  "gameMode": "BLITZ",
  "stakeAmount": 50,
  "isPrivate": false,
  "maxPlayers": 2
}
```

#### GET /api/game/lobby
**Purpose**: Get current lobby state

```typescript
// Response
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "room_123",
        "name": "Quick Match",
        "host": { /* player info */ },
        "players": [{ /* player list */ }],
        "gameMode": "CLASSIC",
        "stakeAmount": 100,
        "prizePool": 190,
        "status": "WAITING",
        "canJoin": true
      }
    ],
    "waitingPlayers": [{ /* waiting players */ }],
    "statistics": {
      "totalPlayers": 1250,
      "activeRooms": 45,
      "totalPrizePool": 125000
    }
  }
}
```

#### POST /api/game/playlogs
**Purpose**: Log game moves and validate gameplay

```typescript
// Request
{
  "gameId": "game_456",
  "playerId": "user_123",
  "moveType": "STRIKE",
  "moveData": {
    "strikerPosition": { "x": 250, "y": 400 },
    "targetCoins": ["white_1", "black_3"],
    "force": 75,
    "angle": 45,
    "result": "SUCCESS"
  },
  "gameState": {
    "currentPlayer": "user_789",
    "turnNumber": 15,
    "score": { "user_123": 8, "user_789": 6 }
  }
}

// Response
{
  "success": true,
  "data": {
    "moveId": "move_789",
    "moveNumber": 15,
    "fraudScore": 12, // 0-100, lower is better
    "gameStatus": { /* current game state */ },
    "validMove": true
  }
}
```

### Wallet Management Endpoints

#### GET /api/wallet
**Purpose**: Get wallet balance and transaction history

```typescript
// Query Parameters
?userId=user_123&action=balance

// Response
{
  "success": true,
  "data": {
    "userId": "user_123",
    "walletId": "wallet_abc",
    "availableBalance": 1250,
    "lockedBalance": 100, // money locked in ongoing games
    "totalBalance": 1350,
    "currency": "INR",
    "limits": {
      "dailyLimit": 10000,
      "dailyUsed": 500,
      "monthlyLimit": 50000,
      "monthlyUsed": 2300
    },
    "kycStatus": "VERIFIED"
  }
}
```

#### POST /api/wallet
**Purpose**: Process deposits, withdrawals, and transfers

```typescript
// Deposit Request
{
  "action": "deposit",
  "userId": "user_123",
  "amount": 500,
  "method": "UPI",
  "paymentDetails": {
    "upiId": "user@paytm"
  }
}

// Withdrawal Request
{
  "action": "withdraw",
  "userId": "user_123",
  "amount": 1000,
  "method": "UPI",
  "withdrawalDetails": {
    "upiId": "user@phonepe"
  }
}

// Response
{
  "success": true,
  "data": {
    "transactionId": "txn_xyz",
    "amount": 500,
    "fees": 0, // UPI has no fees
    "netAmount": 500,
    "status": "PROCESSING",
    "redirectUrl": "https://razorpay.com/payment/xyz" // for redirects
  }
}
```

### Profile Management Endpoints

#### GET /api/profile
**Purpose**: Get user profile information

```typescript
// Query Parameters
?userId=user_123&section=full

// Response
{
  "success": true,
  "data": {
    "id": "user_123",
    "userType": "PLAYER",
    "personalInfo": {
      "name": "John Doe",
      "email": "john@example.com",
      "mobile": "9876543210",
      "avatar": "https://example.com/avatar.jpg",
      "city": "Mumbai",
      "state": "Maharashtra"
    },
    "gamingStats": {
      "gamesPlayed": 145,
      "gamesWon": 89,
      "winRate": 61.4,
      "skillRating": 1850,
      "totalEarnings": 15670,
      "currentStreak": 5,
      "rank": 1247
    },
    "achievements": [
      {
        "id": "first_win",
        "name": "First Victory",
        "description": "Won your first game",
        "icon": "🏆",
        "unlockedAt": "2024-01-01T10:30:00Z"
      }
    ],
    "security": {
      "twoFactorEnabled": false,
      "kycStatus": "VERIFIED",
      "emailVerified": true,
      "mobileVerified": true
    }
  }
}
```

#### PUT /api/profile
**Purpose**: Update user profile

```typescript
// Profile Update Request
{
  "action": "update-profile",
  "userId": "user_123",
  "updates": {
    "name": "John Smith",
    "city": "Delhi",
    "bio": "Professional Carrom player from Delhi",
    "preferences": {
      "gameMode": "BLITZ",
      "notifications": true,
      "language": "hi"
    }
  }
}

// KYC Submission Request
{
  "action": "submit-kyc",
  "userId": "user_123",
  "documentType": "AADHAAR",
  "documentNumber": "123456789012",
  "documentImage": "https://example.com/aadhaar.jpg",
  "selfieImage": "https://example.com/selfie.jpg"
}
```

## 🔧 Service Layer

### AuthService Implementation

```typescript
// src/services/AuthService.ts
export class AuthService {
  // Registration with OTP
  async registerUser(userData: RegisterRequest): Promise<RegisterResponse> {
    // 1. Validate input data
    // 2. Check for existing users
    // 3. Generate and send OTP
    // 4. Create temporary user
    // 5. Return session IDs
  }

  // OTP Verification
  async verifyOTP(sessionId: string, otp: string, type: 'SMS' | 'EMAIL'): Promise<boolean> {
    // 1. Retrieve OTP session
    // 2. Validate OTP
    // 3. Mark as verified
    // 4. Complete registration if both verified
  }

  // User Authentication
  async authenticateUser(credentials: LoginRequest): Promise<LoginResponse> {
    // 1. Find user
    // 2. Verify password
    // 3. Check 2FA if enabled
    // 4. Generate tokens
    // 5. Create session
  }

  // Token Management
  async generateAuthTokens(user: User): Promise<AuthTokens> {
    // 1. Create JWT payload
    // 2. Sign access token (1 hour)
    // 3. Sign refresh token (30 days)
    // 4. Return tokens
  }
}
```

### GameService Implementation

```typescript
// src/services/GameService.ts
export class GameService {
  // Game Creation
  async createGame(gameData: CreateGameRequest): Promise<Game> {
    // 1. Validate game parameters
    // 2. Check host eligibility
    // 3. Create game room
    // 4. Initialize game state
    // 5. Lock host's stake
  }

  // Player Joining
  async joinGame(gameId: string, playerId: string): Promise<JoinResult> {
    // 1. Validate game and player
    // 2. Check capacity
    // 3. Add player to game
    // 4. Lock player's stake
    // 5. Check if ready to start
  }

  // Move Processing
  async processMove(gameId: string, playerId: string, moveData: MoveData): Promise<MoveResult> {
    // 1. Validate move legality
    // 2. Simulate physics
    // 3. Update game state
    // 4. Check win conditions
    // 5. Switch players or end game
  }

  // Prize Distribution
  async distributePrizes(game: Game): Promise<void> {
    // 1. Calculate prize amounts
    // 2. Transfer winnings
    // 3. Release locked stakes
    // 4. Update player stats
  }
}
```

## 💾 Data Models

### User Model Structure

```typescript
// src/models/User.ts
export interface User {
  id: string;
  email: string;
  mobile: string;
  name: string;
  userType: 'PLAYER' | 'DEVELOPER';
  isVerified: boolean;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
  skillRating: number;
  gamingStats: GamingStatistics;
  preferences: UserPreferences;
  security: SecurityInfo;
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  static async create(userData: CreateUserData): Promise<User>
  static async findById(userId: string): Promise<User | null>
  static async findByEmail(email: string): Promise<User | null>
  static async authenticate(identifier: string, password: string): Promise<User | null>
  static async update(userId: string, updateData: Partial<User>): Promise<User | null>
  static async updateGameStats(userId: string, gameResult: GameResult): Promise<void>
}
```

### Game Model Structure

```typescript
// src/models/Game.ts
export interface Game {
  id: string;
  roomId: string;
  gameMode: 'CLASSIC' | 'BLITZ' | 'TOURNAMENT';
  players: GamePlayer[];
  stakeAmount: number;
  prizePool: number;
  status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED';
  gameState: GameState;
  moves: GameMove[];
  createdAt: Date;
  startTime?: Date;
  endTime?: Date;
  winner?: string;
}

export interface GameState {
  currentPlayer: string;
  turnNumber: number;
  board: BoardState;
  timeRemaining: number;
  score: Record<string, number>;
}
```

## 🗄️ Database Integration

### Database Schema Design

#### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  mobile VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type ENUM('PLAYER', 'DEVELOPER') NOT NULL,
  avatar VARCHAR(500),
  date_of_birth DATE,
  city VARCHAR(100),
  state VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  mobile_verified BOOLEAN DEFAULT FALSE,
  kyc_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
  skill_level ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO') DEFAULT 'BEGINNER',
  skill_rating INT DEFAULT 1200,
  level INT DEFAULT 1,
  experience INT DEFAULT 0,
  preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  last_active TIMESTAMP
);
```

#### Games Table
```sql
CREATE TABLE games (
  id VARCHAR(50) PRIMARY KEY,
  room_id VARCHAR(20) NOT NULL,
  game_mode ENUM('CLASSIC', 'BLITZ', 'TOURNAMENT') NOT NULL,
  stake_amount DECIMAL(10,2) NOT NULL,
  prize_pool DECIMAL(10,2) NOT NULL,
  status ENUM('WAITING', 'STARTING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL,
  max_players INT DEFAULT 2,
  current_player VARCHAR(50),
  game_state JSON,
  rules JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  winner_id VARCHAR(50),
  FOREIGN KEY (winner_id) REFERENCES users(id)
);
```

#### Wallet Transactions Table
```sql
CREATE TABLE wallet_transactions (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  wallet_id VARCHAR(50) NOT NULL,
  transaction_type ENUM('DEPOSIT', 'WITHDRAWAL', 'GAME_STAKE', 'PRIZE_WIN', 'TRANSFER') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fees DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL,
  payment_method VARCHAR(50),
  gateway_reference VARCHAR(100),
  game_id VARCHAR(50),
  description TEXT,
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  failure_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

### Database Connection Setup

```typescript
// src/lib/database.ts
import { Pool } from 'pg'; // for PostgreSQL
// or import mongoose from 'mongoose'; // for MongoDB

// PostgreSQL Connection
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production'
});

// MongoDB Connection
export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

// Database Query Helper
export async function executeQuery(query: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}
```

## 🔐 Authentication System

### JWT Token Implementation

```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  userType: 'PLAYER' | 'DEVELOPER';
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: '1h',
    issuer: 'carrom-arena',
    audience: 'carrom-arena-users'
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '30d',
    issuer: 'carrom-arena'
  });
};

export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};
```

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { NextRequest } from 'next/server';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    userType: 'PLAYER' | 'DEVELOPER';
  };
}

export const authenticateToken = async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new Error('Access token required');
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    throw new Error('Invalid or expired token');
  }

  // Verify user still exists and is active
  const user = await UserModel.findById(payload.userId);
  if (!user || !user.isActive) {
    throw new Error('User not found or deactivated');
  }

  return payload;
};

// Usage in API routes
export async function authenticatedRoute(
  request: NextRequest,
  handler: (req: NextRequest, user: JWTPayload) => Promise<Response>
) {
  try {
    const user = await authenticateToken(request);
    return await handler(request, user);
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

### OTP System Implementation

```typescript
// src/services/OTPService.ts
export class OTPService {
  static async generateAndSendSMS(mobile: string): Promise<{ sessionId: string; expiresAt: Date }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = `sess_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP in Redis or database
    await this.storeOTPSession({
      sessionId,
      contact: mobile,
      otp,
      type: 'SMS',
      expiresAt,
      attempts: 0
    });

    // Send SMS via DataGenIt API
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'api.datgenit.com',
        path: '/sms/send',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DATAGENIB_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: {
          mobile: mobile,
          message: `Your Carrom Arena OTP is: ${otp}. Valid for 5 minutes. Do not share.`,
          templateId: 'CARROM_OTP_TEMPLATE',
          sender: 'CARROM'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send SMS OTP');
    }

    return { sessionId, expiresAt };
  }

  static async verifyOTP(sessionId: string, inputOTP: string): Promise<boolean> {
    const session = await this.getOTPSession(sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      throw new Error('OTP session expired');
    }

    if (session.attempts >= 3) {
      throw new Error('Maximum OTP attempts exceeded');
    }

    if (session.otp !== inputOTP) {
      await this.incrementOTPAttempts(sessionId);
      throw new Error('Invalid OTP');
    }

    await this.markOTPVerified(sessionId);
    return true;
  }
}
```

## 💳 Payment Integration

### UPI Payment Integration

```typescript
// src/services/PaymentService.ts
export class PaymentService {
  static async initiateUPIPayment(transactionData: {
    amount: number;
    userId: string;
    transactionId: string;
    upiId?: string;
  }) {
    const razorpayOrder = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'api.razorpay.com',
        path: '/v1/orders',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(
            process.env.RAZORPAY_KEY + ':' + process.env.RAZORPAY_SECRET
          ).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: {
          amount: transactionData.amount * 100, // Convert to paise
          currency: 'INR',
          receipt: transactionData.transactionId,
          notes: {
            userId: transactionData.userId,
            purpose: 'wallet_deposit'
          }
        }
      })
    });

    const order = await razorpayOrder.json();
    
    return {
      success: true,
      orderId: order.id,
      amount: transactionData.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`
    };
  }

  static async processPaymentWebhook(payload: any) {
    const { event, payment } = payload;
    
    switch (event) {
      case 'payment.captured':
        await this.handlePaymentSuccess(payment.entity);
        break;
      case 'payment.failed':
        await this.handlePaymentFailure(payment.entity);
        break;
    }
  }

  private static async handlePaymentSuccess(payment: any) {
    const transactionId = payment.notes.transactionId;
    const userId = payment.notes.userId;
    const amount = payment.amount / 100; // Convert from paise
    
    // Update transaction status
    await this.updateTransactionStatus(transactionId, 'SUCCESS');
    
    // Credit user wallet
    await this.creditUserWallet(userId, amount, transactionId);
    
    // Send notification
    await this.sendPaymentNotification(userId, 'deposit_success', { amount });
  }
}
```

### Automatic Prize Distribution

```typescript
// src/services/PrizeService.ts
export class PrizeService {
  static async distributePrizes(game: Game) {
    if (!game.winner) {
      throw new Error('Cannot distribute prizes without a winner');
    }

    // Calculate prize distribution (90% to winner, 10% to runner-up for 2-player games)
    const prizeDistribution = this.calculatePrizeDistribution(game);
    
    // Process all prize transfers atomically
    const transferPromises = prizeDistribution.map(prize => 
      this.transferPrize(prize.userId, prize.amount, game.id, 'PRIZE_WIN')
    );
    
    await Promise.all(transferPromises);
    
    // Release all locked stakes
    await this.releaseGameStakes(game.id);
    
    // Update player statistics
    await this.updatePlayerStats(game);
    
    // Send notifications
    await this.sendPrizeNotifications(game, prizeDistribution);
    
    // Record game completion
    await this.recordGameCompletion(game);
  }

  private static calculatePrizeDistribution(game: Game) {
    const totalPrize = game.prizePool;
    const winners = game.players.filter(p => p.userId === game.winner);
    
    if (game.players.length === 2) {
      // 1v1 game: Winner takes 90%, house keeps 10%
      return [
        { userId: game.winner!, amount: Math.floor(totalPrize * 0.9) }
      ];
    } else {
      // Multi-player: Custom distribution logic
      return this.calculateMultiPlayerPrizes(game, totalPrize);
    }
  }

  private static async transferPrize(
    userId: string, 
    amount: number, 
    gameId: string, 
    type: string
  ) {
    // Create transaction record
    const transaction = await this.createTransaction({
      userId,
      type: 'PRIZE_WIN',
      amount,
      gameId,
      status: 'SUCCESS',
      description: `Prize from game ${gameId}`
    });

    // Credit user wallet
    await this.creditUserWallet(userId, amount, transaction.id);
    
    return transaction;
  }
}
```

## ⚡ Real-time Features

### WebSocket Implementation

```typescript
// src/services/WebSocketService.ts
import { Server } from 'socket.io';

export class WebSocketService {
  private io: Server;
  
  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL,
        methods: ['GET', 'POST']
      }
    });
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join game room
      socket.on('join-game', (gameId: string) => {
        socket.join(`game-${gameId}`);
        console.log(`User ${socket.id} joined game ${gameId}`);
      });

      // Join lobby
      socket.on('join-lobby', () => {
        socket.join('lobby');
        this.sendLobbyUpdate(socket);
      });

      // Handle game moves
      socket.on('game-move', async (moveData) => {
        try {
          const result = await GameService.processMove(
            moveData.gameId,
            moveData.playerId,
            moveData.moveData
          );
          
          // Broadcast move to all players in the game
          this.io.to(`game-${moveData.gameId}`).emit('move-update', {
            move: moveData,
            result: result,
            gameState: result.newState
          });
          
        } catch (error) {
          socket.emit('move-error', { error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  // Broadcast lobby updates
  public broadcastLobbyUpdate(data: any) {
    this.io.to('lobby').emit('lobby-update', data);
  }

  // Send game updates
  public sendGameUpdate(gameId: string, updateData: any) {
    this.io.to(`game-${gameId}`).emit('game-update', updateData);
  }

  // Send notifications
  public sendNotification(userId: string, notification: any) {
    this.io.to(`user-${userId}`).emit('notification', notification);
  }
}
```

### Real-time Game State Management

```typescript
// src/services/GameStateManager.ts
export class GameStateManager {
  private gameStates: Map<string, GameState> = new Map();
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
  }

  async updateGameState(gameId: string, move: GameMove) {
    const currentState = this.gameStates.get(gameId);
    if (!currentState) {
      throw new Error('Game state not found');
    }

    // Process move and update state
    const newState = await this.processMove(currentState, move);
    
    // Update in memory
    this.gameStates.set(gameId, newState);
    
    // Persist to database
    await this.persistGameState(gameId, newState);
    
    // Broadcast to all players
    this.wsService.sendGameUpdate(gameId, {
      gameState: newState,
      lastMove: move,
      timestamp: new Date()
    });
    
    return newState;
  }

  private async processMove(currentState: GameState, move: GameMove): Promise<GameState> {
    // Game physics simulation
    const physicsResult = await this.simulatePhysics(currentState.board, move.moveData);
    
    // Update board state
    const newBoard = this.updateBoardState(currentState.board, physicsResult);
    
    // Calculate new scores
    const newScores = this.calculateScores(currentState, physicsResult);
    
    // Check win conditions
    const winCheck = this.checkWinCondition(newBoard, newScores);
    
    return {
      ...currentState,
      board: newBoard,
      currentPlayer: winCheck.hasWinner ? '' : this.getNextPlayer(currentState),
      turnNumber: currentState.turnNumber + 1,
      timeRemaining: this.resetTurnTimer(),
      gamePhase: winCheck.hasWinner ? 'FINISHED' : 'PLAYING',
      lastMoveAt: new Date()
    };
  }

  private async simulatePhysics(board: BoardState, moveData: any) {
    // Carrom physics simulation
    const { strikerPosition, force, angle } = moveData;
    
    // Calculate trajectory
    const trajectory = this.calculateTrajectory(strikerPosition, force, angle);
    
    // Detect collisions
    const collisions = this.detectCollisions(trajectory, board.coins);
    
    // Process collision effects
    const effects = this.processCollisionEffects(collisions, board);
    
    return {
      trajectory,
      collisions,
      effects,
      newCoinPositions: effects.newPositions,
      pocketedCoins: effects.pocketed,
      fouls: effects.fouls
    };
  }
}
```

## 🔒 Security Best Practices

### Input Validation

```typescript
// src/utils/validation.ts
import { z } from 'zod';
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

export const validateIndianMobile = (mobile: string): boolean => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.toLowerCase());
};

export const validateStakeAmount = (amount: number): boolean => {
  return amount >= 10 && amount <= 2000; // ₹10 to ₹2000
};

// Schema validation for game moves
export const GameMoveSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  moveType: z.enum(['STRIKE', 'POSITION', 'FOUL', 'TIMEOUT']),
  moveData: z.object({
    strikerPosition: z.object({
      x: z.number().min(0).max(500),
      y: z.number().min(0).max(500)
    }),
    force: z.number().min(0).max(100),
    angle: z.number().min(0).max(360)
  }),
  timestamp: z.string().datetime()
});
```

### Fraud Detection System

```typescript
// src/services/FraudDetectionService.ts
export class FraudDetectionService {
  static async analyzeMoveForFraud(move: GameMove, gameHistory: GameMove[]): Promise<number> {
    let fraudScore = 0;
    
    // Analyze timing patterns
    fraudScore += this.analyzeTimingPatterns(move, gameHistory);
    
    // Analyze accuracy patterns
    fraudScore += this.analyzeAccuracyPatterns(move, gameHistory);
    
    // Check for impossible moves
    fraudScore += this.validatePhysicsRealism(move);
    
    // Analyze behavioral patterns
    fraudScore += await this.analyzeBehavioralPatterns(move.playerId, gameHistory);
    
    // Device consistency check
    fraudScore += await this.checkDeviceConsistency(move.playerId);
    
    return Math.min(fraudScore, 100);
  }

  private static analyzeTimingPatterns(move: GameMove, history: GameMove[]): number {
    const recentMoves = history.slice(-10);
    if (recentMoves.length < 3) return 0;
    
    // Calculate move time intervals
    const intervals = [];
    for (let i = 1; i < recentMoves.length; i++) {
      const interval = new Date(recentMoves[i].timestamp).getTime() - 
                      new Date(recentMoves[i-1].timestamp).getTime();
      intervals.push(interval);
    }
    
    // Check for suspiciously consistent timing
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => 
      acc + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    // Low variance + fast moves = suspicious
    if (variance < 100 && avgInterval < 2000) {
      return 40; // High fraud score
    }
    
    // Extremely fast moves
    if (avgInterval < 500) {
      return 60;
    }
    
    return 0;
  }

  private static analyzeAccuracyPatterns(move: GameMove, history: GameMove[]): number {
    const recentResults = history.slice(-20).filter(m => m.moveData.result);
    if (recentResults.length < 10) return 0;
    
    const successCount = recentResults.filter(m => m.moveData.result === 'SUCCESS').length;
    const successRate = successCount / recentResults.length;
    
    // Unnaturally high success rate
    if (successRate > 0.95) return 50;
    if (successRate > 0.85) return 30;
    
    return 0;
  }

  static async flagSuspiciousActivity(userId: string, fraudScore: number, gameId: string) {
    if (fraudScore > 75) {
      // High fraud score - immediate action
      await this.createFraudAlert({
        userId,
        gameId,
        fraudScore,
        severity: 'HIGH',
        action: 'INVESTIGATE',
        description: 'Suspicious gameplay patterns detected'
      });
      
      // Temporarily restrict user
      await this.temporaryRestriction(userId, 'SUSPECTED_FRAUD');
    } else if (fraudScore > 50) {
      // Medium fraud score - monitor closely
      await this.createFraudAlert({
        userId,
        gameId,
        fraudScore,
        severity: 'MEDIUM',
        action: 'MONITOR',
        description: 'Unusual gameplay patterns detected'
      });
    }
  }
}
```

### Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message: string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  async checkLimit(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return { allowed: true, remaining: config.maxRequests - 1 };
    }

    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    record.count++;
    return { allowed: true, remaining: config.maxRequests - record.count };
  }
}

const rateLimiter = new RateLimiter();

export const rateLimit = (config: RateLimitConfig) => {
  return async (request: NextRequest) => {
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const key = `${clientIP}:${request.nextUrl.pathname}`;
    
    const result = await rateLimiter.checkLimit(key, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: config.message,
          retryAfter: Math.ceil(config.windowMs / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    return null; // Proceed to next middleware
  };
};

// Usage in API routes
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Max 100 requests per 15 minutes
  message: 'Too many API requests, please try again later'
});

export const authRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5, // Max 5 auth attempts per 5 minutes
  message: 'Too many authentication attempts, please try again later'
});
```

## 🧪 Testing Strategy

### Unit Testing

```typescript
// tests/services/AuthService.test.ts
import { AuthService } from '../../src/services/AuthService';
import { UserModel } from '../../src/models/User';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      // Mock dependencies
      jest.spyOn(UserModel, 'findByEmailOrMobile').mockResolvedValue(null);
      jest.spyOn(AuthService, 'generateAndSendSMSOTP').mockResolvedValue({
        sessionId: 'test_sms_session',
        expiresAt: new Date()
      });

      const userData = {
        mobile: '9876543210',
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        userType: 'PLAYER' as const
      };

      const result = await AuthService.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.smsSessionId).toBe('test_sms_session');
    });

    it('should fail if user already exists', async () => {
      jest.spyOn(UserModel, 'findByEmailOrMobile').mockResolvedValue({
        id: 'existing_user',
        email: 'test@example.com'
      } as any);

      const userData = {
        mobile: '9876543210',
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        userType: 'PLAYER' as const
      };

      await expect(AuthService.registerUser(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('verifyOTP', () => {
    it('should verify valid OTP', async () => {
      jest.spyOn(AuthService, 'getOTPSession').mockResolvedValue({
        sessionId: 'test_session',
        otp: '123456',
        expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
        attempts: 0
      } as any);

      const result = await AuthService.verifyOTP('test_session', '123456', 'SMS');
      expect(result).toBe(true);
    });

    it('should fail for invalid OTP', async () => {
      jest.spyOn(AuthService, 'getOTPSession').mockResolvedValue({
        sessionId: 'test_session',
        otp: '123456',
        expiresAt: new Date(Date.now() + 300000),
        attempts: 0
      } as any);

      await expect(AuthService.verifyOTP('test_session', '654321', 'SMS'))
        .rejects.toThrow('Invalid OTP');
    });
  });
});
```

### Integration Testing

```typescript
// tests/api/auth.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import handler from '../../src/app/api/auth/register/route';

describe('/api/auth/register', () => {
  it('should register a new user successfully', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          body: JSON.stringify({
            mobile: '9876543210',
            email: 'newuser@example.com',
            name: 'New User',
            password: 'password123',
            userType: 'PLAYER'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.userId).toBeDefined();
      }
    });
  });

  it('should validate required fields', async () => {
    await testApiHandler({
      handler,
      test: async ({ fetch }) => {
        const response = await fetch({
          method: 'POST',
          body: JSON.stringify({
            email: 'invalid-email', // Invalid email
            name: 'A', // Too short
            password: '123' // Too short
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.errors).toBeDefined();
        expect(data.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
```

### Load Testing

```typescript
// tests/load/game-performance.test.ts
import { performance } from 'perf_hooks';

describe('Game Performance Tests', () => {
  it('should handle 100 concurrent game moves', async () => {
    const gameId = 'test_game_123';
    const moves = Array.from({ length: 100 }, (_, i) => ({
      gameId,
      playerId: `player_${i % 2}`, // Alternate between 2 players
      moveData: {
        strikerPosition: { x: Math.random() * 500, y: Math.random() * 500 },
        force: Math.random() * 100,
        angle: Math.random() * 360
      }
    }));

    const startTime = performance.now();
    
    const results = await Promise.allSettled(
      moves.map(move => GameService.processMove(move.gameId, move.playerId, move.moveData))
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Performance assertions
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    const successfulMoves = results.filter(r => r.status === 'fulfilled').length;
    expect(successfulMoves).toBeGreaterThanOrEqual(95); // At least 95% success rate
  });
});
```

## 🚀 Deployment Guide

### Environment Configuration

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
REDIS_URL=redis://username:password@host:port

# JWT Secrets
JWT_ACCESS_SECRET=your_super_secret_access_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here

# Payment Gateway
RAZORPAY_KEY=rzp_live_your_key_here
RAZORPAY_SECRET=your_razorpay_secret_here

# SMS & Email APIs
DATAGENIB_API_KEY=your_datagenit_api_key
GETOTP_API_KEY=your_getotp_api_key

# Application URLs
NEXT_PUBLIC_APP_URL=https://carromarena.com
NEXT_PUBLIC_WS_URL=wss://carromarena.com

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here
WEBHOOK_SECRET=your_webhook_verification_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/carromarena
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: carromarena
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Deploy to Render
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Accept: application/json" \
            -H "Content-Type: application/json" \
            https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys \
            -d '{"clearCache": "clear"}'
```

### Production Checklist

- [ ] **Environment Variables**: All production environment variables set
- [ ] **Database**: Production database configured with SSL
- [ ] **SSL Certificates**: HTTPS configured with valid certificates
- [ ] **Payment Gateway**: Live payment gateway keys configured
- [ ] **SMS/Email**: Production API keys for OTP services
- [ ] **Monitoring**: Error tracking (Sentry) and logging configured
- [ ] **Backup Strategy**: Database backup and disaster recovery plan
- [ ] **Performance**: CDN configured for static assets
- [ ] **Security**: Rate limiting and DDoS protection enabled
- [ ] **Compliance**: Legal terms, privacy policy, and gaming regulations
- [ ] **Testing**: Load testing completed for expected traffic
- [ ] **Documentation**: API documentation and deployment guides ready

---

## 📚 Additional Resources

### Code Examples
- **API Routes**: Complete implementation in `src/api/` directory
- **Services**: Business logic in `src/services/` directory
- **Models**: Data models in `src/models/` directory
- **Types**: TypeScript definitions in `src/types/` directory

### External Integrations
- **DataGenIt SMS API**: SMS OTP sending service
- **GetOTP Email API**: Email OTP sending service
- **Razorpay**: Payment gateway for UPI/Net Banking
- **WebSocket**: Real-time game updates

### Development Tools
- **Next.js**: Full-stack React framework
- **TypeScript**: Type-safe development
- **Zod**: Runtime type validation
- **Jest**: Testing framework
- **ESLint/Prettier**: Code quality tools

This guide provides a comprehensive foundation for building a production-ready real-money gaming platform with Node.js. Each section includes practical implementation examples and best practices specific to the Indian gaming market.