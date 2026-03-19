import { z } from 'zod'

export const smsOrderInputSchema = z.object({
  roomNumber: z.string().describe('Número de habitación del huésped'),
  order: z
    .string()
    .describe(
      'Descripción completa del pedido: platos, cantidades y cualquier indicación especial',
    ),
})
export type SmsOrderInput = z.infer<typeof smsOrderInputSchema>

export const smsOrderOutputSchema = z.object({
  success: z.boolean(),
  messageSid: z.string().optional(),
  to: z.string().optional(),
  error: z.string().optional(),
})
export type SmsOrderOutput = z.infer<typeof smsOrderOutputSchema>
