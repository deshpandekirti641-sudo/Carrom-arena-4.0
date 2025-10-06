/**
 * CARROM ARENA - Authentication Service
 * 
 * This service handles all authentication-related operations including:
 * - User registration and login
 * - OTP generation and verification
 * - JWT token management
 * - Session handling
 * - Password security
 */

import { z } from 'zod';

// Types for authentication
export interface AuthUser {
  id: string;
  email: string;
  mobile: string;
  name: string;
  userType: 'PLAYER' | 'DEVELOPER';
  isVerified: boolean;
  isActive: boolean;
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface OTPSession {
  sessionId: string;
  contact: string;
  otp: string;
  type: 'SMS' | 'EMAIL';
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

class AuthService {
  /**
   * REGISTRATION FLOW GUIDE
   * 
   * Complete user registration with OTP verification:
   * 1. Validate input data
   * 2. Check for existing users
   * 3. Generate and send OTP
   * 4. Create temporary user record
   * 5. Return session for verification
   */
  
  async registerUser(userData: {
    mobile: string;
    email: string;
    name: string;
    password: string;
    userType: 'PLAYER' | 'DEVELOPER';
    referralCode?: string;
  }) {
    try {
      // Validate input data
      const validatedData = this.validateRegistrationData(userData);
      
      // Check for existing users
      const existingUser = await this.checkExistingUser(validatedData.mobile, validatedData.email);
      if (existingUser) {
        throw new Error('User already exists with this mobile or email');
      }

      // Generate OTP for both SMS and Email
      const [smsOTP, emailOTP] = await Promise.all([
        this.generateAndSendSMSOTP(validatedData.mobile),
        this.generateAndSendEmailOTP(validatedData.email, validatedData.name)
      ]);

      // Create temporary user record
      const tempUser = await this.createTempUser({
        ...validatedData,
        password: await this.hashPassword(validatedData.password)
      });

      return {
        success: true,
        userId: tempUser.id,
        smsSessionId: smsOTP.sessionId,
        emailSessionId: emailOTP.sessionId,
        expiresAt: smsOTP.expiresAt,
        message: 'Registration initiated. Please verify OTP sent to your mobile and email.'
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(`Registration failed: ${error}`);
    }
  }

  /**
   * LOGIN FLOW GUIDE
   * 
   * User authentication with multiple methods:
   * 1. Validate credentials
   * 2. Check user status
   * 3. Generate tokens
   * 4. Create session
   * 5. Return auth data
   */

  async loginUser(credentials: {
    identifier: string; // mobile or email
    password: string;
    twoFactorCode?: string;
  }): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      // Find user by mobile or email
      const user = await this.findUserByIdentifier(credentials.identifier);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const passwordValid = await this.verifyPassword(credentials.password, user.password);
      if (!passwordValid) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active and verified
      if (!user.isActive || !user.isVerified) {
        throw new Error('Account not verified or deactivated');
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled && !credentials.twoFactorCode) {
        throw new Error('2FA code required');
      }

      if (user.twoFactorEnabled && credentials.twoFactorCode) {
        const twoFactorValid = await this.verify2FACode(user.id, credentials.twoFactorCode);
        if (!twoFactorValid) {
          throw new Error('Invalid 2FA code');
        }
      }

      // Generate authentication tokens
      const tokens = await this.generateAuthTokens(user);

      // Create login session
      await this.createLoginSession(user.id, tokens);

      // Update last login
      await this.updateLastLogin(user.id);

      return {
        user: this.sanitizeUser(user),
        tokens
      };

    } catch (error) {
      console.error('Login error:', error);
      throw new Error(`Login failed: ${error}`);
    }
  }

  /**
   * OTP VERIFICATION GUIDE
   * 
   * Verify OTP and complete registration/login:
   */

  async verifyOTP(sessionId: string, otp: string, type: 'SMS' | 'EMAIL'): Promise<boolean> {
    try {
      // Retrieve OTP session
      const session = await this.getOTPSession(sessionId);
      if (!session || session.expiresAt < new Date()) {
        throw new Error('OTP session expired or invalid');
      }

      // Check attempts limit
      if (session.attempts >= 3) {
        throw new Error('Maximum OTP attempts exceeded');
      }

      // Verify OTP
      if (session.otp !== otp) {
        await this.incrementOTPAttempts(sessionId);
        throw new Error('Invalid OTP');
      }

      // Mark OTP as verified
      await this.markOTPVerified(sessionId);

      return true;

    } catch (error) {
      console.error('OTP verification error:', error);
      throw new Error(`OTP verification failed: ${error}`);
    }
  }

  /**
   * TOKEN MANAGEMENT GUIDE
   * 
   * JWT token operations:
   */

  async generateAuthTokens(user: AuthUser): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      email: user.email,
      mobile: user.mobile,
      userType: user.userType
    };

    const accessToken = await this.signJWT(payload, '1h'); // 1 hour
    const refreshToken = await this.signJWT({ userId: user.id }, '30d'); // 30 days

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    };
  }

  async refreshAuthTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = await this.verifyJWT(refreshToken);
      if (!payload.userId) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await this.getUserById(payload.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      return await this.generateAuthTokens(user);

    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error(`Token refresh failed: ${error}`);
    }
  }

  /**
   * PASSWORD SECURITY GUIDE
   * 
   * Secure password handling:
   */

  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hashedPassword);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const currentValid = await this.verifyPassword(currentPassword, user.password);
      if (!currentValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await this.updateUserPassword(userId, hashedNewPassword);

      // Invalidate all existing sessions
      await this.invalidateAllUserSessions(userId);

      return true;

    } catch (error) {
      console.error('Password change error:', error);
      throw new Error(`Password change failed: ${error}`);
    }
  }

  /**
   * SESSION MANAGEMENT GUIDE
   * 
   * User session handling:
   */

  async createLoginSession(userId: string, tokens: AuthTokens) {
    const session = {
      id: this.generateSessionId(),
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      createdAt: new Date(),
      expiresAt: tokens.expiresAt,
      isActive: true,
      deviceInfo: this.getDeviceInfo(),
      ipAddress: this.getClientIP()
    };

    await this.storeSession(session);
    return session;
  }

  async validateSession(token: string): Promise<AuthUser | null> {
    try {
      // Verify JWT token
      const payload = await this.verifyJWT(token);
      if (!payload.userId) {
        return null;
      }

      // Check session exists and is active
      const session = await this.getActiveSession(payload.userId, token);
      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      // Get user data
      const user = await this.getUserById(payload.userId);
      return user && user.isActive ? this.sanitizeUser(user) : null;

    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * OTP GENERATION GUIDE
   * 
   * SMS and Email OTP handling:
   */

  async generateAndSendSMSOTP(mobile: string): Promise<{ sessionId: string; expiresAt: Date }> {
    const otp = this.generateOTP();
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP session
    await this.storeOTPSession({
      sessionId,
      contact: mobile,
      otp,
      type: 'SMS',
      expiresAt,
      attempts: 0,
      verified: false
    });

    // Send SMS via DataGenIt API
    await this.sendSMSViaDatGenIt(mobile, otp);

    return { sessionId, expiresAt };
  }

  async generateAndSendEmailOTP(email: string, name: string): Promise<{ sessionId: string; expiresAt: Date }> {
    const otp = this.generateOTP();
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP session
    await this.storeOTPSession({
      sessionId,
      contact: email,
      otp,
      type: 'EMAIL',
      expiresAt,
      attempts: 0,
      verified: false
    });

    // Send Email via GetOTP API
    await this.sendEmailViaGetOTP(email, name, otp);

    return { sessionId, expiresAt };
  }

  /**
   * UTILITY FUNCTIONS
   */

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private sanitizeUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      name: user.name,
      userType: user.userType,
      isVerified: user.isVerified,
      isActive: user.isActive,
      kycStatus: user.kycStatus
    };
  }

  private validateRegistrationData(data: any) {
    const schema = z.object({
      mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
      email: z.string().email('Invalid email address'),
      name: z.string().min(2, 'Name must be at least 2 characters'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      userType: z.enum(['PLAYER', 'DEVELOPER']),
      referralCode: z.string().optional()
    });

    return schema.parse(data);
  }

  // External API Integration Methods
  private async sendSMSViaDatGenIt(mobile: string, otp: string) {
    // Implementation for DataGenIt API
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
          templateId: 'CARROM_OTP_TEMPLATE'
        }
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error('Failed to send SMS OTP');
    }
  }

  private async sendEmailViaGetOTP(email: string, name: string, otp: string) {
    // Implementation for GetOTP API
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: 'https',
        origin: 'api.getotp.com',
        path: '/email/send',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GETOTP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: {
          email: email,
          subject: 'Carrom Arena - Verify Your Account',
          template: 'otp_verification',
          data: { name, otp, appName: 'Carrom Arena' }
        }
      })
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error('Failed to send Email OTP');
    }
  }

  // Database operation placeholders - implement based on your database
  private async checkExistingUser(mobile: string, email: string) { return null; }
  private async createTempUser(userData: any) { return { id: 'user_temp_123' }; }
  private async findUserByIdentifier(identifier: string) { return null; }
  private async getUserById(id: string) { return null; }
  private async storeOTPSession(session: OTPSession) { /* Store in Redis/DB */ }
  private async getOTPSession(sessionId: string) { return null; }
  private async incrementOTPAttempts(sessionId: string) { /* Update attempts */ }
  private async markOTPVerified(sessionId: string) { /* Mark verified */ }
  private async signJWT(payload: any, expiresIn: string) { return 'jwt_token'; }
  private async verifyJWT(token: string) { return { userId: '123' }; }
  private async updateUserPassword(userId: string, hashedPassword: string) { /* Update password */ }
  private async invalidateAllUserSessions(userId: string) { /* Invalidate sessions */ }
  private async storeSession(session: any) { /* Store session */ }
  private async getActiveSession(userId: string, token: string) { return null; }
  private async updateLastLogin(userId: string) { /* Update last login */ }
  private async verify2FACode(userId: string, code: string) { return true; }
  private getDeviceInfo() { return 'device_info'; }
  private getClientIP() { return '0.0.0.0'; }
}

export const authService = new AuthService();