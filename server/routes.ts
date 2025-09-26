import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { authenticateApiKey, type AuthenticatedRequest } from "./middleware/auth";
import { createRateLimiter, createSpeedLimiter, createAuthRateLimiter, createBulkOperationLimiter } from "./middleware/rateLimiting";
import { airtableService } from "./services/airtable";
import { createRecordSchema, updateRecordSchema } from "@shared/schema";
import { z } from "zod";

function createErrorResponse(code: string, message: string, details?: string, requestId?: string) {
  return {
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || `req_${Date.now()}`,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize AirtableService before registering routes
  await airtableService.initialize();

  // Create rate limiting middleware instances
  const rateLimiter = createRateLimiter();
  const speedLimiter = createSpeedLimiter();
  const authRateLimiter = createAuthRateLimiter();
  const bulkOperationLimiter = createBulkOperationLimiter();

  // Apply rate limiting and throttling to all API routes
  app.use("/api", rateLimiter);
  app.use("/api", speedLimiter);
  
  // Apply authentication middleware to all API routes
  app.use("/api", authenticateApiKey);

  // GET /:table - Get all records from table
  app.get("/api/:table", async (req: Request, res: Response) => {
    try {
      const tableName = req.params.table;
      const records = await airtableService.getAllRecords(tableName);
      
      res.json({
        records,
      });
    } catch (error: any) {
      console.error(`Error fetching records from ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'TABLE_NOT_FOUND',
            error.message,
            `Available tables: ${airtableService.getValidTables().join(', ')}`,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to fetch records',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  // GET /:table/:id - Get single record by ID
  app.get("/api/:table/:id", async (req: Request, res: Response) => {
    try {
      const { table, id } = req.params;
      const record = await airtableService.getRecord(table, id);
      
      res.json(record);
    } catch (error: any) {
      console.error(`Error fetching record ${req.params.id} from ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'RECORD_NOT_FOUND',
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to fetch record',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  // POST /:table - Create new record
  app.post("/api/:table", async (req: Request, res: Response) => {
    try {
      const tableName = req.params.table;
      
      // Validate request body
      const validation = createRecordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_REQUEST_BODY',
            'Request body validation failed',
            validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            req.headers['x-request-id'] as string
          )
        );
      }
      
      const record = await airtableService.createRecord(tableName, validation.data.fields);
      
      res.status(201).json(record);
    } catch (error: any) {
      console.error(`Error creating record in ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'TABLE_NOT_FOUND',
            error.message,
            `Available tables: ${airtableService.getValidTables().join(', ')}`,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      if (error.message.includes('Invalid field data')) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_FIELD_DATA',
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to create record',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  // PATCH /:table/:id - Update existing record
  app.patch("/api/:table/:id", async (req: Request, res: Response) => {
    try {
      const { table, id } = req.params;
      
      // Validate request body
      const validation = updateRecordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_REQUEST_BODY',
            'Request body validation failed',
            validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            req.headers['x-request-id'] as string
          )
        );
      }
      
      const record = await airtableService.updateRecord(table, id, validation.data.fields);
      
      res.json(record);
    } catch (error: any) {
      console.error(`Error updating record ${req.params.id} in ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'RECORD_NOT_FOUND',
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      if (error.message.includes('Invalid field data')) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_FIELD_DATA',
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to update record',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  // DELETE /:table/:id - Delete record
  app.delete("/api/:table/:id", async (req: Request, res: Response) => {
    try {
      const { table, id } = req.params;
      await airtableService.deleteRecord(table, id);
      
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting record ${req.params.id} from ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'RECORD_NOT_FOUND',
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to delete record',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  // POST /:table/bulk - Create multiple records (with bulk operation rate limiting)
  app.post("/api/:table/bulk", bulkOperationLimiter, async (req: Request, res: Response) => {
    try {
      const { table } = req.params;
      
      // Validate request body is an array
      if (!Array.isArray(req.body) || req.body.length === 0) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_REQUEST_BODY',
            'Request body must be a non-empty array of records',
            'Expected format: [{"fields": {...}}, ...]',
            req.headers['x-request-id'] as string
          )
        );
      }

      // Limit bulk operations to 100 records per request
      if (req.body.length > 100) {
        return res.status(400).json(
          createErrorResponse(
            'BULK_LIMIT_EXCEEDED',
            'Bulk operations limited to 100 records per request',
            `Received ${req.body.length} records`,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      // Validate each record
      const validatedRecords = [];
      for (let i = 0; i < req.body.length; i++) {
        const validation = createRecordSchema.safeParse(req.body[i]);
        if (!validation.success) {
          return res.status(400).json(
            createErrorResponse(
              'INVALID_RECORD_DATA',
              `Record ${i + 1} validation failed`,
              validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
              req.headers['x-request-id'] as string
            )
          );
        }
        validatedRecords.push(validation.data);
      }
      
      // Create records in batch
      const records = await airtableService.createRecords(table, validatedRecords.map(r => r.fields));
      
      res.status(201).json({
        records,
        count: records.length,
        message: `Successfully created ${records.length} records`
      });
    } catch (error: any) {
      console.error(`Error bulk creating records in ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'TABLE_NOT_FOUND',
            error.message,
            `Available tables: ${airtableService.getValidTables().join(', ')}`,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to bulk create records',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  // PATCH /:table/bulk - Update multiple records (with bulk operation rate limiting)
  app.patch("/api/:table/bulk", bulkOperationLimiter, async (req: Request, res: Response) => {
    try {
      const { table } = req.params;
      
      // Validate request body is an array
      if (!Array.isArray(req.body) || req.body.length === 0) {
        return res.status(400).json(
          createErrorResponse(
            'INVALID_REQUEST_BODY',
            'Request body must be a non-empty array of records with IDs',
            'Expected format: [{"id": "rec123", "fields": {...}}, ...]',
            req.headers['x-request-id'] as string
          )
        );
      }

      // Limit bulk operations to 100 records per request
      if (req.body.length > 100) {
        return res.status(400).json(
          createErrorResponse(
            'BULK_LIMIT_EXCEEDED',
            'Bulk operations limited to 100 records per request',
            `Received ${req.body.length} records`,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      // Validate each record has id and fields
      const validatedRecords = [];
      for (let i = 0; i < req.body.length; i++) {
        const record = req.body[i];
        if (!record.id || typeof record.id !== 'string') {
          return res.status(400).json(
            createErrorResponse(
              'INVALID_RECORD_DATA',
              `Record ${i + 1} missing required 'id' field`,
              'Each record must have an "id" field for bulk updates',
              req.headers['x-request-id'] as string
            )
          );
        }
        
        const validation = updateRecordSchema.safeParse({ fields: record.fields });
        if (!validation.success) {
          return res.status(400).json(
            createErrorResponse(
              'INVALID_RECORD_DATA',
              `Record ${i + 1} validation failed`,
              validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
              req.headers['x-request-id'] as string
            )
          );
        }
        validatedRecords.push({ id: record.id, fields: validation.data.fields });
      }
      
      // Update records in batch
      const records = await airtableService.updateRecords(table, validatedRecords);
      
      res.json({
        records,
        count: records.length,
        message: `Successfully updated ${records.length} records`
      });
    } catch (error: any) {
      console.error(`Error bulk updating records in ${req.params.table}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json(
          createErrorResponse(
            'RECORD_NOT_FOUND',
            error.message,
            undefined,
            req.headers['x-request-id'] as string
          )
        );
      }
      
      res.status(500).json(
        createErrorResponse(
          'AIRTABLE_ERROR',
          'Failed to bulk update records',
          error.message,
          req.headers['x-request-id'] as string
        )
      );
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
