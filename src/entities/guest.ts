import { z } from 'zod'

export const guestSchema = z.object({
  first_name: z.string(),
  lastname: z.string(),
  email: z.email(),
  phone: z.string(),
  language: z.string(),
  roomNumber: z.string().nullable().optional(),
})
export type Guest = z.infer<typeof guestSchema>
