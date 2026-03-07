import twilio from 'twilio'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export interface SendWhatsAppParams {
  to: string
  contentSid: string
  contentVariables: Record<string, string>
}

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
    to: params.to,
    contentSid: params.contentSid,
    contentVariables: JSON.stringify(params.contentVariables),
  })

  return { messageSid: message.sid }
}

/**
 * Twilio WhatsApp template sender — also exposed as a Mastra tool so agents
 * can use it directly.
 */
export const sendWhatsAppTool = createTool({
  id: 'send-whatsapp',
  description:
    'Sends a WhatsApp template message via Twilio Content API. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM environment variables.',
  inputSchema: z.object({
    to: z
      .string()
      .describe(
        'Destination phone number in whatsapp:<E.164> format, e.g. whatsapp:+34600000000',
      ),
    contentSid: z
      .string()
      .describe('Twilio Content SID (HXxxxxxxxx) for the WhatsApp template'),
    contentVariables: z
      .record(z.string(), z.string())
      .describe(
        'Template variables indexed by position, e.g. { "1": "John", "2": "Hotel Ejemplo" }',
      ),
  }),
  outputSchema: z.object({
    messageSid: z.string().describe('SID of the sent Twilio message'),
  }),
  execute: async (inputData) => sendWhatsApp(inputData),
})
