import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';

// Configure rate limiting middleware
export const createRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        details: 'Rate limit: 100 requests per 15 minutes',
      },
      timestamp: new Date().toISOString(),
      requestId: 'rate-limit-exceeded',
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later',
          details: 'Rate limit: 100 requests per 15 minutes',
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
      });
    },
  });
};

// Configure throttling middleware (slow down responses)
export const createSpeedLimiter = () => {
  return slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
    delayMs: (hits) => {
      // Exponential delay: 100ms * 2^(hits - delayAfter)
      const delayAfter = 50;
      if (hits <= delayAfter) return 0;
      
      const exponent = Math.min(hits - delayAfter, 10); // Cap at 2^10 = 1024ms
      return 100 * Math.pow(2, exponent);
    },
    maxDelayMs: 5000, // Maximum delay of 5 seconds
  });
};

// Create stricter rate limiter for authentication endpoints
export const createAuthRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit auth-related requests more strictly
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        details: 'Rate limit: 10 failed authentication attempts per 15 minutes',
      },
      timestamp: new Date().toISOString(),
      requestId: 'auth-rate-limit-exceeded',
    },
  });
};

// Create bulk operation rate limiter
export const createBulkOperationLimiter = () => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit bulk operations to 10 per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'BULK_OPERATION_RATE_LIMIT_EXCEEDED',
        message: 'Too many bulk operations, please try again later',
        details: 'Rate limit: 10 bulk operations per hour',
      },
      timestamp: new Date().toISOString(),
      requestId: 'bulk-rate-limit-exceeded',
    },
  });
};