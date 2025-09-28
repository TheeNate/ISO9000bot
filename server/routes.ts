import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import {
  authenticateApiKey,
  type AuthenticatedRequest,
} from "./middleware/auth";
import {
  createRateLimiter,
  createSpeedLimiter,
  createAuthRateLimiter,
  createBulkOperationLimiter,
} from "./middleware/rateLimiting";
import {
  auditLoggingSetup,
  auditLoggingComplete,
} from "./middleware/auditLogging";
import { airtableService } from "./services/airtable";
import { storage } from "./storage";
import { createRecordSchema, updateRecordSchema } from "@shared/schema";
import { z } from "zod";

function createErrorResponse(
  code: string,
  message: string,
  details?: string,
  requestId?: string,
) {
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

  // Apply audit logging setup to all routes (must be first to capture all requests)
  app.use(auditLoggingSetup);
  app.use(auditLoggingComplete);

  // Apply rate limiting and throttling to all API routes
  app.use("/api", rateLimiter);
  app.use("/api", speedLimiter);

  // Apply authentication middleware to all API routes
  app.use("/api", authenticateApiKey);

  // Admin audit log API endpoints - must be BEFORE general table routes
  app.get("/api/admin/audit-logs", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await storage.getAuditLogs(limit, offset);

      res.json({
        logs,
        count: logs.length,
        limit,
        offset,
      });
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            "AUDIT_LOG_ERROR",
            "Failed to fetch audit logs",
            error.message,
            req.headers["x-request-id"] as string,
          ),
        );
    }
  });

  app.get(
    "/api/admin/audit-logs/table/:tableName",
    async (req: Request, res: Response) => {
      try {
        const { tableName } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;

        const logs = await storage.getAuditLogsByTable(tableName, limit);

        res.json({
          logs,
          count: logs.length,
          tableName,
          limit,
        });
      } catch (error: any) {
        console.error("Error fetching audit logs by table:", error);
        res
          .status(500)
          .json(
            createErrorResponse(
              "AUDIT_LOG_ERROR",
              "Failed to fetch audit logs by table",
              error.message,
              req.headers["x-request-id"] as string,
            ),
          );
      }
    },
  );

  app.get(
    "/api/admin/audit-logs/operation/:operationType",
    async (req: Request, res: Response) => {
      try {
        const { operationType } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;

        const logs = await storage.getAuditLogsByOperation(
          operationType,
          limit,
        );

        res.json({
          logs,
          count: logs.length,
          operationType,
          limit,
        });
      } catch (error: any) {
        console.error("Error fetching audit logs by operation:", error);
        res
          .status(500)
          .json(
            createErrorResponse(
              "AUDIT_LOG_ERROR",
              "Failed to fetch audit logs by operation",
              error.message,
              req.headers["x-request-id"] as string,
            ),
          );
      }
    },
  );

  app.get(
    "/api/admin/audit-logs/failed",
    async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 100;

        const logs = await storage.getFailedAuditLogs(limit);

        res.json({
          logs,
          count: logs.length,
          limit,
        });
      } catch (error: any) {
        console.error("Error fetching failed audit logs:", error);
        res
          .status(500)
          .json(
            createErrorResponse(
              "AUDIT_LOG_ERROR",
              "Failed to fetch failed audit logs",
              error.message,
              req.headers["x-request-id"] as string,
            ),
          );
      }
    },
  );

  // Database schema endpoint - Get complete database structure and relationships
  app.get("/api/schema", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const token = process.env.AIRTABLE_TOKEN;
      const baseId = process.env.AIRTABLE_BASE_ID;

      if (!token || !baseId) {
        return res
          .status(500)
          .json(
            createErrorResponse(
              "CONFIG_ERROR",
              "Airtable configuration missing",
              "AIRTABLE_TOKEN or AIRTABLE_BASE_ID not configured",
            ),
          );
      }

      // Get complete schema from Airtable Metadata API
      const response = await fetch(
        `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.statusText}`);
      }

      const schemaData = await response.json();

      // Parse relationships from foreign key fields
      const relationships: Array<{
        fromTable: string;
        fromField: string;
        toTable: string | undefined;
        relationship: string;
      }> = [];

      schemaData.tables.forEach((table: any) => {
        table.fields.forEach((field: any) => {
          if (field.type === "foreignKey") {
            relationships.push({
              fromTable: table.name,
              fromField: field.name,
              toTable: schemaData.tables.find(
                (t: any) => t.id === field.typeOptions.foreignTableId,
              )?.name,
              relationship: field.typeOptions.relationship,
            });
          }
        });
      });

      // Add ISO 9001 compliance context
      const isoCompliance = {
        documentControl:
          "Documents managed through Document Control table with approval workflows",
        auditTrail:
          "All changes tracked through Job/Process Control and Nonconformance tables",
        corrective_actions:
          "CAPA process implemented via Nonconformance & CAPA table with severity tracking",
      };

      res.json({
        ...schemaData,
        relationships,
        isoCompliance,
      });
    } catch (error: any) {
      console.error("Schema fetch error:", error);
      res
        .status(500)
        .json(
          createErrorResponse(
            "SCHEMA_FETCH_ERROR",
            "Failed to fetch database schema",
            error.message,
            req.requestId,
          ),
        );
    }
  });

      

       // Schema modification endpoints - Add/update table fields
       app.post("/api/meta/:table/fields", async (req: AuthenticatedRequest, res: Response) => {
         try {
           const { table } = req.params;
           const { name, type, options } = req.body;

           if (!name || !type) {
             return res.status(400).json(
               createErrorResponse(
                 'INVALID_REQUEST_BODY',
                 'Field name and type are required',
                 'Expected: {"name": "Field Name", "type": "singleLineText", "options": {...}}',
                 req.requestId
               )
             );
           }

           const token = process.env.AIRTABLE_TOKEN;
           const baseId = process.env.AIRTABLE_BASE_ID;

           if (!token || !baseId) {
             return res.status(500).json(
               createErrorResponse(
                 'CONFIG_ERROR',
                 'Airtable configuration missing',
                 'AIRTABLE_TOKEN or AIRTABLE_BASE_ID not configured',
                 req.requestId
               )
             );
           }

           // Get table metadata to find table ID
           const schemaResponse = await fetch(
             `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
             {
               headers: {
                 Authorization: `Bearer ${token}`,
               },
             },
           );

           if (!schemaResponse.ok) {
             throw new Error(`Failed to fetch schema: ${schemaResponse.statusText}`);
           }

           const schemaData = await schemaResponse.json();
           const tableData = schemaData.tables.find((t: any) => t.name === table);

           if (!tableData) {
             return res.status(404).json(
               createErrorResponse(
                 'TABLE_NOT_FOUND',
                 `Table '${table}' not found`,
                 `Available tables: ${schemaData.tables.map((t: any) => t.name).join(', ')}`,
                 req.requestId
               )
             );
           }

           // Create the new field
           const fieldResponse = await fetch(
             `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableData.id}/fields`,
             {
               method: 'POST',
               headers: {
                 Authorization: `Bearer ${token}`,
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                 name,
                 type,
                 options: options || {}
               })
             }
           );

           if (!fieldResponse.ok) {
             const errorData = await fieldResponse.json();
             throw new Error(`Failed to create field: ${errorData.error?.message || fieldResponse.statusText}`);
           }

           const result = await fieldResponse.json();
           res.status(201).json(result);

         } catch (error: any) {
           console.error(`Error creating field in ${req.params.table}:`, error);
           res.status(500).json(
             createErrorResponse(
               'FIELD_CREATE_ERROR',
               'Failed to create field',
               error.message,
               req.requestId
             )
           );
         }
       });

       app.patch("/api/meta/:table/fields/:fieldId", async (req: AuthenticatedRequest, res: Response) => {
         try {
           const { table, fieldId } = req.params;
           const updates = req.body;

           const token = process.env.AIRTABLE_TOKEN;
           const baseId = process.env.AIRTABLE_BASE_ID;

           if (!token || !baseId) {
             return res.status(500).json(
               createErrorResponse(
                 'CONFIG_ERROR',
                 'Airtable configuration missing',
                 'AIRTABLE_TOKEN or AIRTABLE_BASE_ID not configured',
                 req.requestId
               )
             );
           }

           // Get table ID from table name
           const schemaResponse = await fetch(
             `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
             {
               headers: {
                 Authorization: `Bearer ${token}`,
               },
             },
           );

           if (!schemaResponse.ok) {
             throw new Error(`Failed to fetch schema: ${schemaResponse.statusText}`);
           }

           const schemaData = await schemaResponse.json();
           const tableData = schemaData.tables.find((t: any) => t.name === table);

           if (!tableData) {
             return res.status(404).json(
               createErrorResponse(
                 'TABLE_NOT_FOUND',
                 `Table '${table}' not found`,
                 `Available tables: ${schemaData.tables.map((t: any) => t.name).join(', ')}`,
                 req.requestId
               )
             );
           }

           // Update the field
           const fieldResponse = await fetch(
             `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableData.id}/fields/${fieldId}`,
             {
               method: 'PATCH',
               headers: {
                 Authorization: `Bearer ${token}`,
                 'Content-Type': 'application/json'
               },
               body: JSON.stringify(updates)
             }
           );

           if (!fieldResponse.ok) {
             const errorData = await fieldResponse.json();
             throw new Error(`Failed to update field: ${errorData.error?.message || fieldResponse.statusText}`);
           }

           const result = await fieldResponse.json();
           res.json(result);

         } catch (error: any) {
           console.error(`Error updating field ${req.params.fieldId} in ${req.params.table}:`, error);
           res.status(500).json(
             createErrorResponse(
               'FIELD_UPDATE_ERROR',
               'Failed to update field',
               error.message,
               req.requestId
             )
           );
         }
       });

       // GET /:table - Get all records from table
       app.get("/api/:table", async (req: Request, res: Response) => {

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

      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "TABLE_NOT_FOUND",
              error.message,
              `Available tables: ${airtableService.getValidTables().join(", ")}`,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      res
        .status(500)
        .json(
          createErrorResponse(
            "AIRTABLE_ERROR",
            "Failed to fetch records",
            error.message,
            req.headers["x-request-id"] as string,
          ),
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
      console.error(
        `Error fetching record ${req.params.id} from ${req.params.table}:`,
        error,
      );

      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "RECORD_NOT_FOUND",
              error.message,
              undefined,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      res
        .status(500)
        .json(
          createErrorResponse(
            "AIRTABLE_ERROR",
            "Failed to fetch record",
            error.message,
            req.headers["x-request-id"] as string,
          ),
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
        return res
          .status(400)
          .json(
            createErrorResponse(
              "INVALID_REQUEST_BODY",
              "Request body validation failed",
              validation.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", "),
              req.headers["x-request-id"] as string,
            ),
          );
      }

      const record = await airtableService.createRecord(
        tableName,
        validation.data.fields,
      );

      res.status(201).json(record);
    } catch (error: any) {
      console.error(`Error creating record in ${req.params.table}:`, error);

      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "TABLE_NOT_FOUND",
              error.message,
              `Available tables: ${airtableService.getValidTables().join(", ")}`,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      if (error.message.includes("Invalid field data")) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              "INVALID_FIELD_DATA",
              error.message,
              undefined,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      res
        .status(500)
        .json(
          createErrorResponse(
            "AIRTABLE_ERROR",
            "Failed to create record",
            error.message,
            req.headers["x-request-id"] as string,
          ),
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
        return res
          .status(400)
          .json(
            createErrorResponse(
              "INVALID_REQUEST_BODY",
              "Request body validation failed",
              validation.error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", "),
              req.headers["x-request-id"] as string,
            ),
          );
      }

      const record = await airtableService.updateRecord(
        table,
        id,
        validation.data.fields,
      );

      res.json(record);
    } catch (error: any) {
      console.error(
        `Error updating record ${req.params.id} in ${req.params.table}:`,
        error,
      );

      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "RECORD_NOT_FOUND",
              error.message,
              undefined,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      if (error.message.includes("Invalid field data")) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              "INVALID_FIELD_DATA",
              error.message,
              undefined,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      res
        .status(500)
        .json(
          createErrorResponse(
            "AIRTABLE_ERROR",
            "Failed to update record",
            error.message,
            req.headers["x-request-id"] as string,
          ),
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
      console.error(
        `Error deleting record ${req.params.id} from ${req.params.table}:`,
        error,
      );

      if (error.message.includes("not found")) {
        return res
          .status(404)
          .json(
            createErrorResponse(
              "RECORD_NOT_FOUND",
              error.message,
              undefined,
              req.headers["x-request-id"] as string,
            ),
          );
      }

      res
        .status(500)
        .json(
          createErrorResponse(
            "AIRTABLE_ERROR",
            "Failed to delete record",
            error.message,
            req.headers["x-request-id"] as string,
          ),
        );
    }
  });

  // POST /:table/bulk - Create multiple records (with bulk operation rate limiting)
  app.post(
    "/api/:table/bulk",
    bulkOperationLimiter,
    async (req: Request, res: Response) => {
      try {
        const { table } = req.params;

        // Validate request body is an array
        if (!Array.isArray(req.body) || req.body.length === 0) {
          return res
            .status(400)
            .json(
              createErrorResponse(
                "INVALID_REQUEST_BODY",
                "Request body must be a non-empty array of records",
                'Expected format: [{"fields": {...}}, ...]',
                req.headers["x-request-id"] as string,
              ),
            );
        }

        // Limit bulk operations to 100 records per request
        if (req.body.length > 100) {
          return res
            .status(400)
            .json(
              createErrorResponse(
                "BULK_LIMIT_EXCEEDED",
                "Bulk operations limited to 100 records per request",
                `Received ${req.body.length} records`,
                req.headers["x-request-id"] as string,
              ),
            );
        }

        // Validate each record
        const validatedRecords = [];
        for (let i = 0; i < req.body.length; i++) {
          const validation = createRecordSchema.safeParse(req.body[i]);
          if (!validation.success) {
            return res
              .status(400)
              .json(
                createErrorResponse(
                  "INVALID_RECORD_DATA",
                  `Record ${i + 1} validation failed`,
                  validation.error.errors
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", "),
                  req.headers["x-request-id"] as string,
                ),
              );
          }
          validatedRecords.push(validation.data);
        }

        // Create records in batch
        const records = await airtableService.createRecords(
          table,
          validatedRecords.map((r) => r.fields),
        );

        res.status(201).json({
          records,
          count: records.length,
          message: `Successfully created ${records.length} records`,
        });
      } catch (error: any) {
        console.error(
          `Error bulk creating records in ${req.params.table}:`,
          error,
        );

        if (error.message.includes("not found")) {
          return res
            .status(404)
            .json(
              createErrorResponse(
                "TABLE_NOT_FOUND",
                error.message,
                `Available tables: ${airtableService.getValidTables().join(", ")}`,
                req.headers["x-request-id"] as string,
              ),
            );
        }

        res
          .status(500)
          .json(
            createErrorResponse(
              "AIRTABLE_ERROR",
              "Failed to bulk create records",
              error.message,
              req.headers["x-request-id"] as string,
            ),
          );
      }
    },
  );

  // PATCH /:table/bulk - Update multiple records (with bulk operation rate limiting)
  app.patch(
    "/api/:table/bulk",
    bulkOperationLimiter,
    async (req: Request, res: Response) => {
      try {
        const { table } = req.params;

        // Validate request body is an array
        if (!Array.isArray(req.body) || req.body.length === 0) {
          return res
            .status(400)
            .json(
              createErrorResponse(
                "INVALID_REQUEST_BODY",
                "Request body must be a non-empty array of records with IDs",
                'Expected format: [{"id": "rec123", "fields": {...}}, ...]',
                req.headers["x-request-id"] as string,
              ),
            );
        }

        // Limit bulk operations to 100 records per request
        if (req.body.length > 100) {
          return res
            .status(400)
            .json(
              createErrorResponse(
                "BULK_LIMIT_EXCEEDED",
                "Bulk operations limited to 100 records per request",
                `Received ${req.body.length} records`,
                req.headers["x-request-id"] as string,
              ),
            );
        }

        // Validate each record has id and fields
        const validatedRecords = [];
        for (let i = 0; i < req.body.length; i++) {
          const record = req.body[i];
          if (!record.id || typeof record.id !== "string") {
            return res
              .status(400)
              .json(
                createErrorResponse(
                  "INVALID_RECORD_DATA",
                  `Record ${i + 1} missing required 'id' field`,
                  'Each record must have an "id" field for bulk updates',
                  req.headers["x-request-id"] as string,
                ),
              );
          }

          const validation = updateRecordSchema.safeParse({
            fields: record.fields,
          });
          if (!validation.success) {
            return res
              .status(400)
              .json(
                createErrorResponse(
                  "INVALID_RECORD_DATA",
                  `Record ${i + 1} validation failed`,
                  validation.error.errors
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", "),
                  req.headers["x-request-id"] as string,
                ),
              );
          }
          validatedRecords.push({
            id: record.id,
            fields: validation.data.fields,
          });
        }

        // Update records in batch
        const records = await airtableService.updateRecords(
          table,
          validatedRecords,
        );

        res.json({
          records,
          count: records.length,
          message: `Successfully updated ${records.length} records`,
        });
      } catch (error: any) {
        console.error(
          `Error bulk updating records in ${req.params.table}:`,
          error,
        );

        if (error.message.includes("not found")) {
          return res
            .status(404)
            .json(
              createErrorResponse(
                "RECORD_NOT_FOUND",
                error.message,
                undefined,
                req.headers["x-request-id"] as string,
              ),
            );
        }

        res
          .status(500)
          .json(
            createErrorResponse(
              "AIRTABLE_ERROR",
              "Failed to bulk update records",
              error.message,
              req.headers["x-request-id"] as string,
            ),
          );
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}
