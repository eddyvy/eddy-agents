import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import twilio from 'twilio'
import { sendWhatsApp } from '../tools/send-whatsapp.js'
import {
  bookingSchema,
  type Booking,
  templateEnum,
  notificationResultSchema,
} from '../../entities/booking.js'
import { hotelAgent } from '../agents/hotel-agent.js'

// ─────────────────────────────────────────────
// Memory helper — persists a sent notification
// into the hotel agent's memory so the agent
// has context when the guest starts a chat.
// Uses the guest phone number as both resourceId
// and threadId (one thread per guest).
// ─────────────────────────────────────────────

async function saveNotificationToMemory(
  to: string,
  fullName: string,
  description: string,
): Promise<string | null> {
  try {
    const memory = await hotelAgent.getMemory()
    if (!memory) return null

    const threadId = to
    const resourceId = to

    const existingThread = await memory.getThreadById({ threadId })
    if (!existingThread) {
      await memory.saveThread({
        thread: {
          id: threadId,
          resourceId,
          createdAt: new Date(),
          updatedAt: new Date(),
          title: `Huésped: ${fullName}`,
        },
      })
    }

    const messageId = `notif-${to}-${Date.now()}`
    await memory.saveMessages({
      messages: [
        {
          id: messageId,
          role: 'assistant',
          content: {
            format: 2 as const,
            parts: [{ type: 'text' as const, text: description }],
          },
          createdAt: new Date(),
          threadId,
          resourceId,
        },
      ],
    })
    return messageId
  } catch (err) {
    console.warn(
      '[send-notifications] Failed to save notification to memory:',
      err,
    )
    return null
  }
}

async function rollbackNotificationFromMemory(
  messageId: string,
): Promise<void> {
  try {
    const memory = await hotelAgent.getMemory()
    if (!memory) return
    await memory.deleteMessages([messageId])
  } catch (err) {
    console.warn('[send-notifications] Failed to rollback memory entry:', err)
  }
}

// ─────────────────────────────────────────────
// Template resolver — fetches a Twilio Content
// template and replaces {{1}}, {{2}}, … with
// the actual variable values.
// ─────────────────────────────────────────────

async function resolveTwilioTemplate(
  contentSid: string,
  vars: Record<string, string>,
): Promise<string> {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    )
    const content = await client.content.v1.contents(contentSid).fetch()
    for (const typeContent of Object.values(content.types)) {
      const body = (typeContent as Record<string, unknown>)?.body
      if (typeof body === 'string') {
        return body.replace(
          /\{\{(\d+)\}\}/g,
          (_, key: string) => vars[key] ?? `{{${key}}}`,
        )
      }
    }
    return `[Plantilla ${contentSid}]`
  } catch (err) {
    console.warn('[send-notifications] Failed to fetch Twilio template:', err)
    return `[Plantilla ${contentSid}]`
  }
}

// ─────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────

/**
 * Parses a "YYYY-MM-DD" string into a UTC Date at midnight.
 */
function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!))
}

/**
 * Returns today's date at UTC midnight (ignoring time-of-day).
 */
function todayUTC(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

/**
 * Returns how many calendar days ago `dateStr` was relative to today (UTC).
 * Positive → in the past, 0 → today, negative → in the future.
 */
function daysAgo(dateStr: string): number {
  const today = todayUTC()
  const target = parseDateUTC(dateStr)
  return Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  )
}

/**
 * Returns how many hours ago the check-in datetime was (as a decimal number).
 * Positive → in the past, negative → in the future.
 */
function checkinHoursAgo(checkin: string, checkinTime: string): number {
  const [hour, minute] = checkinTime.split(':').map(Number)
  const [year, month, day] = checkin.split('-').map(Number)
  const checkinDate = new Date(
    Date.UTC(year!, month! - 1, day!, hour!, minute!, 0),
  )
  const now = new Date()
  return (now.getTime() - checkinDate.getTime()) / (1000 * 60 * 60)
}

// ─────────────────────────────────────────────
// Step 1 — Fetch bookings from external API
// ─────────────────────────────────────────────

const fetchBookingsStep = createStep({
  id: 'fetch-bookings',
  description:
    'Retrieves the bookings array from the external reservations API',
  inputSchema: z.object({
    template: templateEnum.describe(
      'Plantilla de WhatsApp a enviar a los huéspedes',
    ),
  }),
  outputSchema: z.object({
    bookings: z.array(bookingSchema),
    selectedTemplate: templateEnum,
  }),
  execute: async ({ inputData }) => {
    // ── MOCK: datos de prueba para disparar la plantilla de room service ────
    // Check-in hace 2 días (2026-03-05), checkout futuro (2026-03-09).
    // Elimina este bloque y descomenta el fetch real cuando conectes el PMS.
    const bookings: Booking[] = [
      {
        booking_id: 'RES-TEST-001',
        hotel_name: 'Hotel Ejemplo',
        status: 'new',
        currency_code: 'EUR',
        source: 'booking',
        total_amount_after_tax: 320,
        checkin: '2026-03-05',
        checkout: '2026-03-09',
        checkin_time: '15:00',
        checkout_time: '12:00',
        adults: 2,
        children: 0,
        guest: {
          first_name: 'John',
          lastname: 'Doe',
          email: 'contact@johndoe.com',
          phone: process.env.EXAMPLE_PHONE_NUMBER!, // Número de prueba para WhatsApp (en formato E.164, e.g. +34600000000)
          language: 'es',
        },
        rooms: [
          {
            room_id: '101',
            room_name: '101',
            adults: 2,
            children: 0,
            guests: [
              { first_name: 'John', lastname: 'Doe' },
              { first_name: 'Jane', lastname: 'Doe' },
            ],
          },
        ],
      },
    ]
    return { bookings, selectedTemplate: inputData.template }

    // ── CÓDIGO REAL (descomentar cuando el PMS esté disponible) ─────────────
    // const url = inputData.apiUrl || process.env.BOOKINGS_API_URL
    //
    // if (!url) {
    //   throw new Error(
    //     'No API URL provided. Pass apiUrl as workflow input or set the BOOKINGS_API_URL environment variable.',
    //   )
    // }
    //
    // const response = await fetch(url)
    //
    // if (!response.ok) {
    //   throw new Error(
    //     `Bookings API responded with ${response.status}: ${response.statusText}`,
    //   )
    // }
    //
    // const data = (await response.json()) as Booking[]
    //
    // // Validate each booking — invalid items are logged and skipped
    // const bookings: Booking[] = []
    // for (const item of data) {
    //   const result = bookingSchema.safeParse(item)
    //   if (result.success) {
    //     bookings.push(result.data)
    //   } else {
    //     console.warn(
    //       `[bookings-notifications] Skipping malformed booking:`,
    //       result.error.issues,
    //     )
    //   }
    // }
    //
    // return { bookings }
  },
})

// ─────────────────────────────────────────────
// Step 2a — Resolve Twilio template + save to memory
// ─────────────────────────────────────────────

const resolveAndSaveStep = createStep({
  id: 'resolve-and-save',
  description:
    'Resolves the Twilio template text, saves it to hotel-agent memory, and prepares the send payload',
  inputSchema: bookingSchema.extend({ selectedTemplate: templateEnum }),
  outputSchema: z.object({
    booking_id: z.string(),
    skip: z.boolean(),
    skipReason: z.string().optional(),
    savedMessageId: z.string().nullable(),
    contentSid: z.string(),
    vars: z.record(z.string(), z.string()),
    to: z.string(),
    fullName: z.string(),
    selectedTemplate: templateEnum,
  }),
  execute: async ({ inputData: booking }) => {
    const {
      booking_id,
      hotel_name,
      guest,
      checkout_time,
      status,
      selectedTemplate,
    } = booking
    const fullName = `${guest.first_name} ${guest.lastname}`
    const to = guest.phone

    if (status === 'canceled') {
      return {
        booking_id,
        skip: true,
        skipReason: 'Booking is canceled — no notification sent',
        savedMessageId: null,
        contentSid: '',
        vars: {},
        to,
        fullName,
        selectedTemplate,
      }
    }

    const templateConfigs: Record<
      string,
      { contentSid: string; vars: Record<string, string> }
    > = {
      checkout: {
        contentSid: process.env.TWILIO_TEMPLATE_CHECKOUT_SID!,
        vars: { '1': fullName, '2': hotel_name, '3': checkout_time },
      },
      'room-service': {
        contentSid: process.env.TWILIO_TEMPLATE_ROOMSERVICE_SID!,
        vars: {
          '1': fullName,
          '2': hotel_name,
          '3': 'Abierto de 12:00 a 23:00. Y la selección del chef para hoy es de Paletilla de Cordero',
        },
      },
      events: {
        contentSid: process.env.TWILIO_TEMPLATE_EVENTS_SID!,
        vars: {
          '1': fullName,
          '2': hotel_name,
          '3': 'Cata de vinos premium',
        },
      },
      welcome: {
        contentSid: process.env.TWILIO_TEMPLATE_WELCOME_SID!,
        vars: { '1': fullName, '2': hotel_name },
      },
    }

    const config = templateConfigs[selectedTemplate]
    if (!config) {
      return {
        booking_id,
        skip: true,
        skipReason: 'Plantilla no reconocida',
        savedMessageId: null,
        contentSid: '',
        vars: {},
        to,
        fullName,
        selectedTemplate,
      }
    }

    const { contentSid, vars } = config
    const templateText = await resolveTwilioTemplate(contentSid, vars)
    const savedMessageId = await saveNotificationToMemory(
      to,
      fullName,
      templateText,
    )

    return {
      booking_id,
      skip: false,
      savedMessageId,
      contentSid,
      vars,
      to,
      fullName,
      selectedTemplate,
    }
  },
})

// ─────────────────────────────────────────────
// Step 2b — Send WhatsApp
// ─────────────────────────────────────────────

const sendWhatsAppStep = createStep({
  id: 'send-whatsapp',
  description:
    'Sends the WhatsApp template message via Twilio. Catches send errors instead of throwing.',
  inputSchema: z.object({
    booking_id: z.string(),
    skip: z.boolean(),
    skipReason: z.string().optional(),
    savedMessageId: z.string().nullable(),
    contentSid: z.string(),
    vars: z.record(z.string(), z.string()),
    to: z.string(),
    fullName: z.string(),
    selectedTemplate: templateEnum,
  }),
  outputSchema: z.object({
    booking_id: z.string(),
    skip: z.boolean(),
    skipReason: z.string().optional(),
    selectedTemplate: templateEnum,
    messageSid: z.string().optional(),
    sendError: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const {
      booking_id,
      skip,
      skipReason,
      contentSid,
      vars,
      to,
      selectedTemplate,
    } = inputData

    if (skip) {
      return { booking_id, skip: true, skipReason, selectedTemplate }
    }

    try {
      const { messageSid } = await sendWhatsApp({
        to,
        contentSid,
        contentVariables: vars,
      })
      return { booking_id, skip: false, selectedTemplate, messageSid }
    } catch (err) {
      const sendError = err instanceof Error ? err.message : String(err)
      return { booking_id, skip: false, selectedTemplate, sendError }
    }
  },
})

// ─────────────────────────────────────────────
// Step 2c — Rollback on failure / finalize
// ─────────────────────────────────────────────

const rollbackOrFinalizeStep = createStep({
  id: 'rollback-or-finalize',
  description:
    'Rolls back the memory entry if the WhatsApp send failed; returns the final notification result.',
  inputSchema: z.object({
    booking_id: z.string(),
    skip: z.boolean(),
    skipReason: z.string().optional(),
    selectedTemplate: templateEnum,
    messageSid: z.string().optional(),
    sendError: z.string().optional(),
  }),
  outputSchema: notificationResultSchema,
  execute: async ({ inputData, getStepResult }) => {
    const {
      booking_id,
      skip,
      skipReason,
      selectedTemplate,
      messageSid,
      sendError,
    } = inputData

    if (skip) {
      return { booking_id, sent: false, reason: skipReason ?? 'Skipped' }
    }

    if (sendError) {
      const saveResult = getStepResult(resolveAndSaveStep)
      if (saveResult?.savedMessageId) {
        await rollbackNotificationFromMemory(saveResult.savedMessageId)
      }
      return { booking_id, sent: false, reason: sendError }
    }

    return { booking_id, sent: true, template: selectedTemplate, messageSid }
  },
})

// ─────────────────────────────────────────────
// Sub-workflow — one per booking item
// ─────────────────────────────────────────────

const notifyGuestWorkflow = createWorkflow({
  id: 'notify-guest',
  description:
    'Resolves, saves, sends, and finalizes (or rolls back) a single guest notification.',
  inputSchema: bookingSchema.extend({ selectedTemplate: templateEnum }),
  outputSchema: notificationResultSchema,
})
  .then(resolveAndSaveStep)
  .then(sendWhatsAppStep)
  .then(rollbackOrFinalizeStep)
  .commit()

// ─────────────────────────────────────────────
// Workflow assembly
// ─────────────────────────────────────────────

export const sendNotificationsWorkflow = createWorkflow({
  id: 'send-notifications',
  description:
    'Fetches hotel reservations from an API and sends the matching WhatsApp template to each guest via Twilio.',
  inputSchema: z.object({
    template: templateEnum.describe(
      'Selecciona qué plantilla de WhatsApp enviar a los huéspedes',
    ),
  }),
  outputSchema: z.array(notificationResultSchema),
})
  .then(fetchBookingsStep)
  .map(async ({ inputData }) =>
    inputData.bookings.map((booking) => ({
      ...booking,
      selectedTemplate: inputData.selectedTemplate,
    })),
  )
  .foreach(notifyGuestWorkflow)
  .commit()
