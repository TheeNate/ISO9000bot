import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  authenticated: boolean;
}

export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const middlewareKey = process.env.MIDDLEWARE_KEY || process.env.API_KEY || process.env.MIDDLEWARE_API_KEY;

  if (!middlewareKey) {
    return res.status(500).json({
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Middleware API key not configured',
        details: 'MIDDLEWARE_KEY environment variable is required',
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
    });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'MISSING_AUTHORIZATION',
        message: 'Authorization header required',
        details: 'Include Authorization: Bearer <your-api-key> header',
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (token !== middlewareKey) {
    return res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key',
        details: 'The provided API key is not valid',
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
    });
  }

  (req as AuthenticatedRequest).authenticated = true;
  next();
}
