import twilio from 'twilio'
import { createTool } from '@mastra/core/tools'
import {
  smsOrderInputSchema,
  smsOrderOutputSchema,
} from '../../entities/sms.js'

/** EXAMPLE_PHONE_NUMBER may contain "whatsapp:+XXXX" — strip the prefix for SMS */
function normalizePhoneNumber(raw: string): string {
  return raw.replace(/^whatsapp:/i, '')
}

export const sendSmsTool = createTool({
  id: 'send-sms-order',
  description:
    'Envía la comanda del huésped por SMS a través de Twilio. Úsala cuando el huésped haya confirmado su pedido. Incluye el número de habitación y los platos pedidos.',
  inputSchema: smsOrderInputSchema,
  outputSchema: smsOrderOutputSchema,
  execute: async ({ roomNumber, order }) => {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    )

    const to = normalizePhoneNumber(process.env.EXAMPLE_PHONE_NUMBER!)
    // TWILIO_SMS_FROM takes precedence; fall back to TWILIO_WHATSAPP_FROM stripping the "whatsapp:" prefix
    const from = normalizePhoneNumber(
      process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_WHATSAPP_FROM!,
    )

    const body =
      `🛎️ COMANDA ROOM SERVICE\n` +
      `Habitación: ${roomNumber}\n` +
      `Pedido:\n${order}\n\n` +
      `Tiempo estimado de entrega: 25-35 minutos.`

    try {
      const message = await client.messages.create({ from, to, body })
      return { success: true, messageSid: message.sid, to }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      return { success: false, error: errorMessage }
    }
  },
})
