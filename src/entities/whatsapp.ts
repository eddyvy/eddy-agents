import { z } from 'zod'

export const whatsAppInputSchema = z.object({
  to: z
    .string()
    .describe('Destination phone number in E.164 format, e.g. +34600000000'),
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

export const whatsAppTextInputSchema = z.object({
  to: z
    .string()
    .describe('Destination phone number in E.164 format, e.g. +34600000000'),
  body: z.string().describe('Text message body to send via WhatsApp'),
})
export type SendWhatsAppTextParams = z.infer<typeof whatsAppTextInputSchema>

export const whatsAppOutputSchema = z.object({
  messageSid: z.string().describe('SID of the sent Twilio message'),
})
export type WhatsAppOutput = z.infer<typeof whatsAppOutputSchema>

export const getWhatsAppConversationInputSchema = z.object({
  phoneNumber: z
    .string()
    .describe(
      'Phone number of the contact in whatsapp:<E.164> format, e.g. whatsapp:+34600000000',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .default(20)
    .describe('Maximum number of messages to retrieve (default: 20, max: 200)'),
})
export type GetWhatsAppConversationParams = z.infer<
  typeof getWhatsAppConversationInputSchema
>

export const whatsAppMessageSchema = z.object({
  sid: z.string().describe('Unique message SID'),
  body: z.string().describe('Message body text'),
  from: z.string().describe('Sender number in whatsapp:<E.164> format'),
  to: z.string().describe('Recipient number in whatsapp:<E.164> format'),
  direction: z
    .enum(['inbound', 'outbound-api', 'outbound-call', 'outbound-reply'])
    .describe('Message direction'),
  status: z.string().describe('Message delivery status'),
  dateSent: z
    .string()
    .nullable()
    .describe('ISO timestamp when the message was sent'),
})

export const getWhatsAppConversationOutputSchema = z.object({
  messages: z
    .array(whatsAppMessageSchema)
    .describe('List of messages in the conversation'),
  total: z.number().describe('Total number of messages returned'),
})
export type GetWhatsAppConversationOutput = z.infer<
  typeof getWhatsAppConversationOutputSchema
>
