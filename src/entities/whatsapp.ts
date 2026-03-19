import { z } from 'zod'

export const whatsAppInputSchema = z.object({
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
})
export type SendWhatsAppParams = z.infer<typeof whatsAppInputSchema>

export const whatsAppOutputSchema = z.object({
  messageSid: z.string().describe('SID of the sent Twilio message'),
})
export type WhatsAppOutput = z.infer<typeof whatsAppOutputSchema>
