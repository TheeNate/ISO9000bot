import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { authenticateApiKey, type AuthenticatedRequest } from "./middleware/auth";
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

  const httpServer = createServer(app);
  return httpServer;
}
