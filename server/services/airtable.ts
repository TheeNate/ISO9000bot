import Airtable from 'airtable';
import type { AirtableRecord, Table } from '@shared/schema';

export class AirtableService {
  private base: Airtable.Base;
  private validTables: Set<string> = new Set();
  private initialized: boolean = false;

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
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.initializeValidTables();
      this.initialized = true;
    }
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
    // If we haven't initialized tables yet or initialization failed, allow all tables
    // The actual validation will happen when the Airtable API is called
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

  async deleteRecords(tableName: string, recordIds: string[]): Promise<void> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    try {
      // Airtable limits bulk operations to 10 records per request
      const batchSize = 10;
      
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = recordIds.slice(i, i + batchSize);
        await this.base(tableName).destroy(batch);
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(`One or more records not found in table '${tableName}'`);
      }
      throw error;
    }
  }

  async createRecords(tableName: string, records: Record<string, any>[]): Promise<AirtableRecord[]> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    const createdRecordIds: string[] = [];
    const results: AirtableRecord[] = [];

    try {
      // Airtable limits bulk operations to 10 records per request
      const batchSize = 10;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const createdRecords = await this.base(tableName).create(batch);
        
        // Track created record IDs for potential rollback
        createdRecords.forEach(record => {
          createdRecordIds.push(record.id);
          results.push({
            id: record.id,
            fields: record.fields,
            createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
          });
        });
      }
      
      return results;
    } catch (error: any) {
      // If any batch fails, attempt to rollback all previously created records
      if (createdRecordIds.length > 0) {
        console.warn(`Bulk create failed, attempting to rollback ${createdRecordIds.length} created records...`);
        try {
          await this.deleteRecords(tableName, createdRecordIds);
          console.log(`Successfully rolled back ${createdRecordIds.length} records`);
        } catch (rollbackError) {
          console.error(`Failed to rollback created records:`, rollbackError);
          // Include rollback failure in the original error message
          const originalError = error.statusCode === 422 ? 
            `Invalid field data: ${error.message}` : error.message;
          throw new Error(`${originalError}. WARNING: Failed to rollback ${createdRecordIds.length} partially created records. Manual cleanup may be required.`);
        }
      }
      
      if (error.statusCode === 422) {
        throw new Error(`Invalid field data: ${error.message}`);
      }
      throw error;
    }
  }

  async updateRecords(tableName: string, records: Array<{id: string, fields: Record<string, any>}>): Promise<AirtableRecord[]> {
    if (!this.isValidTable(tableName)) {
      throw new Error(`Table '${tableName}' not found in base`);
    }

    const originalRecords: Array<{id: string, fields: Record<string, any>}> = [];
    const results: AirtableRecord[] = [];
    let processedCount = 0;

    try {
      // First, fetch original records for potential rollback
      // We only store the fields that we're about to update, to avoid read-only field issues
      for (const record of records) {
        try {
          const originalRecord = await this.getRecord(tableName, record.id);
          // Extract only the fields that are being updated (writable fields only)
          const fieldsToStore: Record<string, any> = {};
          for (const fieldName of Object.keys(record.fields)) {
            if (originalRecord.fields.hasOwnProperty(fieldName)) {
              fieldsToStore[fieldName] = originalRecord.fields[fieldName];
            }
          }
          originalRecords.push({
            id: originalRecord.id,
            fields: fieldsToStore,
          });
        } catch (error: any) {
          // If we can't fetch original, we can't provide proper rollback
          throw new Error(`Cannot fetch original record ${record.id} for rollback support: ${error.message}`);
        }
      }

      // Airtable limits bulk operations to 10 records per request
      const batchSize = 10;
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const updatedRecords = await this.base(tableName).update(batch);
        
        updatedRecords.forEach(record => {
          results.push({
            id: record.id,
            fields: record.fields,
            createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
          });
        });
        
        processedCount += batch.length;
      }
      
      return results;
    } catch (error: any) {
      // If any batch fails, attempt to rollback all previously updated records
      if (processedCount > 0 && originalRecords.length > 0) {
        console.warn(`Bulk update failed, attempting to rollback ${processedCount} updated records...`);
        try {
          // Restore original values for records that were successfully updated
          // Only restore the specific fields that were changed
          const recordsToRollback = originalRecords.slice(0, processedCount);
          await this.updateRecordsWithoutRollback(tableName, recordsToRollback);
          console.log(`Successfully rolled back ${processedCount} records`);
        } catch (rollbackError) {
          console.error(`Failed to rollback updated records:`, rollbackError);
          // Include rollback failure in the original error message
          const originalError = error.statusCode === 422 ? 
            `Invalid field data: ${error.message}` : 
            error.statusCode === 404 ? 
            'One or more records not found' : error.message;
          throw new Error(`${originalError}. WARNING: Failed to rollback ${processedCount} partially updated records. Manual restoration may be required.`);
        }
      }
      
      if (error.statusCode === 404) {
        throw new Error(`One or more records not found in table '${tableName}'`);
      }
      if (error.statusCode === 422) {
        throw new Error(`Invalid field data: ${error.message}`);
      }
      throw error;
    }
  }

  // Helper method for rollback that doesn't perform its own rollback logic
  private async updateRecordsWithoutRollback(tableName: string, records: Array<{id: string, fields: Record<string, any>}>): Promise<AirtableRecord[]> {
    const batchSize = 10;
    const results: AirtableRecord[] = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const updatedRecords = await this.base(tableName).update(batch);
      
      updatedRecords.forEach(record => {
        results.push({
          id: record.id,
          fields: record.fields,
          createdTime: (record as any)._rawJson.createdTime || new Date().toISOString(),
        });
      });
    }
    
    return results;
  }
}

export const airtableService = new AirtableService();
