/**
 * CARROM ARENA - API Types
 * 
 * This file contains all TypeScript interfaces and types for API requests
 * and responses across the entire Carrom Arena application.
 * 
 * Categories:
 * - Authentication Types
 * - Game Types
 * - Wallet Types
 * - Profile Types
 * - Common Response Types
 */

// =============================================================================
// COMMON API TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  timestamp?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  meta: PaginationMeta;
}

// =============================================================================
// AUTHENTICATION API TYPES
// =============================================================================

// Registration Types
export interface RegisterRequest {
  mobile: string;
  email: string;
  name: string;
  password: string;
  userType: 'PLAYER' | 'DEVELOPER';
  referralCode?: string;
}

export interface RegisterResponse {
  userId: string;
  smsSessionId: string;
  emailSessionId: string;
  expiresAt: string;
  walletId: string;
  nextStep: 'VERIFY_OTP';
  verification: {
    smsRequired: boolean;
    emailRequired: boolean;
    timeLimit: string;
  };
}

// Login Types
export interface LoginRequest {
  identifier: string; // mobile or email
  password: string;
  twoFactorCode?: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface LoginResponse {
  user: AuthenticatedUser;
  tokens: AuthTokens;
  session: {
    sessionId: string;
    expiresAt: string;
    deviceId: string;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  mobile: string;
  name: string;
  avatar?: string;
  userType: 'PLAYER' | 'DEVELOPER';
  isVerified: boolean;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  walletBalance: number;
  skillLevel: string;
  rank: number;
  createdAt: string;
  lastActive: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  scope: string[];
}

// OTP Types
export interface OTPVerificationRequest {
  sessionId: string;
  otp: string;
  type: 'SMS' | 'EMAIL';
}

export interface OTPVerificationResponse {
  verified: boolean;
  nextStep: 'COMPLETE_REGISTRATION' | 'LOGIN_SUCCESS';
  user?: AuthenticatedUser;
  tokens?: AuthTokens;
}

// Password Types
export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  identifier: string; // email or mobile
  resetCode?: string;
  newPassword?: string;
}

// =============================================================================
// GAME API TYPES
// =============================================================================

// Game Creation Types
export interface CreateGameRequest {
  hostId: string;
  roomName?: string;
  gameMode: 'CLASSIC' | 'BLITZ' | 'TOURNAMENT';
  stakeAmount: number;
  isPrivate: boolean;
  maxPlayers: number;
  timeLimit: number; // in minutes
  customRules?: GameRules;
}

export interface GameRules {
  allowUndo: boolean;
  timePerTurn: number;
  penaltyForTimeout: boolean;
  queenMandatory: boolean;
}

export interface CreateGameResponse {
  gameId: string;
  roomId: string;
  roomCode: string;
  shareUrl: string;
  game: GameDetails;
}

// Game Lobby Types
export interface JoinLobbyRequest {
  userId: string;
  gameMode: 'CLASSIC' | 'BLITZ' | 'TOURNAMENT';
  stakeAmount: number;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
  preferredOpponent?: string;
  autoMatch: boolean;
}

export interface LobbyStatus {
  rooms: GameRoom[];
  waitingPlayers: LobbyPlayer[];
  statistics: LobbyStats;
  recommendations: GameRecommendation[];
  filters: {
    gameMode: string;
    skillLevel: string;
    stakeRange: string;
  };
  lastUpdated: string;
}

export interface GameRoom {
  id: string;
  name: string;
  host: LobbyPlayer;
  players: LobbyPlayer[];
  gameMode: string;
  stakeAmount: number;
  prizePool: number;
  status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED';
  isPrivate: boolean;
  maxPlayers: number;
  timeLimit: number;
  createdAt: string;
  canJoin: boolean;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  avatar?: string;
  skillLevel: string;
  winRate: number;
  gamesPlayed: number;
  currentStake: number;
  status: 'WAITING' | 'IN_GAME' | 'READY';
  joinedAt: string;
  region: string;
  isOnline: boolean;
}

export interface LobbyStats {
  totalPlayers: number;
  activeRooms: number;
  totalPrizePool: number;
  averageWaitTime: number;
  popularGameMode: string;
  peakHours: string[];
}

export interface GameRecommendation {
  type: 'QUICK_MATCH' | 'SIMILAR_SKILL' | 'POPULAR_STAKE';
  title: string;
  description: string;
  gameMode: string;
  stakeAmount: number;
  estimatedWaitTime: number;
  matchQuality: number;
}

// Game State Types
export interface GameDetails {
  id: string;
  roomId: string;
  gameMode: string;
  players: GamePlayerDetails[];
  stakeAmount: number;
  prizePool: number;
  status: 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  gameState: GameState;
  rules: GameRules;
  startTime?: string;
  endTime?: string;
  winner?: string;
  totalMoves: number;
  createdAt: string;
}

export interface GamePlayerDetails {
  userId: string;
  name: string;
  avatar?: string;
  skillLevel: string;
  coins: string[];
  score: number;
  isReady: boolean;
  isActive: boolean;
  turnTimeRemaining: number;
  fouls: number;
  joinedAt: string;
}

export interface GameState {
  currentPlayer: string;
  turnNumber: number;
  board: BoardState;
  gamePhase: 'PLACEMENT' | 'PLAYING' | 'FINISHED';
  timeRemaining: number;
  lastMoveAt: string;
  moveHistory: GameMove[];
}

export interface BoardState {
  striker: Position;
  coins: CoinState[];
  pockets: Pocket[];
  dimensions: {
    width: number;
    height: number;
  };
}

export interface Position {
  x: number;
  y: number;
}

export interface CoinState {
  id: string;
  type: 'WHITE' | 'BLACK' | 'QUEEN';
  position: Position;
  owner?: string;
  isPocketed: boolean;
  velocity?: {
    x: number;
    y: number;
  };
}

export interface Pocket {
  id: string;
  position: Position;
  radius: number;
}

// Game Move Types
export interface GameMoveRequest {
  gameId: string;
  playerId: string;
  moveType: 'STRIKE' | 'POSITION' | 'FOUL' | 'TIMEOUT' | 'FORFEIT';
  moveData: {
    strikerPosition: Position;
    targetCoins?: string[];
    force: number; // 0-100
    angle: number; // 0-360
  };
  timestamp: string;
  gameState: GameState;
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  moveNumber: number;
  moveType: string;
  moveData: {
    strikerPosition: Position;
    targetCoins: string[];
    force: number;
    angle: number;
    result: 'SUCCESS' | 'MISS' | 'FOUL' | 'QUEEN_COVERED' | 'GAME_WON';
    coinsScored?: string[];
    foulType?: string;
  };
  gameState: GameState;
  timestamp: string;
  processingTime: number;
  validMove: boolean;
  fraudScore: number;
}

export interface GameMoveResponse {
  moveId: string;
  moveNumber: number;
  fraudScore: number;
  gameStatus: {
    status: string;
    currentPlayer: string;
    score: Record<string, number>;
  };
  nextPlayer: string;
  validMove: boolean;
}

// =============================================================================
// WALLET API TYPES
// =============================================================================

// Wallet Balance Types
export interface WalletBalanceResponse {
  userId: string;
  walletId: string;
  walletType: 'PLAYER_WALLET' | 'DEVELOPER_WALLET';
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  currency: 'INR';
  limits: WalletLimits;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  lastUpdated: string;
}

export interface WalletLimits {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  kycLimit: number;
  singleTransactionLimit: number;
}

// Transaction Types
export interface DepositRequest {
  userId: string;
  amount: number;
  method: 'UPI' | 'NETBANKING' | 'CARD';
  paymentDetails: {
    upiId?: string;
    bankAccount?: string;
    cardLast4?: string;
  };
  purpose: 'GAMING' | 'TOURNAMENT' | 'RELOAD';
}

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  method: 'UPI' | 'BANK_TRANSFER';
  withdrawalDetails: {
    upiId?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
  };
  purpose?: string;
}

export interface TransactionResponse {
  transactionId: string;
  gatewayReference?: string;
  amount: number;
  fees: number;
  netAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  redirectUrl?: string;
  estimatedTime?: string;
}

export interface TransactionHistory {
  transactions: WalletTransaction[];
  summary: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalGameStakes: number;
    totalWinnings: number;
    netBalance: number;
  };
  filters: {
    dateRange: string;
    type: string;
    status: string;
  };
  pagination: PaginationMeta;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'GAME_STAKE' | 'PRIZE_WIN';
  amount: number;
  currency: 'INR';
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  method: string;
  reference: string;
  gameId?: string;
  description: string;
  fees: number;
  tax: number;
  netAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  processedAt?: string;
  failureReason?: string;
}

// =============================================================================
// PROFILE API TYPES
// =============================================================================

// Profile Types
export interface UserProfile {
  id: string;
  userType: 'PLAYER' | 'DEVELOPER';
  personalInfo: PersonalInfo;
  gamingStats: GamingStatistics;
  achievements: Achievement[];
  preferences: UserPreferences;
  security: SecurityInfo;
  social: SocialInfo;
  developerInfo?: DeveloperInfo;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
}

export interface PersonalInfo {
  name: string;
  email: string;
  mobile: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  city?: string;
  state?: string;
  bio?: string;
}

export interface GamingStatistics {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  skillRating: number;
  favoriteMode: string;
  totalEarnings: number;
  currentStreak: number;
  longestStreak: number;
  averageGameTime: number;
  rank: number;
  level: number;
  experience: number;
  performance: {
    accuracy: number;
    averageMoveTime: number;
    foulRate: number;
    queenSuccessRate: number;
    comebackWins: number;
    perfectGames: number;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  progress?: number;
  maxProgress?: number;
  unlockedAt?: string;
  rewards?: {
    experience: number;
    coins: number;
    badge?: string;
  };
}

export interface UserPreferences {
  gameMode: string;
  notifications: boolean;
  publicProfile: boolean;
  language: 'en' | 'hi' | 'ta' | 'te' | 'bn';
  autoMatch: boolean;
  friendRequests: boolean;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export interface SecurityInfo {
  twoFactorEnabled: boolean;
  lastLogin: string;
  loginDevices: LoginDevice[];
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  kycLevel: number;
  emailVerified: boolean;
  mobileVerified: boolean;
  suspiciousActivity: boolean;
  accountLocked: boolean;
}

export interface LoginDevice {
  id: string;
  deviceName: string;
  platform: string;
  location: string;
  lastUsed: string;
  isActive: boolean;
  isTrusted: boolean;
}

export interface SocialInfo {
  friends: string[];
  following: string[];
  followers: string[];
  blocked: string[];
  friendRequests: FriendRequest[];
  socialScore: number;
  reputation: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  sentAt: string;
}

export interface DeveloperInfo {
  apiKey: string;
  appCount: number;
  totalRevenue: number;
  developerLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  permissions: string[];
  apiUsage: {
    current: number;
    limit: number;
    resetDate: string;
  };
  webhookUrl?: string;
}

// Profile Update Types
export interface UpdateProfileRequest {
  userId: string;
  updates: Partial<PersonalInfo & UserPreferences>;
}

export interface KYCDocumentRequest {
  userId: string;
  documentType: 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'PASSPORT' | 'DRIVING_LICENSE';
  documentNumber: string;
  documentImage: string; // URL or base64
  selfieImage: string; // URL or base64
}

export interface KYCDocumentResponse {
  kycId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  estimatedVerificationTime: string;
  requiredDocuments: string[];
  submittedDocuments: string[];
}

// =============================================================================
// PLAY LOGS API TYPES
// =============================================================================

export interface PlayLogRequest {
  gameId: string;
  playerId: string;
  action: 'player-stats' | 'match-history' | 'game-moves' | 'leaderboard' | 'fraud-report';
  filters?: {
    timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
    gameMode: 'CLASSIC' | 'BLITZ' | 'TOURNAMENT' | 'ALL';
    limit: number;
    offset: number;
  };
}

export interface PlayerStatistics {
  playerId: string;
  timeframe: string;
  stats: GamingStatistics;
  recentMatches: MatchResult[];
  achievements: string[];
  fraudAlerts: number;
  lastUpdated: string;
}

export interface MatchResult {
  id: string;
  gameId: string;
  players: MatchPlayer[];
  gameMode: string;
  stakeAmount: number;
  prizePool: number;
  duration: number; // seconds
  totalMoves: number;
  startTime: string;
  endTime: string;
  winner: string;
  endReason: 'NORMAL' | 'FORFEIT' | 'TIMEOUT' | 'TECHNICAL';
}

export interface MatchPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
  earnings: number;
  winStreak: number;
  performance: {
    accuracy: number;
    avgMoveTime: number;
    fouls: number;
    strategicMoves: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatar?: string;
  skillRating: number;
  gamesPlayed: number;
  winRate: number;
  totalEarnings: number;
  currentStreak: number;
  badgesCount: number;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface NotificationResponse {
  id: string;
  userId: string;
  type: 'GAME_INVITE' | 'GAME_START' | 'MOVE_REMINDER' | 'GAME_END' | 'PAYMENT' | 'ACHIEVEMENT';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

// =============================================================================
// WEBSOCKET MESSAGE TYPES
// =============================================================================

export interface WebSocketMessage {
  type: 'GAME_UPDATE' | 'LOBBY_UPDATE' | 'MOVE_UPDATE' | 'CHAT_MESSAGE' | 'NOTIFICATION';
  gameId?: string;
  playerId?: string;
  data: any;
  timestamp: string;
}

export interface GameUpdateMessage extends WebSocketMessage {
  type: 'GAME_UPDATE';
  data: {
    gameState: GameState;
    lastMove?: GameMove;
    currentPlayer: string;
    timeRemaining: number;
  };
}

export interface LobbyUpdateMessage extends WebSocketMessage {
  type: 'LOBBY_UPDATE';
  data: {
    rooms: GameRoom[];
    playerCount: number;
    newRoom?: GameRoom;
    removedRoom?: string;
  };
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  errors?: ValidationError[];
}

// Common Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  INVALID_CREDENTIALS: 'AUTH_001',
  USER_NOT_FOUND: 'AUTH_002',
  USER_ALREADY_EXISTS: 'AUTH_003',
  INVALID_TOKEN: 'AUTH_004',
  TOKEN_EXPIRED: 'AUTH_005',
  OTP_INVALID: 'AUTH_006',
  OTP_EXPIRED: 'AUTH_007',

  // Game Errors
  GAME_NOT_FOUND: 'GAME_001',
  GAME_FULL: 'GAME_002',
  INVALID_MOVE: 'GAME_003',
  NOT_PLAYER_TURN: 'GAME_004',
  GAME_ALREADY_STARTED: 'GAME_005',

  // Wallet Errors
  INSUFFICIENT_BALANCE: 'WALLET_001',
  DAILY_LIMIT_EXCEEDED: 'WALLET_002',
  INVALID_AMOUNT: 'WALLET_003',
  PAYMENT_FAILED: 'WALLET_004',
  KYC_REQUIRED: 'WALLET_005',

  // General Errors
  VALIDATION_ERROR: 'VALIDATION_001',
  SERVER_ERROR: 'SERVER_001',
  RATE_LIMIT_EXCEEDED: 'RATE_001'
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;