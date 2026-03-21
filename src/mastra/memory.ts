import { Memory } from '@mastra/memory'

/**
 * Shared Memory instance for the hotel agent.
 * Exported here so tools can reference it directly without creating
 * a circular dependency with hotel-agent.ts.
 */
export const hotelMemory = new Memory()
