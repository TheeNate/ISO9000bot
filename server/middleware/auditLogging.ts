import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { nanoid } from 'nanoid';

export interface AuditRequest extends Request {
  startTime?: number;
  requestId?: string;
  auditData?: {
    tableName?: string;
    recordId?: string;
    operationType?: string;
  };
}

// Middleware to add request tracking information
export function auditLoggingSetup(req: AuditRequest, res: Response, next: NextFunction) {
  // Add request timing and ID
  req.startTime = Date.now();
  req.requestId = req.headers['x-request-id'] as string || `req_${nanoid()}`;
  req.auditData = {};
  
  // Extract table name from path if it's an API route
  if (req.path.startsWith('/api/')) {
    const pathParts = req.path.split('/');
    if (pathParts.length >= 3) {
      req.auditData.tableName = pathParts[2]; // /api/[tableName]/...
    }
    if (pathParts.length >= 4) {
      req.auditData.recordId = pathParts[3]; // /api/[tableName]/[recordId]
    }
  }
  
  // Determine operation type based on HTTP method and path
  req.auditData.operationType = determineOperationType(req.method, req.path);
  
  next();
}

// Middleware to log completed requests
export function auditLoggingComplete(req: AuditRequest, res: Response, next: NextFunction) {
  // Store original res.json to capture response data
  const originalJson = res.json;
  let responseData: any = null;
  
  res.json = function(body) {
    responseData = body;
    // Log the audit entry immediately when response is sent
    setImmediate(() => logAuditEntry(req, res, responseData));
    return originalJson.call(this, body);
  };
  
  next();
}

function determineOperationType(method: string, path: string): string {
  if (!path.startsWith('/api/')) {
    return 'NON_API';
  }
  
  const pathParts = path.split('/');
  const isBulkOperation = pathParts.includes('bulk');
  
  switch (method.toUpperCase()) {
    case 'GET':
      return pathParts.length === 3 ? 'READ_ALL' : 'READ_ONE';
    case 'POST':
      return isBulkOperation ? 'BULK_CREATE' : 'CREATE';
    case 'PATCH':
    case 'PUT':
      return isBulkOperation ? 'BULK_UPDATE' : 'UPDATE';
    case 'DELETE':
      return isBulkOperation ? 'BULK_DELETE' : 'DELETE';
    default:
      return 'UNKNOWN';
  }
}

async function logAuditEntry(req: AuditRequest, res: Response, responseData: any) {
  try {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
    
    // Extract error information if request failed
    let errorCode: string | undefined;
    let errorMessage: string | undefined;
    
    if (!isSuccess && responseData && responseData.error) {
      errorCode = responseData.error.code;
      errorMessage = responseData.error.message;
    }
    
    // Prepare audit log data
    const auditLogData = {
      requestId: req.requestId!,
      method: req.method,
      path: req.path,
      query: JSON.stringify(req.query),
      body: req.body ? JSON.stringify(req.body) : null,
      response: responseData ? JSON.stringify(responseData) : null,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null,
      tableName: req.auditData?.tableName || null,
      recordId: req.auditData?.recordId || null,
      operationType: req.auditData?.operationType || 'UNKNOWN',
      success: isSuccess ? 1 : 0,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null,
    };
    
    // Log to database
    await storage.createAuditLog(auditLogData);
    
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't fail the request if audit logging fails
  }
}