import { z } from 'zod'
import { guestSchema, type Guest } from './guest.js'

export { guestSchema, type Guest }

export const roomOccupantSchema = z.object({
  first_name: z.string(),
  lastname: z.string(),
})
export type RoomOccupant = z.infer<typeof roomOccupantSchema>

export const roomSchema = z.object({
  room_id: z.string(),
  room_name: z.string(),
  adults: z.number(),
  children: z.number(),
  guests: z.array(roomOccupantSchema),
})
export type Room = z.infer<typeof roomSchema>

export const bookingSchema = z.object({
  booking_id: z.string(),
  hotel_name: z.string(),
  status: z.string(), // "new" | "modified" | "canceled"
  currency_code: z.string(),
  source: z.string(),
  total_amount_after_tax: z.number(),
  checkin: z.string(), // YYYY-MM-DD
  checkout: z.string(), // YYYY-MM-DD
  checkin_time: z.string(), // HH:MM
  checkout_time: z.string(), // HH:MM
  adults: z.number(),
  children: z.number(),
  guest: guestSchema,
  rooms: z.array(roomSchema),
})
export type Booking = z.infer<typeof bookingSchema>

// Las 4 plantillas disponibles — aparecen como desplegable en Mastra Studio
export const templateEnum = z.enum([
  'welcome',
  'events',
  'room-service',
  'checkout',
])
export type TemplateId = z.infer<typeof templateEnum>

export const notificationResultSchema = z.object({
  booking_id: z.string(),
  sent: z.boolean(),
  template: z.string().optional(),
  messageSid: z.string().optional(),
  reason: z.string().optional(),
})
export type NotificationResult = z.infer<typeof notificationResultSchema>
