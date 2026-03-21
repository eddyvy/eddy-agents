import { PostgresStore } from '@mastra/pg'

/**
 * Shared storage instance.
 * Extracted here so both index.ts (Mastra) and memory.ts (hotelMemory)
 * can reference the same store without a circular dependency.
 */
export const storage = new PostgresStore({
  id: 'pg-storage',
  connectionString: process.env.DATABASE_URL,
})
