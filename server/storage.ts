// Empty storage interface since we're using Airtable directly
export interface IStorage {
  // No local storage needed - all operations go through Airtable
}

export class MemStorage implements IStorage {
  constructor() {
    // Placeholder - all operations handled by AirtableService
  }
}

export const storage = new MemStorage();
