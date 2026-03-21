import { Memory } from '@mastra/memory'
import { storage } from './storage.js'

/**
 * Shared Memory instance for the hotel agent.
 * Exported here so tools can reference it directly without creating
 * a circular dependency with hotel-agent.ts.
 * Storage is injected explicitly so the instance works outside the
 * Mastra agent lifecycle (e.g. when called from tools directly).
 */
export const hotelMemory = new Memory({ storage })
