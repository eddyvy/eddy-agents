import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { guestSchema, type Guest } from '../../entities/guest.js'

const guests = [
  {
    first_name: 'Carlos',
    lastname: 'Martínez',
    email: 'carlos.martinez@email.com',
    phone: '+34600111222',
    language: 'es',
    roomNumber: '101',
  },
  {
    first_name: 'Sophie',
    lastname: 'Dupont',
    email: 'sophie.dupont@email.com',
    phone: '+33612345678',
    language: 'fr',
    roomNumber: null,
  },
  {
    first_name: 'John',
    lastname: 'Doe',
    email: 'contact@johndoe.com',
    phone: process.env.EXAMPLE_PHONE_NUMBER!,
    language: 'es',
    roomNumber: '203',
  },
]

export const getGuest = createTool({
  id: 'get-guest',
  description: 'Retrieves a guest by phone number or email address.',
  inputSchema: z
    .object({
      phone: z.string().optional().describe('Phone number of the guest'),
      email: z.email().optional().describe('Email address of the guest'),
    })
    .refine((data) => data.phone || data.email, {
      message: 'At least one of phone or email must be provided',
    }),
  outputSchema: guestSchema.nullable(),
  execute: async ({ phone, email }) => {
    const guest = guests.find(
      (g) => (phone && g.phone === phone) || (email && g.email === email),
    )

    return guest ?? null
  },
})

/**
 * Direct lookup helper for use in workflow steps and other non-tool contexts.
 */
export async function findGuestByPhone(phone: string): Promise<Guest | null> {
  const guest = guests.find((g) => g.phone === phone)
  return guest ?? null
}

/**
 * Looks up a guest by phone or email. At least one must be provided.
 */
export async function findGuest({
  phone,
  email,
}: {
  phone?: string
  email?: string
}): Promise<Guest | null> {
  const guest = guests.find(
    (g) => (phone && g.phone === phone) || (email && g.email === email),
  )
  return guest ?? null
}
