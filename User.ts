/**
 * CARROM ARENA - User Data Model
 * 
 * This file defines the User data model and related database operations.
 * It serves as a guide for implementing user management with any database
 * (MongoDB, PostgreSQL, MySQL, etc.).
 * 
 * Features:
 * - User schema definition
 * - Database operations (CRUD)
 * - Validation methods
 * - Data relationships
 * - Security helpers
 */

import { z } from 'zod';

// =============================================================================
// USER SCHEMA AND VALIDATION
// =============================================================================

// User validation schema
export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userType: z.enum(['PLAYER', 'DEVELOPER']),
  avatar: z.string().url('Invalid avatar URL').optional(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  city: z.string().min(2, 'City required').optional(),
  state: z.string().min(2, 'State required').optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  referralCode: z.string().optional(),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  mobileVerified: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  kycStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).default('PENDING'),
  kycLevel: z.number().min(0).max(3).default(0),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO']).default('BEGINNER'),
  skillRating: z.number().min(0).max(3000).default(1200),
  level: z.number().min(1).default(1),
  experience: z.number().min(0).default(0),
  rank: z.number().min(1).optional(),
  preferences: z.object({
    gameMode: z.enum(['CLASSIC', 'BLITZ', 'TOURNAMENT']).default('CLASSIC'),
    notifications: z.boolean().default(true),
    publicProfile: z.boolean().default(true),
    language: z.enum(['en', 'hi', 'ta', 'te', 'bn']).default('en'),
    autoMatch: z.boolean().default(true),
    friendRequests: z.boolean().default(true),
    theme: z.enum(['LIGHT', 'DARK', 'AUTO']).default('AUTO'),
    soundEnabled: z.boolean().default(true),
    musicEnabled: z.boolean().default(true)
  }).default({}),
  lastLogin: z.date().optional(),
  lastActive: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type User = z.infer<typeof UserSchema>;

// User creation schema (excludes auto-generated fields)
export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  lastActive: true,
  rank: true
});

export type CreateUserData = z.infer<typeof CreateUserSchema>;

// User update schema (makes all fields optional except id)
export const UpdateUserSchema = UserSchema.partial().extend({
  id: z.string().min(1, 'User ID is required')
});

export type UpdateUserData = z.infer<typeof UpdateUserSchema>;

// =============================================================================
// USER MODEL CLASS
// =============================================================================

/**
 * User Model Class
 * 
 * This class provides a comprehensive interface for user management.
 * Implement the database-specific methods based on your chosen database.
 */
export class UserModel {
  
  /**
   * CREATE USER GUIDE
   * 
   * Create a new user record with validation:
   * 1. Validate input data
   * 2. Check for duplicates
   * 3. Hash password
   * 4. Generate user ID
   * 5. Save to database
   * 6. Return created user
   */
  
  static async create(userData: CreateUserData): Promise<User> {
    try {
      // Validate input data
      const validatedData = CreateUserSchema.parse(userData);
      
      // Check for existing user
      const existingUser = await this.findByEmailOrMobile(
        validatedData.email,
        validatedData.mobile
      );
      
      if (existingUser) {
        throw new Error('User already exists with this email or mobile number');
      }

      // Generate unique user ID
      const userId = this.generateUserId();
      
      // Hash password
      const hashedPassword = await this.hashPassword(validatedData.password);
      
      // Create user object
      const newUser: User = {
        ...validatedData,
        id: userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.saveUserToDatabase(newUser);
      
      // Create associated wallet
      await this.createUserWallet(userId, validatedData.userType);
      
      // Initialize user statistics
      await this.initializeUserStats(userId);
      
      // Return user without password
      return this.sanitizeUser(newUser);
      
    } catch (error) {
      console.error('User creation error:', error);
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  /**
   * FIND USER GUIDE
   * 
   * Various methods to find users:
   */
  
  static async findById(userId: string): Promise<User | null> {
    try {
      const user = await this.getUserFromDatabase({ id: userId });
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Find user by ID error:', error);
      return null;
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.getUserFromDatabase({ email: email.toLowerCase() });
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Find user by email error:', error);
      return null;
    }
  }

  static async findByMobile(mobile: string): Promise<User | null> {
    try {
      const user = await this.getUserFromDatabase({ mobile });
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Find user by mobile error:', error);
      return null;
    }
  }

  static async findByEmailOrMobile(email: string, mobile: string): Promise<User | null> {
    try {
      const user = await this.getUserFromDatabase({
        $or: [{ email: email.toLowerCase() }, { mobile }]
      });
      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Find user by email or mobile error:', error);
      return null;
    }
  }

  /**
   * UPDATE USER GUIDE
   * 
   * Update user information with validation:
   * 1. Validate update data
   * 2. Check permissions
   * 3. Handle special fields
   * 4. Update database
   * 5. Return updated user
   */
  
  static async update(userId: string, updateData: Partial<UpdateUserData>): Promise<User | null> {
    try {
      // Validate update data
      const validatedData = UpdateUserSchema.parse({ id: userId, ...updateData });
      
      // Get current user
      const currentUser = await this.findById(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Handle password update separately
      if (validatedData.password) {
        validatedData.password = await this.hashPassword(validatedData.password);
      }

      // Handle email/mobile change verification reset
      if (validatedData.email && validatedData.email !== currentUser.email) {
        validatedData.emailVerified = false;
      }
      if (validatedData.mobile && validatedData.mobile !== currentUser.mobile) {
        validatedData.mobileVerified = false;
      }

      // Set updated timestamp
      validatedData.updatedAt = new Date();

      // Update in database
      const updatedUser = await this.updateUserInDatabase(userId, validatedData);
      
      return updatedUser ? this.sanitizeUser(updatedUser) : null;
      
    } catch (error) {
      console.error('User update error:', error);
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  /**
   * USER AUTHENTICATION GUIDE
   * 
   * Authentication-related methods:
   */
  
  static async authenticate(identifier: string, password: string): Promise<User | null> {
    try {
      // Find user by email or mobile
      const user = await this.getUserFromDatabase({
        $or: [
          { email: identifier.toLowerCase() },
          { mobile: identifier }
        ]
      });

      if (!user) {
        return null;
      }

      // Verify password
      const passwordValid = await this.verifyPassword(password, user.password);
      if (!passwordValid) {
        return null;
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Update last login
      await this.updateLastLogin(user.id);

      return this.sanitizeUser(user);
      
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get user with password
      const user = await this.getUserFromDatabase({ id: userId }, true);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const currentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!currentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await this.updateUserInDatabase(userId, {
        password: hashedNewPassword,
        updatedAt: new Date()
      });

      return true;
      
    } catch (error) {
      console.error('Password change error:', error);
      throw new Error(`Failed to change password: ${error}`);
    }
  }

  /**
   * USER STATISTICS GUIDE
   * 
   * Methods for managing user gaming statistics:
   */
  
  static async updateGameStats(userId: string, gameResult: {
    won: boolean;
    gameMode: string;
    duration: number;
    earnedAmount: number;
    skillRatingChange: number;
  }): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate new statistics
      const updates: Partial<User> = {
        skillRating: Math.max(0, Math.min(3000, user.skillRating + gameResult.skillRatingChange)),
        updatedAt: new Date()
      };

      // Update skill level based on rating
      if (updates.skillRating) {
        updates.skillLevel = this.calculateSkillLevel(updates.skillRating);
      }

      // Update level and experience
      const experienceGained = gameResult.won ? 100 : 50;
      updates.experience = user.experience + experienceGained;
      updates.level = this.calculateLevel(updates.experience);

      await this.updateUserInDatabase(userId, updates);
      
    } catch (error) {
      console.error('Update game stats error:', error);
      throw new Error(`Failed to update game statistics: ${error}`);
    }
  }

  static async updateUserRank(userId: string, newRank: number): Promise<void> {
    try {
      await this.updateUserInDatabase(userId, {
        rank: newRank,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Update user rank error:', error);
      throw new Error(`Failed to update user rank: ${error}`);
    }
  }

  /**
   * USER VERIFICATION GUIDE
   * 
   * Methods for handling user verification:
   */
  
  static async verifyEmail(userId: string): Promise<boolean> {
    try {
      await this.updateUserInDatabase(userId, {
        emailVerified: true,
        updatedAt: new Date()
      });
      
      // Check if user is fully verified
      await this.checkFullVerification(userId);
      
      return true;
    } catch (error) {
      console.error('Email verification error:', error);
      return false;
    }
  }

  static async verifyMobile(userId: string): Promise<boolean> {
    try {
      await this.updateUserInDatabase(userId, {
        mobileVerified: true,
        updatedAt: new Date()
      });
      
      // Check if user is fully verified
      await this.checkFullVerification(userId);
      
      return true;
    } catch (error) {
      console.error('Mobile verification error:', error);
      return false;
    }
  }

  static async updateKYCStatus(userId: string, status: 'PENDING' | 'VERIFIED' | 'REJECTED', level: number = 0): Promise<void> {
    try {
      await this.updateUserInDatabase(userId, {
        kycStatus: status,
        kycLevel: level,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('KYC status update error:', error);
      throw new Error(`Failed to update KYC status: ${error}`);
    }
  }

  /**
   * USER SEARCH AND LISTING GUIDE
   * 
   * Methods for searching and listing users:
   */
  
  static async searchUsers(query: {
    search?: string;
    userType?: 'PLAYER' | 'DEVELOPER';
    skillLevel?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    try {
      const filters: any = {};
      
      // Build search filters
      if (query.search) {
        filters.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } }
        ];
      }
      
      if (query.userType) {
        filters.userType = query.userType;
      }
      
      if (query.skillLevel) {
        filters.skillLevel = query.skillLevel;
      }
      
      if (query.isActive !== undefined) {
        filters.isActive = query.isActive;
      }

      const users = await this.searchUsersInDatabase(filters, {
        limit: query.limit || 20,
        offset: query.offset || 0,
        sortBy: 'skillRating',
        sortOrder: 'desc'
      });

      const total = await this.countUsersInDatabase(filters);

      return {
        users: users.map(user => this.sanitizeUser(user)),
        total
      };
      
    } catch (error) {
      console.error('User search error:', error);
      throw new Error(`Failed to search users: ${error}`);
    }
  }

  static async getLeaderboard(options: {
    gameMode?: string;
    timeframe?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
    limit?: number;
  } = {}): Promise<User[]> {
    try {
      const filters: any = { isActive: true };
      
      // Add time-based filtering if needed
      if (options.timeframe && options.timeframe !== 'ALL_TIME') {
        const timeFilter = this.getTimeFilter(options.timeframe);
        filters.lastActive = { $gte: timeFilter };
      }

      const users = await this.searchUsersInDatabase(filters, {
        limit: options.limit || 100,
        offset: 0,
        sortBy: 'skillRating',
        sortOrder: 'desc'
      });

      return users.map((user, index) => ({
        ...this.sanitizeUser(user),
        rank: index + 1
      }));
      
    } catch (error) {
      console.error('Leaderboard error:', error);
      throw new Error(`Failed to get leaderboard: ${error}`);
    }
  }

  /**
   * UTILITY METHODS
   */
  
  private static generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private static async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 12);
  }

  private static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hashedPassword);
  }

  private static sanitizeUser(user: any): User {
    // Remove password from user object
    const { password, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }

  private static calculateSkillLevel(rating: number): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO' {
    if (rating < 800) return 'BEGINNER';
    if (rating < 1400) return 'INTERMEDIATE';
    if (rating < 2000) return 'ADVANCED';
    return 'PRO';
  }

  private static calculateLevel(experience: number): number {
    return Math.floor(Math.sqrt(experience / 100)) + 1;
  }

  private static async checkFullVerification(userId: string): Promise<void> {
    const user = await this.getUserFromDatabase({ id: userId });
    if (user && user.emailVerified && user.mobileVerified && !user.isVerified) {
      await this.updateUserInDatabase(userId, {
        isVerified: true,
        updatedAt: new Date()
      });
    }
  }

  private static async updateLastLogin(userId: string): Promise<void> {
    await this.updateUserInDatabase(userId, {
      lastLogin: new Date(),
      lastActive: new Date(),
      updatedAt: new Date()
    });
  }

  private static getTimeFilter(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'DAILY':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  }

  // Database operation placeholders - implement based on your database system
  private static async saveUserToDatabase(user: User): Promise<void> {
    // Implement based on your database (MongoDB, PostgreSQL, etc.)
    console.log('Saving user to database:', user.id);
  }

  private static async getUserFromDatabase(query: any, includePassword: boolean = false): Promise<any> {
    // Implement based on your database
    console.log('Getting user from database:', query);
    return null;
  }

  private static async updateUserInDatabase(userId: string, updates: any): Promise<any> {
    // Implement based on your database
    console.log('Updating user in database:', userId, updates);
    return null;
  }

  private static async searchUsersInDatabase(filters: any, options: any): Promise<any[]> {
    // Implement based on your database
    console.log('Searching users in database:', filters, options);
    return [];
  }

  private static async countUsersInDatabase(filters: any): Promise<number> {
    // Implement based on your database
    console.log('Counting users in database:', filters);
    return 0;
  }

  private static async createUserWallet(userId: string, userType: string): Promise<void> {
    // Create associated wallet - implement based on your wallet system
    console.log('Creating wallet for user:', userId, userType);
  }

  private static async initializeUserStats(userId: string): Promise<void> {
    // Initialize user statistics - implement based on your stats system
    console.log('Initializing stats for user:', userId);
  }

  /**
   * DELETE USER GUIDE
   * 
   * Soft delete user (recommended) or hard delete:
   */
  
  static async deactivateUser(userId: string, reason?: string): Promise<boolean> {
    try {
      await this.updateUserInDatabase(userId, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Log deactivation reason
      if (reason) {
        console.log(`User ${userId} deactivated: ${reason}`);
      }
      
      return true;
    } catch (error) {
      console.error('User deactivation error:', error);
      return false;
    }
  }

  static async reactivateUser(userId: string): Promise<boolean> {
    try {
      await this.updateUserInDatabase(userId, {
        isActive: true,
        updatedAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('User reactivation error:', error);
      return false;
    }
  }
}

export default UserModel;