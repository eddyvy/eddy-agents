import twilio from 'twilio'
import { createTool } from '@mastra/core/tools'
import {
  whatsAppInputSchema,
  whatsAppOutputSchema,
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

/**
 * Twilio WhatsApp template sender — also exposed as a Mastra tool so agents
 * can use it directly.
 */
export const sendWhatsAppTool = createTool({
  id: 'send-whatsapp',
  description: 'Sends a WhatsApp template message via Twilio Content API.',
  inputSchema: whatsAppInputSchema,
  outputSchema: whatsAppOutputSchema,
  execute: async (inputData) => sendWhatsApp(inputData),
})
