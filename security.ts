/**
 * CARROM ARENA - Security Middleware
 * 
 * This middleware provides comprehensive security features including:
 * - Input validation and sanitization
 * - Rate limiting
 * - Authentication verification
 * - CSRF protection
 * - Request logging
 * - Fraud detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { verifyAccessToken, JWTPayload } from '../utils/jwt';
import { RedisManager } from '../utils/database';

// =============================================================================
// RATE LIMITING MIDDLEWARE
// =============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export class RateLimiter {
  private redis: RedisManager;

  constructor() {
    this.redis = RedisManager.getInstance();
  }

  public createMiddleware(config: RateLimitConfig) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const clientId = this.getClientId(request);
      const key = `rate_limit:${request.nextUrl.pathname}:${clientId}`;

      try {
        // Get current count
        const current = await this.redis.get<{ count: number; resetTime: number }>(key);
        const now = Date.now();

        if (!current || now > current.resetTime) {
          // First request or window expired
          await this.redis.set(key, {
            count: 1,
            resetTime: now + config.windowMs
          }, Math.ceil(config.windowMs / 1000));

          return this.addRateLimitHeaders(null, config.maxRequests - 1, current?.resetTime || now + config.windowMs);
        }

        if (current.count >= config.maxRequests) {
          // Rate limit exceeded
          return new NextResponse(
            JSON.stringify({
              success: false,
              message: config.message || 'Too many requests',
              retryAfter: Math.ceil((current.resetTime - now) / 1000)
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString(),
                'X-RateLimit-Limit': config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString()
              }
            }
          );
        }

        // Increment counter
        await this.redis.set(key, {
          count: current.count + 1,
          resetTime: current.resetTime
        }, Math.ceil((current.resetTime - now) / 1000));

        return this.addRateLimitHeaders(null, config.maxRequests - current.count - 1, current.resetTime);

      } catch (error) {
        console.error('Rate limiting error:', error);
        return null; // Allow request if rate limiter fails
      }
    };
  }

  private getClientId(request: NextRequest): string {
    // Try to get authenticated user ID first
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      if (payload) {
        return `user_${payload.userId}`;
      }
    }

    // Fallback to IP address
    return request.ip || 
           request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }

  private addRateLimitHeaders(response: NextResponse | null, remaining: number, resetTime: number): NextResponse | null {
    const headers = {
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    };

    if (response) {
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }

    return response;
  }
}

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

export interface AuthenticatedRequest extends NextRequest {
  user: JWTPayload;
}

export class AuthMiddleware {
  public static async authenticate(request: NextRequest): Promise<JWTPayload> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new SecurityError('Missing or invalid authorization header', 'AUTH_001');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      throw new SecurityError('Invalid or expired token', 'AUTH_002');
    }

    // Additional security checks
    await this.validateUserSession(payload.userId, token);
    
    return payload;
  }

  public static createMiddleware(options: { 
    required?: boolean;
    userTypes?: ('PLAYER' | 'DEVELOPER')[];
  } = {}) {
    return async (request: NextRequest): Promise<{ user?: JWTPayload; error?: NextResponse }> => {
      try {
        const user = await this.authenticate(request);
        
        // Check user type if specified
        if (options.userTypes && !options.userTypes.includes(user.userType)) {
          return {
            error: new NextResponse(
              JSON.stringify({
                success: false,
                message: 'Insufficient permissions'
              }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
          };
        }

        return { user };
        
      } catch (error) {
        if (options.required) {
          return {
            error: new NextResponse(
              JSON.stringify({
                success: false,
                message: error.message
              }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          };
        }
        
        return {}; // Allow request without authentication
      }
    };
  }

  private static async validateUserSession(userId: string, token: string): Promise<void> {
    const redis = RedisManager.getInstance();
    const sessionKey = `session:${userId}:${crypto.createHash('sha256').update(token).digest('hex').substring(0, 16)}`;
    
    const session = await redis.get(sessionKey);
    if (!session) {
      throw new SecurityError('Session not found or expired', 'AUTH_003');
    }
  }
}

// =============================================================================
// INPUT VALIDATION MIDDLEWARE
// =============================================================================

export class ValidationMiddleware {
  public static createMiddleware<T>(schema: z.ZodSchema<T>) {
    return async (request: NextRequest): Promise<{ data?: T; error?: NextResponse }> => {
      try {
        let body: any;
        
        if (request.method !== 'GET' && request.method !== 'DELETE') {
          const contentType = request.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            body = await request.json();
          } else if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
          } else {
            throw new SecurityError('Unsupported content type', 'VAL_001');
          }
        }

        // Parse query parameters
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());

        // Combine body and query parameters
        const data = { ...body, ...queryParams };

        // Validate with Zod schema
        const validatedData = schema.parse(data);
        
        // Sanitize string inputs
        const sanitizedData = this.sanitizeInput(validatedData);
        
        return { data: sanitizedData };
        
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            error: new NextResponse(
              JSON.stringify({
                success: false,
                message: 'Validation failed',
                errors: error.errors.map(e => ({
                  field: e.path.join('.'),
                  message: e.message,
                  code: e.code
                }))
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          };
        }

        return {
          error: new NextResponse(
            JSON.stringify({
              success: false,
              message: error.message || 'Validation error'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        };
      }
    };
  }

  private static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }
}

// =============================================================================
// CSRF PROTECTION MIDDLEWARE
// =============================================================================

export class CSRFMiddleware {
  private static readonly TOKEN_LENGTH = 32;
  private redis: RedisManager;

  constructor() {
    this.redis = RedisManager.getInstance();
  }

  public async generateToken(sessionId: string): Promise<string> {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const key = `csrf:${sessionId}`;
    
    await this.redis.set(key, token, 3600); // 1 hour expiry
    
    return token;
  }

  public createMiddleware() {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      // Skip CSRF for GET requests
      if (request.method === 'GET') {
        return null;
      }

      const sessionId = this.getSessionId(request);
      if (!sessionId) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'Session ID required'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const providedToken = request.headers.get('x-csrf-token');
      if (!providedToken) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'CSRF token required'
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const key = `csrf:${sessionId}`;
      const storedToken = await this.redis.get<string>(key);

      if (!storedToken || storedToken !== providedToken) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'Invalid CSRF token'
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return null; // Allow request
    };
  }

  private getSessionId(request: NextRequest): string | null {
    // Try to extract session ID from various sources
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      return payload?.userId || null;
    }

    return request.headers.get('x-session-id') || null;
  }
}

// =============================================================================
// FRAUD DETECTION MIDDLEWARE
// =============================================================================

interface FraudMetrics {
  requestCount: number;
  failedAttempts: number;
  suspiciousPatterns: string[];
  lastActivity: number;
}

export class FraudDetectionMiddleware {
  private redis: RedisManager;

  constructor() {
    this.redis = RedisManager.getInstance();
  }

  public createMiddleware(config: {
    maxRequestsPerMinute: number;
    maxFailedAttempts: number;
    suspiciousThreshold: number;
  }) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
      const clientId = this.getClientId(request);
      const metricsKey = `fraud:${clientId}`;

      try {
        const metrics = await this.redis.get<FraudMetrics>(metricsKey) || {
          requestCount: 0,
          failedAttempts: 0,
          suspiciousPatterns: [],
          lastActivity: Date.now()
        };

        // Reset counters if enough time has passed
        const now = Date.now();
        if (now - metrics.lastActivity > 60000) { // 1 minute
          metrics.requestCount = 0;
          metrics.failedAttempts = 0;
        }

        // Increment request count
        metrics.requestCount++;
        metrics.lastActivity = now;

        // Check for suspicious patterns
        const suspiciousScore = this.calculateSuspiciousScore(request, metrics);

        // Block if too suspicious
        if (suspiciousScore > config.suspiciousThreshold) {
          await this.flagSuspiciousActivity(clientId, suspiciousScore, request);
          
          return new NextResponse(
            JSON.stringify({
              success: false,
              message: 'Request blocked due to suspicious activity'
            }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Update metrics
        await this.redis.set(metricsKey, metrics, 3600); // 1 hour TTL

        return null; // Allow request

      } catch (error) {
        console.error('Fraud detection error:', error);
        return null; // Allow request if fraud detection fails
      }
    };
  }

  private calculateSuspiciousScore(request: NextRequest, metrics: FraudMetrics): number {
    let score = 0;

    // High request frequency
    if (metrics.requestCount > 100) score += 30;
    else if (metrics.requestCount > 50) score += 15;

    // Multiple failed attempts
    if (metrics.failedAttempts > 10) score += 40;
    else if (metrics.failedAttempts > 5) score += 20;

    // Suspicious user agent
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent || userAgent.length < 10) score += 20;

    // Missing common headers
    if (!request.headers.get('accept-language')) score += 10;
    if (!request.headers.get('accept-encoding')) score += 10;

    // Suspicious patterns in URL or body
    const url = request.url;
    const suspiciousPatterns = [
      'script', 'alert', 'javascript:', 'data:', 'vbscript:',
      'onload', 'onerror', 'onclick', '<script', '</script'
    ];

    for (const pattern of suspiciousPatterns) {
      if (url.toLowerCase().includes(pattern)) {
        score += 25;
        break;
      }
    }

    return Math.min(score, 100);
  }

  private async flagSuspiciousActivity(clientId: string, score: number, request: NextRequest): Promise<void> {
    const alertKey = `fraud_alert:${clientId}:${Date.now()}`;
    const alert = {
      clientId,
      suspiciousScore: score,
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.ip || request.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString()
    };

    await this.redis.set(alertKey, alert, 86400); // 24 hours
    console.warn('🚨 Suspicious activity detected:', alert);
  }

  private getClientId(request: NextRequest): string {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      if (payload) return `user_${payload.userId}`;
    }

    return request.ip || 
           request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }
}

// =============================================================================
// REQUEST LOGGING MIDDLEWARE
// =============================================================================

export class LoggingMiddleware {
  public static createMiddleware(options: {
    logRequests?: boolean;
    logResponses?: boolean;
    logBody?: boolean;
    excludePaths?: string[];
  } = {}) {
    return async (request: NextRequest): Promise<void> => {
      if (options.excludePaths?.some(path => request.nextUrl.pathname.includes(path))) {
        return;
      }

      const startTime = Date.now();
      const requestId = crypto.randomBytes(8).toString('hex');

      // Log request
      if (options.logRequests) {
        const logData: any = {
          requestId,
          method: request.method,
          url: request.url,
          headers: Object.fromEntries(request.headers.entries()),
          ip: request.ip || request.headers.get('x-forwarded-for'),
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        };

        // Log request body for non-GET requests
        if (options.logBody && request.method !== 'GET') {
          try {
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              logData.body = await request.json();
            }
          } catch (error) {
            logData.bodyError = 'Failed to parse request body';
          }
        }

        console.log('📝 Request:', logData);
      }

      // Store request ID for response logging
      (request as any).requestId = requestId;
      (request as any).startTime = startTime;
    };
  }

  public static logResponse(request: any, response: NextResponse, error?: Error): void {
    const duration = Date.now() - (request.startTime || 0);
    
    const logData = {
      requestId: request.requestId,
      status: response?.status || (error ? 500 : 200),
      duration: `${duration}ms`,
      error: error?.message,
      timestamp: new Date().toISOString()
    };

    if (error) {
      console.error('❌ Response:', logData);
    } else {
      console.log('✅ Response:', logData);
    }
  }
}

// =============================================================================
// SECURITY ERROR CLASS
// =============================================================================

export class SecurityError extends Error {
  public code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

// =============================================================================
// COMPOSITE SECURITY MIDDLEWARE
// =============================================================================

export class SecurityMiddlewareStack {
  private rateLimiter: RateLimiter;
  private csrfMiddleware: CSRFMiddleware;
  private fraudDetection: FraudDetectionMiddleware;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.csrfMiddleware = new CSRFMiddleware();
    this.fraudDetection = new FraudDetectionMiddleware();
  }

  public createStack(config: {
    rateLimit?: RateLimitConfig;
    auth?: { required?: boolean; userTypes?: ('PLAYER' | 'DEVELOPER')[] };
    validation?: z.ZodSchema<any>;
    csrf?: boolean;
    fraudDetection?: boolean;
    logging?: boolean;
  }) {
    return async (request: NextRequest): Promise<NextResponse | { data?: any; user?: JWTPayload }> => {
      try {
        // 1. Logging
        if (config.logging) {
          await LoggingMiddleware.createMiddleware({ logRequests: true })(request);
        }

        // 2. Rate Limiting
        if (config.rateLimit) {
          const rateLimitResult = await this.rateLimiter.createMiddleware(config.rateLimit)(request);
          if (rateLimitResult) return rateLimitResult;
        }

        // 3. Fraud Detection
        if (config.fraudDetection) {
          const fraudResult = await this.fraudDetection.createMiddleware({
            maxRequestsPerMinute: 100,
            maxFailedAttempts: 10,
            suspiciousThreshold: 70
          })(request);
          if (fraudResult) return fraudResult;
        }

        // 4. CSRF Protection
        if (config.csrf) {
          const csrfResult = await this.csrfMiddleware.createMiddleware()(request);
          if (csrfResult) return csrfResult;
        }

        // 5. Authentication
        let user: JWTPayload | undefined;
        if (config.auth) {
          const authResult = await AuthMiddleware.createMiddleware(config.auth)(request);
          if (authResult.error) return authResult.error;
          user = authResult.user;
        }

        // 6. Input Validation
        let data: any;
        if (config.validation) {
          const validationResult = await ValidationMiddleware.createMiddleware(config.validation)(request);
          if (validationResult.error) return validationResult.error;
          data = validationResult.data;
        }

        return { data, user };

      } catch (error) {
        console.error('Security middleware error:', error);
        
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: 'Security check failed'
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };
  }
}

// Export instances
export const securityStack = new SecurityMiddlewareStack();
export const rateLimiter = new RateLimiter();
export const authMiddleware = AuthMiddleware;
export const validationMiddleware = ValidationMiddleware;