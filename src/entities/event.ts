import { z } from 'zod'

// ── Event catalogue ──────────────────────────────────────────────────────────

export const eventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  date: z.string().describe('ISO 8601 date string'),
  time: z.string().describe('Start time, e.g. "20:00"'),
  location: z.string().describe('Venue inside the hotel'),
  capacity: z.number().describe('Maximum number of attendees'),
  availableSeats: z.number(),
  pricePerPerson: z.number().describe('Price in EUR'),
  category: z.string(),
})
export type Event = z.infer<typeof eventSchema>

export const getEventsOutputSchema = z.object({
  events: z.array(eventSchema),
})
export type GetEventsOutput = z.infer<typeof getEventsOutputSchema>

// ── Booking ──────────────────────────────────────────────────────────────────

export const bookEventInputSchema = z.object({
  eventId: z.string().describe('ID of the event to book'),
  guestName: z.string().describe('Full name of the guest making the booking'),
  roomNumber: z.string().describe('Room number of the guest'),
  numberOfSeats: z.number().int().min(1).describe('Number of seats to reserve'),
})
export type BookEventInput = z.infer<typeof bookEventInputSchema>

export const bookEventOutputSchema = z.object({
  success: z.boolean(),
  bookingRef: z.string().optional().describe('Booking reference code'),
  eventName: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  seatsBooked: z.number().optional(),
  totalPrice: z.number().optional(),
  error: z.string().optional(),
})
export type BookEventOutput = z.infer<typeof bookEventOutputSchema>

// ── SMS notification ─────────────────────────────────────────────────────────

export const smsEventBookingInputSchema = z.object({
  guestName: z.string(),
  roomNumber: z.string(),
  eventName: z.string(),
  date: z.string(),
  time: z.string(),
  location: z.string(),
  seatsBooked: z.number(),
  totalPrice: z.number(),
  bookingRef: z.string(),
})
export type SmsEventBookingInput = z.infer<typeof smsEventBookingInputSchema>
