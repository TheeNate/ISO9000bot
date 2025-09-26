import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Airtable record structure
export const airtableRecordSchema = z.object({
  id: z.string(),
  fields: z.record(z.any()),
  createdTime: z.string(),
});

export const airtableRecordsResponseSchema = z.object({
  records: z.array(airtableRecordSchema),
});

export const createRecordSchema = z.object({
  fields: z.record(z.any()),
});

export const updateRecordSchema = z.object({
  fields: z.record(z.any()),
});

// API Error response
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
  }),
  timestamp: z.string(),
  requestId: z.string(),
});

// Types
export type AirtableRecord = z.infer<typeof airtableRecordSchema>;
export type AirtableRecordsResponse = z.infer<typeof airtableRecordsResponseSchema>;
export type CreateRecordRequest = z.infer<typeof createRecordSchema>;
export type UpdateRecordRequest = z.infer<typeof updateRecordSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

// Table validation schema
export const tableSchema = z.object({
  id: z.string(),
  name: z.string(),
  primaryFieldId: z.string(),
});

export type Table = z.infer<typeof tableSchema>;

// Database Tables for Audit Logging

// Audit logs table for tracking all API operations
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 255 }).notNull(),
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE, etc.
  path: varchar("path", { length: 500 }).notNull(),
  query: text("query"), // Query parameters as JSON string
  body: jsonb("body"), // Request body
  response: jsonb("response"), // Response data
  statusCode: integer("status_code").notNull(),
  duration: integer("duration").notNull(), // Request duration in milliseconds
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 or IPv6
  tableName: varchar("table_name", { length: 255 }), // Airtable table being accessed
  recordId: varchar("record_id", { length: 255 }), // Airtable record ID if applicable
  operationType: varchar("operation_type", { length: 50 }), // CREATE, READ, UPDATE, DELETE, BULK_CREATE, etc.
  success: integer("success").notNull(), // 1 for success, 0 for failure
  errorCode: varchar("error_code", { length: 100 }), // Error code if operation failed
  errorMessage: text("error_message"), // Error message if operation failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert and select schemas for audit logs
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const selectAuditLogSchema = createSelectSchema(auditLogs);

// Types
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
