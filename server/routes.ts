import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import {
  authenticateApiKey,
  type AuthenticatedRequest,
} from "./middleware/auth";

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
  // Apply authentication middleware to all API routes
  app.use("/api", authenticateApiKey);

  // Create new table endpoint
  app.post(
    "/api/meta/tables",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, description } = req.body;

        if (!name) {
          return res
            .status(400)
            .json(
              createErrorResponse(
                "INVALID_REQUEST_BODY",
                "Table name is required",
                'Expected: {"name": "Table Name", "description": "Optional description"}',
                req.requestId,
              ),
            );
        }

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
                req.requestId,
              ),
            );
        }

        // Create new table using Airtable Metadata API
        const tableResponse = await fetch(
          `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              description: description || "",
              fields: [
                {
                  name: "Name",
                  type: "singleLineText",
                },
              ],
            }),
          },
        );

        if (!tableResponse.ok) {
          const errorData = await tableResponse.json();
          throw new Error(
            `Failed to create table: ${errorData.error?.message || tableResponse.statusText}`,
          );
        }

        const result = await tableResponse.json();
        res.status(201).json(result);
      } catch (error: any) {
        console.error(`Error creating table:`, error);
        res
          .status(500)
          .json(
            createErrorResponse(
              "TABLE_CREATE_ERROR",
              "Failed to create table",
              error.message,
              req.requestId,
            ),
          );
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
