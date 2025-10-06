# Carrom Arena API Documentation

A comprehensive REST API for real-money Carrom gaming platform with automatic prize distribution, OTP authentication, and UPI/Net Banking integration for the Indian market.

## Base Information

- **Base URL**: `https://carromarena.com/api`
- **Version**: 1.0.0
- **Authentication**: Bearer JWT tokens
- **Content-Type**: `application/json`
- **Currency**: Indian Rupees (INR)
- **Stake Limits**: ₹10 - ₹2000

## Authentication

### JWT Token Format
```
Authorization: Bearer <access_token>
```

### Token Payload
```typescript
{
  userId: string;
  email: string;
  mobile: string;
  userType: 'PLAYER' | 'DEVELOPER';
  iat: number;
  exp: number;
}
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per 5 minutes
- **Game endpoints**: 100 requests per minute
- **Wallet endpoints**: 20 requests per minute
- **General API**: 1000 requests per hour

Rate limit headers are included in responses:
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
- `Retry-After`: Seconds to wait (when rate limited)

---

## Authentication Endpoints

### POST /auth/register
Register a new user with OTP verification.

**Request Body:**
```json
{
  "mobile": "9876543210",
  "email": "user@example.com",
  "name": "John Doe",
  "password": "secure123",
  "userType": "PLAYER",
  "referralCode": "REF123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Registration initiated. Please verify OTP sent to your mobile and email.",
  "data": {
    "userId": "user_123456789",
    "smsSessionId": "sess_sms_abc123",
    "emailSessionId": "sess_email_def456",
    "expiresAt": "2024-01-01T12:05:00Z",
    "walletId": "wallet_789xyz",
    "nextStep": "VERIFY_OTP",
    "verification": {
      "smsRequired": true,
      "emailRequired": true,
      "timeLimit": "5 minutes"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `409 Conflict` - User already exists
- `500 Internal Server Error` - OTP sending failed

---

### POST /auth/verify-otp
Verify OTP sent during registration or login.

**Request Body:**
```json
{
  "sessionId": "sess_sms_abc123",
  "otp": "123456",
  "type": "SMS"
}
```

**Response (200):**
```json
{
  "success": true,
  "verified": true,
  "message": "OTP verified successfully",
  "data": {
    "nextStep": "COMPLETE_REGISTRATION",
    "user": {
      "id": "user_123456789",
      "name": "John Doe",
      "email": "user@example.com",
      "mobile": "9876543210",
      "userType": "PLAYER",
      "isVerified": true,
      "kycStatus": "PENDING"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresAt": "2024-01-01T13:00:00Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid OTP or session expired
- `429 Too Many Requests` - Maximum attempts exceeded

---

### POST /auth/login
Authenticate existing user.

**Request Body:**
```json
{
  "identifier": "user@example.com",
  "password": "secure123",
  "twoFactorCode": "654321"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_123456789",
      "name": "John Doe",
      "email": "user@example.com",
      "mobile": "9876543210",
      "userType": "PLAYER",
      "skillLevel": "INTERMEDIATE",
      "skillRating": 1850,
      "walletBalance": 1250,
      "rank": 1247,
      "isVerified": true,
      "kycStatus": "VERIFIED",
      "lastActive": "2024-01-01T11:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresAt": "2024-01-01T13:00:00Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials or account deactivated
- `403 Forbidden` - 2FA code required or account locked

---

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-01T14:00:00Z"
  }
}
```

---

## Game Management Endpoints

### GET /game/lobby
Get current lobby state with available rooms and players.

**Query Parameters:**
- `gameMode` (optional): Filter by game mode (CLASSIC, BLITZ, TOURNAMENT)
- `skillLevel` (optional): Filter by skill level
- `stakeRange` (optional): Filter by stake amount range

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "room_abc123",
        "name": "Quick Match Room",
        "host": {
          "id": "user_123",
          "name": "Alice",
          "avatar": "https://example.com/avatar.jpg",
          "skillLevel": "INTERMEDIATE",
          "winRate": 65.4
        },
        "players": [
          {
            "id": "user_123",
            "name": "Alice",
            "skillLevel": "INTERMEDIATE",
            "status": "READY"
          }
        ],
        "gameMode": "CLASSIC",
        "stakeAmount": 100,
        "prizePool": 190,
        "status": "WAITING",
        "isPrivate": false,
        "maxPlayers": 2,
        "timeLimit": 15,
        "canJoin": true,
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "waitingPlayers": [
      {
        "id": "user_456",
        "name": "Bob",
        "skillLevel": "ADVANCED",
        "currentStake": 200,
        "status": "WAITING",
        "region": "Mumbai"
      }
    ],
    "statistics": {
      "totalPlayers": 1250,
      "activeRooms": 45,
      "totalPrizePool": 125000,
      "averageWaitTime": 45,
      "popularGameMode": "CLASSIC"
    },
    "recommendations": [
      {
        "type": "QUICK_MATCH",
        "title": "Quick Match Available",
        "description": "Join a game with similar skill level",
        "gameMode": "CLASSIC",
        "stakeAmount": 100,
        "estimatedWaitTime": 30,
        "matchQuality": 95
      }
    ],
    "filters": {
      "gameMode": "ALL",
      "skillLevel": "ALL",
      "stakeRange": "ALL"
    },
    "lastUpdated": "2024-01-01T12:30:00Z"
  }
}
```

---

### POST /game/lobby
Join lobby, create room, or perform lobby actions.

**Join Lobby Request:**
```json
{
  "action": "join",
  "userId": "user_123",
  "gameMode": "CLASSIC",
  "stakeAmount": 100,
  "skillLevel": "INTERMEDIATE",
  "autoMatch": true
}
```

**Create Room Request:**
```json
{
  "action": "create",
  "userId": "user_123",
  "roomName": "My Private Room",
  "gameMode": "BLITZ",
  "stakeAmount": 50,
  "isPrivate": false,
  "maxPlayers": 2,
  "timeLimit": 10
}
```

**Response (200) - Room Created:**
```json
{
  "success": true,
  "message": "Room created successfully",
  "data": {
    "roomId": "room_xyz789",
    "roomCode": "XYZ789",
    "shareUrl": "https://carromarena.com/join/XYZ789",
    "game": {
      "id": "game_def456",
      "roomId": "room_xyz789",
      "gameMode": "BLITZ",
      "stakeAmount": 50,
      "prizePool": 95,
      "status": "WAITING",
      "players": [
        {
          "userId": "user_123",
          "name": "Alice",
          "isReady": false,
          "isHost": true
        }
      ]
    }
  }
}
```

**Response (200) - Joined Game:**
```json
{
  "success": true,
  "message": "Joined game successfully. Game starting in 3 seconds!",
  "data": {
    "gameId": "game_def456",
    "roomId": "room_xyz789",
    "players": [
      {
        "userId": "user_123",
        "name": "Alice",
        "isReady": true
      },
      {
        "userId": "user_456",
        "name": "Bob",
        "isReady": true
      }
    ],
    "prizePool": 190,
    "status": "STARTING",
    "startTime": "2024-01-01T12:33:00Z",
    "gameUrl": "/game/game_def456"
  }
}
```

**Error Responses:**
- `403 Forbidden` - Insufficient wallet balance or game full
- `404 Not Found` - Game room not found

---

### POST /game/playlogs
Log game moves and track gameplay for fraud detection.

**Request Body:**
```json
{
  "gameId": "game_def456",
  "playerId": "user_123",
  "moveType": "STRIKE",
  "moveData": {
    "strikerPosition": { "x": 250, "y": 400 },
    "targetCoins": ["white_1", "black_3"],
    "force": 75,
    "angle": 45,
    "result": "SUCCESS"
  },
  "timestamp": "2024-01-01T12:35:00Z",
  "gameState": {
    "currentPlayer": "user_456",
    "turnNumber": 15,
    "score": { "user_123": 8, "user_456": 6 },
    "remainingCoins": {
      "user_123": ["white_2", "white_4"],
      "user_456": ["black_1", "black_2", "black_5"]
    },
    "queenStatus": "ON_BOARD"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Move logged successfully",
  "data": {
    "moveId": "move_ghi789",
    "moveNumber": 15,
    "fraudScore": 12,
    "gameStatus": {
      "status": "IN_PROGRESS",
      "currentPlayer": "user_456",
      "timeRemaining": 285,
      "score": { "user_123": 8, "user_456": 6 }
    },
    "nextPlayer": "user_456",
    "validMove": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid move or not player's turn
- `404 Not Found` - Game not found or not active

---

### GET /game/playlogs
Retrieve player statistics, match history, and leaderboards.

**Query Parameters:**
- `action`: Type of data (player-stats, match-history, leaderboard)
- `playerId`: Player ID (required for player-stats and match-history)
- `timeframe`: Time period (DAILY, WEEKLY, MONTHLY, ALL_TIME)
- `gameMode`: Game mode filter
- `limit`: Number of results (default: 20)

**Player Stats Response (200):**
```json
{
  "success": true,
  "data": {
    "playerId": "user_123",
    "timeframe": "MONTHLY",
    "stats": {
      "gamesPlayed": 145,
      "gamesWon": 89,
      "winRate": 61.4,
      "totalEarnings": 15670,
      "totalStaked": 14500,
      "netProfit": 1170,
      "currentStreak": 5,
      "longestWinStreak": 12,
      "averageGameDuration": 480,
      "totalPlayTime": 69600,
      "skillRating": 1850,
      "ratingChange": +45
    },
    "performance": {
      "accuracy": 78.5,
      "averageMoveTime": 8.2,
      "foulRate": 12.3,
      "queenSuccessRate": 65.0,
      "comebackWins": 8,
      "perfectGames": 3
    },
    "recentMatches": [
      {
        "id": "match_latest",
        "gameMode": "CLASSIC",
        "opponent": "Alice",
        "result": "WON",
        "earnings": 180,
        "duration": 420,
        "playedAt": "2024-01-01T11:00:00Z"
      }
    ],
    "achievements": ["first_win", "win_streak_5", "accuracy_master"],
    "fraudAlerts": 0,
    "lastUpdated": "2024-01-01T12:30:00Z"
  }
}
```

**Leaderboard Response (200):**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "playerId": "user_top1",
        "playerName": "ProPlayer",
        "avatar": "https://example.com/avatar1.jpg",
        "skillRating": 2850,
        "gamesPlayed": 500,
        "winRate": 85.2,
        "totalEarnings": 125000,
        "currentStreak": 15,
        "badgesCount": 12
      }
    ],
    "timeframe": "MONTHLY",
    "gameMode": "ALL",
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

---

## Wallet Management Endpoints

### GET /wallet
Get wallet balance, transaction history, and limits.

**Query Parameters:**
- `userId`: User ID (required)
- `action`: Type of data (balance, transactions, limits, pending)

**Balance Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "walletId": "wallet_abc123",
    "walletType": "PLAYER_WALLET",
    "availableBalance": 1250.00,
    "lockedBalance": 100.00,
    "totalBalance": 1350.00,
    "currency": "INR",
    "limits": {
      "dailyLimit": 10000,
      "dailyUsed": 500,
      "dailyRemaining": 9500,
      "monthlyLimit": 50000,
      "monthlyUsed": 2300,
      "monthlyRemaining": 47700,
      "kycLimit": 10000,
      "singleTransactionLimit": 2000
    },
    "kycStatus": "VERIFIED",
    "lastUpdated": "2024-01-01T12:30:00Z"
  }
}
```

**Transaction History Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_abc123",
        "type": "DEPOSIT",
        "amount": 500.00,
        "fees": 0.00,
        "netAmount": 500.00,
        "status": "SUCCESS",
        "method": "UPI",
        "reference": "rzp_123456789",
        "description": "Wallet top-up via UPI",
        "balanceBefore": 750.00,
        "balanceAfter": 1250.00,
        "createdAt": "2024-01-01T10:00:00Z",
        "processedAt": "2024-01-01T10:00:15Z"
      },
      {
        "id": "txn_def456",
        "type": "GAME_STAKE",
        "amount": 100.00,
        "gameId": "game_xyz789",
        "description": "Game stake for Classic match",
        "status": "SUCCESS",
        "balanceBefore": 1350.00,
        "balanceAfter": 1250.00,
        "createdAt": "2024-01-01T11:30:00Z"
      },
      {
        "id": "txn_ghi789",
        "type": "PRIZE_WIN",
        "amount": 190.00,
        "gameId": "game_xyz789",
        "description": "Prize from winning Classic match",
        "status": "SUCCESS",
        "balanceBefore": 1250.00,
        "balanceAfter": 1440.00,
        "createdAt": "2024-01-01T12:00:00Z"
      }
    ],
    "summary": {
      "totalDeposits": 2500.00,
      "totalWithdrawals": 800.00,
      "totalGameStakes": 1450.00,
      "totalWinnings": 1900.00,
      "netBalance": 1250.00
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

---

### POST /wallet
Process deposits, withdrawals, and transfers.

**Deposit Request:**
```json
{
  "action": "deposit",
  "userId": "user_123",
  "amount": 500,
  "method": "UPI",
  "paymentDetails": {
    "upiId": "user@paytm"
  },
  "purpose": "GAMING"
}
```

**Deposit Response (200):**
```json
{
  "success": true,
  "message": "Deposit initiated successfully",
  "data": {
    "transactionId": "txn_new123",
    "gatewayReference": "rzp_987654321",
    "amount": 500,
    "fees": 0,
    "netAmount": 500,
    "status": "PROCESSING",
    "redirectUrl": "https://razorpay.com/payment/xyz123",
    "estimatedTime": "Instant to 2 minutes"
  }
}
```

**Withdrawal Request:**
```json
{
  "action": "withdraw",
  "userId": "user_123",
  "amount": 1000,
  "method": "UPI",
  "withdrawalDetails": {
    "upiId": "user@phonepe"
  }
}
```

**Withdrawal Response (200):**
```json
{
  "success": true,
  "message": "Withdrawal processed successfully",
  "data": {
    "transactionId": "txn_withdraw456",
    "amount": 1000,
    "fees": 5,
    "netAmount": 995,
    "status": "SUCCESS",
    "estimatedTime": "Within 30 minutes",
    "newBalance": 250.00
  }
}
```

**Error Responses:**
- `403 Forbidden` - Insufficient balance, KYC required, or limit exceeded
- `400 Bad Request` - Invalid payment method or amount

---

### PUT /wallet
Handle payment gateway webhooks for status updates.

**Webhook Request Body:**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_123456789",
        "amount": 50000,
        "status": "captured",
        "notes": {
          "transactionId": "txn_abc123",
          "userId": "user_123"
        }
      }
    }
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

## Profile Management Endpoints

### GET /profile
Get comprehensive user profile information.

**Query Parameters:**
- `userId`: User ID (required)
- `section`: Profile section (full, basic, stats, achievements, security)

**Full Profile Response (200):**
```json
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
      "dateOfBirth": "1995-06-15",
      "gender": "MALE",
      "city": "Mumbai",
      "state": "Maharashtra",
      "bio": "Professional Carrom player from Mumbai"
    },
    "gamingStats": {
      "gamesPlayed": 145,
      "gamesWon": 89,
      "winRate": 61.4,
      "skillRating": 1850,
      "favoriteMode": "CLASSIC",
      "totalEarnings": 15670,
      "currentStreak": 5,
      "longestStreak": 12,
      "averageGameTime": 480,
      "rank": 1247,
      "level": 18,
      "experience": 32400,
      "performance": {
        "accuracy": 78.5,
        "averageMoveTime": 8.2,
        "foulRate": 12.3,
        "queenSuccessRate": 65.0,
        "comebackWins": 8,
        "perfectGames": 3
      }
    },
    "achievements": [
      {
        "id": "first_win",
        "name": "First Victory",
        "description": "Won your first game",
        "icon": "🏆",
        "category": "Milestones",
        "rarity": "COMMON",
        "unlockedAt": "2024-01-01T10:30:00Z",
        "rewards": {
          "experience": 100,
          "coins": 50
        }
      }
    ],
    "preferences": {
      "gameMode": "CLASSIC",
      "notifications": true,
      "publicProfile": true,
      "language": "en",
      "autoMatch": true,
      "theme": "DARK",
      "soundEnabled": true
    },
    "security": {
      "twoFactorEnabled": false,
      "lastLogin": "2024-01-01T11:30:00Z",
      "loginDevices": [
        {
          "id": "device_123",
          "deviceName": "iPhone 12",
          "platform": "iOS",
          "location": "Mumbai, IN",
          "lastUsed": "2024-01-01T11:30:00Z",
          "isActive": true,
          "isTrusted": true
        }
      ],
      "kycStatus": "VERIFIED",
      "kycLevel": 2,
      "emailVerified": true,
      "mobileVerified": true
    },
    "social": {
      "friends": ["user_456", "user_789"],
      "following": ["user_pro1", "user_pro2"],
      "followers": ["user_fan1", "user_fan2", "user_fan3"],
      "blocked": [],
      "socialScore": 85,
      "reputation": 4.7
    },
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2024-01-01T12:00:00Z",
    "lastActive": "2024-01-01T11:30:00Z"
  }
}
```

---

### PUT /profile
Update user profile, submit KYC, or change security settings.

**Profile Update Request:**
```json
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
      "language": "hi",
      "theme": "DARK"
    }
  }
}
```

**KYC Document Submission:**
```json
{
  "action": "submit-kyc",
  "userId": "user_123",
  "documentType": "AADHAAR",
  "documentNumber": "123456789012",
  "documentImage": "https://example.com/documents/aadhaar.jpg",
  "selfieImage": "https://example.com/documents/selfie.jpg"
}
```

**KYC Response (200):**
```json
{
  "success": true,
  "message": "KYC document submitted for verification",
  "data": {
    "kycId": "kyc_abc123",
    "status": "PENDING",
    "estimatedVerificationTime": "24-48 hours",
    "requiredDocuments": ["AADHAAR", "PAN"],
    "submittedDocuments": ["AADHAAR"]
  }
}
```

**Security Update Request:**
```json
{
  "action": "update-security",
  "userId": "user_123",
  "securityAction": "CHANGE_PASSWORD",
  "data": {
    "currentPassword": "oldpassword123",
    "newPassword": "newsecurepass456"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "updatedFields": ["name", "city", "bio", "preferences"],
    "requiresVerification": false
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid data or missing required fields
- `403 Forbidden` - Insufficient permissions
- `409 Conflict` - Email or mobile already in use

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": {
    "code": "ERROR_CODE",
    "message": "Detailed error description",
    "details": {},
    "timestamp": "2024-01-01T12:30:00Z",
    "requestId": "req_abc123"
  },
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "VALIDATION_ERROR"
    }
  ]
}
```

### Error Codes

**Authentication Errors:**
- `AUTH_001`: Invalid credentials
- `AUTH_002`: User not found
- `AUTH_003`: User already exists
- `AUTH_004`: Invalid token
- `AUTH_005`: Token expired
- `AUTH_006`: Invalid OTP
- `AUTH_007`: OTP expired
- `AUTH_008`: Maximum attempts exceeded

**Game Errors:**
- `GAME_001`: Game not found
- `GAME_002`: Game room full
- `GAME_003`: Invalid move
- `GAME_004`: Not player's turn
- `GAME_005`: Game already started
- `GAME_006`: Insufficient stake amount

**Wallet Errors:**
- `WALLET_001`: Insufficient balance
- `WALLET_002`: Daily limit exceeded
- `WALLET_003`: Invalid amount
- `WALLET_004`: Payment gateway error
- `WALLET_005`: KYC verification required
- `WALLET_006`: Transaction failed

**Validation Errors:**
- `VAL_001`: Required field missing
- `VAL_002`: Invalid format
- `VAL_003`: Value out of range
- `VAL_004`: Invalid enum value

**Server Errors:**
- `SERVER_001`: Internal server error
- `SERVER_002`: Database connection failed
- `SERVER_003`: External service unavailable

---

## WebSocket Events

Real-time communication for live game updates.

**Connection URL:** `wss://carromarena.com/ws`

**Authentication:** Send JWT token in connection headers
```
Authorization: Bearer <access_token>
```

### Event Types

**Join Game Room:**
```json
{
  "type": "JOIN_GAME",
  "gameId": "game_abc123"
}
```

**Game Move Update:**
```json
{
  "type": "MOVE_UPDATE",
  "gameId": "game_abc123",
  "data": {
    "move": {
      "playerId": "user_123",
      "moveType": "STRIKE",
      "result": "SUCCESS"
    },
    "gameState": {
      "currentPlayer": "user_456",
      "score": { "user_123": 8, "user_456": 6 },
      "timeRemaining": 285
    }
  }
}
```

**Lobby Update:**
```json
{
  "type": "LOBBY_UPDATE",
  "data": {
    "totalPlayers": 1251,
    "activeRooms": 46,
    "newRoom": {
      "id": "room_new",
      "gameMode": "CLASSIC",
      "stakeAmount": 100
    }
  }
}
```

**Notification:**
```json
{
  "type": "NOTIFICATION",
  "data": {
    "type": "GAME_START",
    "title": "Game Starting!",
    "message": "Your match is about to begin",
    "gameId": "game_abc123"
  }
}
```

---

## SDKs and Libraries

### JavaScript/TypeScript SDK
```bash
npm install carromarena-js-sdk
```

```typescript
import { CarromArena } from 'carromarena-js-sdk';

const client = new CarromArena({
  baseUrl: 'https://carromarena.com/api',
  accessToken: 'your_jwt_token'
});

// Join lobby
const lobby = await client.game.joinLobby({
  gameMode: 'CLASSIC',
  stakeAmount: 100
});

// Get wallet balance
const balance = await client.wallet.getBalance();

// Real-time game updates
client.ws.onGameUpdate((update) => {
  console.log('Game update:', update);
});
```

### React Hooks
```bash
npm install @carromarena/react-hooks
```

```typescript
import { useAuth, useGame, useWallet } from '@carromarena/react-hooks';

function GameComponent() {
  const { user, login } = useAuth();
  const { lobby, joinGame } = useGame();
  const { balance, deposit } = useWallet();

  return (
    <div>
      <p>Balance: ₹{balance}</p>
      <button onClick={() => joinGame({ stakeAmount: 100 })}>
        Join Game
      </button>
    </div>
  );
}
```

---

## Postman Collection

Import the Postman collection for easy API testing:

```json
{
  "info": {
    "name": "Carrom Arena API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{accessToken}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://carromarena.com/api"
    },
    {
      "key": "accessToken",
      "value": "your_jwt_token_here"
    }
  ]
}
```

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- Authentication with OTP verification
- Game lobby and matchmaking
- Real-money wallet system
- Profile management
- Real-time game updates

### v1.1.0 (TBD)
- Tournament system
- Social features
- Advanced analytics
- Mobile app support
- Enhanced fraud detection

---

## Support

- **Email**: api-support@carromarena.com
- **Discord**: [Carrom Arena Developers](https://discord.gg/carromarena)
- **Documentation**: https://docs.carromarena.com
- **Status Page**: https://status.carromarena.com

For technical support, please include:
- Request ID from error response
- Timestamp of the issue
- Steps to reproduce
- Expected vs actual behavior