import { z } from "zod";

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
