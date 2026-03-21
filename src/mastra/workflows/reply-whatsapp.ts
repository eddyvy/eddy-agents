import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { guestSchema } from '../../entities/guest.js'
import { findGuest } from '../tools/get-guest.js'
import { sendWhatsAppText } from '../tools/send-whatsapp.js'
import { hotelAgent } from '../agents/hotel-agent.js'

// ─────────────────────────────────────────────
// Memory helper — persists a send-error into the guest's conversation
// thread so the agent has context about the failed delivery the next
// time it is invoked.
// ─────────────────────────────────────────────

async function saveErrorToMemory(phone: string, error: string): Promise<void> {
  try {
    const memory = await hotelAgent.getMemory()
    if (!memory) return

    const messageId = `send-error-${phone}-${Date.now()}`
    await memory.saveMessages({
      messages: [
        {
          id: messageId,
          role: 'assistant',
          content: {
            format: 2 as const,
            parts: [
              {
                type: 'text' as const,
                text: `[SEND_ERROR: No se pudo enviar la respuesta al huésped. ${error}]`,
              },
            ],
          },
          createdAt: new Date(),
          threadId: phone,
          resourceId: phone,
        },
      ],
    })
  } catch (err) {
    console.warn('[reply-whatsapp] Failed to save send error to memory:', err)
  }
}

// ─────────────────────────────────────────────
// Step 1 — Look up guest by phone or email (nullable)
// Uses the get-guest tool; returns null for anonymous / unknown callers.
// The phone number is always available even when the guest is unknown.
// ─────────────────────────────────────────────

const guestInputSchema = z
  .object({
    phone: z.string().optional().describe('E.164 phone number of the guest'),
    email: z.string().email().optional().describe('Email address of the guest'),
    body: z.string().describe('Message text sent by the guest'),
  })
  .refine((d) => d.phone || d.email, {
    message: 'At least one of phone or email must be provided',
  })

const getGuestStep = createStep({
  id: 'get-guest',
  description:
    'Looks up the guest record by phone or email; returns null for anonymous callers',
  inputSchema: guestInputSchema,
  outputSchema: z.object({
    phone: z.string(),
    body: z.string(),
    guest: guestSchema.nullable(),
  }),
  execute: async ({ inputData }) => {
    const { phone, email, body } = inputData
    const guest = await findGuest({ phone, email })
    // Fall back to email as identifier if no phone provided
    const identifier = phone ?? email ?? ''
    return { phone: identifier, body, guest }
  },
})

// ─────────────────────────────────────────────
// Step 3 — Run hotel-agent
// Uses the guest phone as both resourceId and threadId so the agent
// has access to the full conversation history (including prior
// outbound notifications saved by send-notifications workflow).
// ─────────────────────────────────────────────

const runAgentStep = createStep({
  id: 'run-agent',
  description:
    'Generates a hotel-agent reply using conversation memory keyed to the guest phone number',
  inputSchema: z.object({
    phone: z.string(),
    body: z.string(),
    guest: guestSchema.nullable(),
  }),
  outputSchema: z.object({
    phone: z.string(),
    agentText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { phone, body, guest } = inputData

    // Prepend guest name when known so the agent can address the guest
    // by name even if this is the first message in the session.
    const prompt = guest
      ? `[Huésped: ${guest.first_name} ${guest.lastname}]\n${body}`
      : body

    const response = await hotelAgent.generate(prompt, {
      memory: {
        resource: phone,
        thread: phone,
      },
    })

    return { phone, agentText: response.text }
  },
})

// ─────────────────────────────────────────────
// Step 4 — Send WhatsApp reply
// Sends the agent's free-form text back to the guest via Twilio.
// Errors are caught and returned as `sendError` instead of throwing,
// so the next step can handle rollback gracefully.
// ─────────────────────────────────────────────

const sendReplyStep = createStep({
  id: 'send-reply',
  description:
    'Sends the agent response as a plain text WhatsApp message via Twilio',
  inputSchema: z.object({
    phone: z.string(),
    agentText: z.string(),
  }),
  outputSchema: z.object({
    phone: z.string(),
    agentText: z.string(),
    messageSids: z.array(z.string()).optional(),
    sendError: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { phone, agentText } = inputData
    try {
      const { messageSids } = await sendWhatsAppText({
        to: phone,
        body: agentText,
      })
      return { phone, agentText, messageSids }
    } catch (err) {
      const sendError = err instanceof Error ? err.message : String(err)
      return { phone, agentText, sendError }
    }
  },
})

// ─────────────────────────────────────────────
// Step 5 — Rollback on failure / finalise
// If the WhatsApp send failed, persists the error into the conversation
// thread so the agent has context on the next interaction.
// ─────────────────────────────────────────────

const finalizeStep = createStep({
  id: 'finalize',
  description:
    'Saves an error context message to memory if the send failed; returns the final delivery result',
  inputSchema: z.object({
    phone: z.string(),
    agentText: z.string(),
    messageSids: z.array(z.string()).optional(),
    sendError: z.string().optional(),
  }),
  outputSchema: z.object({
    sent: z.literal(true),
    messageSids: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData }) => {
    const { phone, sendError, messageSids } = inputData

    if (sendError) {
      await saveErrorToMemory(phone, sendError)
      throw new Error(sendError)
    }

    return { sent: true as const, messageSids }
  },
})

// ─────────────────────────────────────────────
// Workflow assembly
// Triggered by an inbound Twilio WhatsApp webhook.
// ─────────────────────────────────────────────

export const replyWhatsAppWorkflow = createWorkflow({
  id: 'reply-whatsapp',
  description:
    'Receives guest phone or email plus the user message, runs hotel-agent using per-guest conversation memory, and sends the reply back via WhatsApp.',
  inputSchema: z
    .object({
      phone: z.string().optional().describe('E.164 phone number of the guest'),
      email: z.email().optional().describe('Email address of the guest'),
      body: z.string().describe('Message text sent by the guest'),
    })
    .refine((d) => d.phone || d.email, {
      message: 'At least one of phone or email must be provided',
    }),
  outputSchema: z.object({
    sent: z.literal(true),
    messageSids: z.array(z.string()).optional(),
  }),
})
  .then(getGuestStep)
  .then(runAgentStep)
  .then(sendReplyStep)
  .then(finalizeStep)
  .commit()
