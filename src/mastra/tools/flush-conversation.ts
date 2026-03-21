import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { hotelMemory } from '../memory.js'

export const flushConversation = createTool({
  id: 'flush-conversation',
  description:
    'Deletes the full conversation thread (messages + vector embeddings) for a guest, identified by their phone number. Use from the admin panel to reset a conversation or to honour a guest right-to-erasure request. This does NOT affect observability traces.',
  inputSchema: z.object({
    phone: z
      .string()
      .describe('E.164 phone number of the guest whose conversation to flush'),
  }),
  outputSchema: z.object({
    deleted: z.boolean(),
    threadId: z.string(),
  }),
  execute: async ({ phone }) => {
    // threadId is always the guest phone number in this project
    await hotelMemory.deleteThread(phone)

    return { deleted: true, threadId: phone }
  },
})
