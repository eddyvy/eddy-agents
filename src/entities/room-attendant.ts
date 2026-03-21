import { z } from 'zod'

// ── Room info ────────────────────────────────────────────────────────────────

export const amenitySchema = z.object({
  name: z.string(),
  description: z.string(),
})

export const roomInfoSchema = z.object({
  roomNumber: z.string(),
  floor: z.number(),
  category: z.string(),
  wifiNetwork: z.string(),
  wifiPassword: z.string(),
  complimentaryItems: z
    .array(amenitySchema)
    .describe('Items provided free of charge in the room'),
  notes: z.string().optional().describe('Special notes for this room'),
})
export type RoomInfo = z.infer<typeof roomInfoSchema>

export const getRoomInfoInputSchema = z.object({
  roomNumber: z.string().describe('Room number to look up'),
})

export const getRoomInfoOutputSchema = z.object({
  found: z.boolean(),
  room: roomInfoSchema.optional(),
  error: z.string().optional(),
})

// ── Housekeeping request ─────────────────────────────────────────────────────

export const requestTypeSchema = z.enum([
  'towels',
  'repair',
  'room_change',
  'cleaning',
  'extra_amenities',
  'other',
])
export type RequestType = z.infer<typeof requestTypeSchema>

export const housekeepingRequestInputSchema = z.object({
  roomNumber: z.string().describe('Room number of the guest'),
  guestName: z.string().describe('Full name of the guest'),
  requestType: requestTypeSchema.describe(
    'Category of the request: towels, repair, room_change, cleaning, extra_amenities, other',
  ),
  details: z
    .string()
    .describe(
      'Free-text description of the request, e.g. "2 extra towels", "the AC is making noise", "prefer a quieter floor"',
    ),
  urgency: z
    .enum(['normal', 'urgent'])
    .default('normal')
    .describe(
      'urgent = needs immediate attention (e.g. flooding, broken lock)',
    ),
})
export type HousekeepingRequestInput = z.infer<
  typeof housekeepingRequestInputSchema
>

export const housekeepingRequestOutputSchema = z.object({
  success: z.boolean(),
  requestRef: z.string().optional(),
  messageSid: z.string().optional(),
  to: z.string().optional(),
  error: z.string().optional(),
})
