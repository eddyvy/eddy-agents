import twilio from 'twilio'
import { z } from 'zod'
import { createTool } from '@mastra/core/tools'
import {
  SendWhatsAppTextParams,
  whatsAppInputSchema,
  whatsAppOutputSchema,
  whatsAppTextInputSchema,
  type SendWhatsAppParams,
} from '../../entities/whatsapp.js'

/**
 * Standalone helper — can be called directly from workflow steps without
 * going through the tool abstraction.
 */
export async function sendWhatsApp(params: SendWhatsAppParams) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  )

  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${params.to}`,
    contentSid: params.contentSid,
    contentVariables: JSON.stringify(params.contentVariables),
  })

  return { messageSid: message.sid }
}

const WHATSAPP_MAX_LEN = 1600

/**
 * Splits a potentially long string into chunks that fit within WhatsApp's
 * 1600-character limit, preferring natural markdown break points:
 *   1. Paragraph break (\n\n)
 *   2. Line break (\n) — covers headers, list items, table rows
 *   3. Sentence end (.  !  ?  followed by a space)
 *   4. Word boundary (space)
 *   5. Hard cut
 */
export function splitMessage(
  text: string,
  maxLen = WHATSAPP_MAX_LEN,
): string[] {
  if (text.length <= maxLen) return [text]

  const chunks: string[] = []
  let remaining = text.trimEnd()

  while (remaining.length > maxLen) {
    const window = remaining.slice(0, maxLen)

    // 1. Paragraph break
    let cut = window.lastIndexOf('\n\n')
    if (cut > 0) {
      chunks.push(remaining.slice(0, cut).trimEnd())
      remaining = remaining.slice(cut).trimStart()
      continue
    }

    // 2. Line break
    cut = window.lastIndexOf('\n')
    if (cut > 0) {
      chunks.push(remaining.slice(0, cut).trimEnd())
      remaining = remaining.slice(cut).trimStart()
      continue
    }

    // 3. Sentence end followed by space
    const sentenceMatches = [...window.matchAll(/[.!?] /g)]
    if (sentenceMatches.length > 0) {
      cut = sentenceMatches[sentenceMatches.length - 1].index! + 1
      chunks.push(remaining.slice(0, cut).trimEnd())
      remaining = remaining.slice(cut).trimStart()
      continue
    }

    // 4. Word boundary
    cut = window.lastIndexOf(' ')
    if (cut > 0) {
      chunks.push(remaining.slice(0, cut).trimEnd())
      remaining = remaining.slice(cut).trimStart()
      continue
    }

    // 5. Hard cut
    chunks.push(remaining.slice(0, maxLen))
    remaining = remaining.slice(maxLen)
  }

  if (remaining.length > 0) chunks.push(remaining)
  return chunks
}

/**
 * Sends a plain text WhatsApp message (free-form, for in-session replies).
 * Automatically splits responses longer than 1600 characters at natural
 * markdown boundaries and sends each chunk as a separate message.
 */
export async function sendWhatsAppText({
  to,
  body,
}: SendWhatsAppTextParams): Promise<{ messageSids: string[] }> {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  )

  const chunks = splitMessage(body)
  const messageSids: string[] = []

  for (const chunk of chunks) {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: `whatsapp:${to}`,
      body: chunk,
    })
    messageSids.push(message.sid)
  }

  return { messageSids }
}

/**
 * Twilio WhatsApp template sender — also exposed as a Mastra tool so agents
 * can use it directly.
 */
export const sendWhatsAppTool = createTool({
  id: 'send-whatsapp',
  description:
    'Sends a WhatsApp template message via Twilio to start a conversation.',
  inputSchema: whatsAppInputSchema,
  outputSchema: whatsAppOutputSchema,
  execute: async (inputData) => sendWhatsApp(inputData),
})

/**
 * Twilio WhatsApp free-form text sender — for agent replies within the session window.
 * Long responses are automatically split into multiple messages.
 */
export const sendWhatsAppTextTool = createTool({
  id: 'send-whatsapp-text',
  description:
    'Sends a WhatsApp message via Twilio to respond to a previous message from a guest.',
  inputSchema: whatsAppTextInputSchema,
  outputSchema: z.object({
    messageSids: z
      .array(z.string())
      .describe('SIDs of all sent Twilio messages'),
  }),
  execute: async (inputData) => sendWhatsAppText(inputData),
})
