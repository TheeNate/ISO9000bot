import Airtable from 'airtable';
import type { AirtableRecord, Table } from '@shared/schema';

export class AirtableService {
  private base: Airtable.Base;
  private validTables: Set<string> = new Set();

  constructor() {
    const token = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token) {
      throw new Error('AIRTABLE_TOKEN environment variable is required');
    }

    if (!baseId) {
      throw new Error('AIRTABLE_BASE_ID environment variable is required');
    }

    Airtable.configure({
      endpointUrl: 'https://api.airtable.com',
      apiKey: token,
    });

    this.base = Airtable.base(baseId);
    this.initializeValidTables();
  }

  private async initializeValidTables() {
    try {
      const token = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_PAT || process.env.AIRTABLE_API_KEY;
      const baseId = process.env.AIRTABLE_BASE_ID;
      
      // Fetch table metadata from Airtable API
      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        data.tables?.forEach((table: Table) => {
          this.validTables.add(table.name);
        });
      }
    } catch (error) {
      console.warn('Failed to fetch table metadata:', error);
      // If metadata API fails, we'll validate tables on first use
    }
  }

  isValidTable(tableName: string): boolean {
    return this.validTables.size === 0 || this.validTables.has(tableName);
  }

  getValidTables(): string[] {
    return Array.from(this.validTables);
  }

  async getAllRecords(tableName: string): Promise<AirtableRecord[]> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    const records: AirtableRecord[] = [];
    
    try {
      await this.base(tableName).select({
        pageSize: 100,
      }).eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach(record => {
          records.push({
            id: record.id,
            fields: record.fields,
            createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
          });
        });
        fetchNextPage();
      });

      return records;
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Table '${tableName}' not found`);
      }
      throw error;
    }
  }

  async getRecord(tableName: string, recordId: string): Promise<AirtableRecord> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    try {
      const record = await this.base(tableName).find(recordId);
      
      return {
        id: record.id,
        fields: record.fields,
        createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Record '${recordId}' not found in table '${tableName}'`);
      }
      throw error;
    }
  }

  async createRecord(tableName: string, fields: Record<string, any>): Promise<AirtableRecord> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    try {
      const record = await this.base(tableName).create(fields);
      
      return {
        id: record.id,
        fields: record.fields,
        createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.statusCode === 422) {
        throw new Error(`Invalid field data: ${error.message}`);
      }
      throw error;
    }
  }

  async updateRecord(tableName: string, recordId: string, fields: Record<string, any>): Promise<AirtableRecord> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    try {
      const record = await this.base(tableName).update(recordId, fields);
      
      return {
        id: record.id,
        fields: record.fields,
        createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Record '${recordId}' not found in table '${tableName}'`);
      }
      if (error.statusCode === 422) {
        throw new Error(`Invalid field data: ${error.message}`);
      }
      throw error;
    }
  }

  async deleteRecord(tableName: string, recordId: string): Promise<void> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    try {
      await this.base(tableName).destroy(recordId);
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`Record '${recordId}' not found in table '${tableName}'`);
      }
      throw error;
    }
  }
}

export const airtableService = new AirtableService();
