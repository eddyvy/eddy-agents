import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'
import { sendWhatsApp } from '../tools/send-whatsapp.js'
import {
  bookingSchema,
  type Booking,
  templateEnum,
  notificationResultSchema,
} from '../../entities/booking.js'

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
// Step 2 — Evaluate a single booking and send
//           the appropriate WhatsApp template
// ─────────────────────────────────────────────

const evaluateAndNotifyStep = createStep({
  id: 'evaluate-and-notify',
  description:
    'Evaluates a single booking against date/time conditions and sends the matching WhatsApp template',
  inputSchema: bookingSchema.extend({
    selectedTemplate: templateEnum,
  }),
  outputSchema: notificationResultSchema,
  execute: async ({ inputData: booking }) => {
    const {
      booking_id,
      hotel_name,
      guest,
      checkin,
      checkout,
      checkin_time,
      checkout_time,
      status,
      selectedTemplate,
    } = booking

    // Skip canceled bookings
    if (status === 'canceled') {
      return {
        booking_id,
        sent: false,
        reason: 'Booking is canceled — no notification sent',
      }
    }

    const fullName = `${guest.first_name} ${guest.lastname}`
    const to = guest.phone

    // ── DEMO: envía la plantilla seleccionada en el input del workflow ──────
    // ── LÓGICA REAL POR FECHA (descomentar cuando conectes el PMS) ──────────
    // const checkinDays = daysAgo(checkin)
    // const checkoutDays = daysAgo(checkout)
    // const hoursAgoCheckin = checkinHoursAgo(checkin, checkin_time)
    //
    // // Priority 1: Checkout day
    // if (checkoutDays === 0) { ... usar selectedTemplate = 'checkout' ... }
    // // Priority 2: 2 days after check-in → Room service
    // if (checkinDays === 2) { ... usar selectedTemplate = 'room-service' ... }
    // // Priority 3: 1 day after check-in → Events
    // if (checkinDays === 1) { ... usar selectedTemplate = 'events' ... }
    // // Priority 4: ~2 hours after check-in → Welcome (window: 1–3 h)
    // if (hoursAgoCheckin >= 1 && hoursAgoCheckin <= 3) { ... usar selectedTemplate = 'welcome' ... }

    if (selectedTemplate === 'checkout') {
      const contentSid = process.env.TWILIO_TEMPLATE_CHECKOUT_SID!
      const { messageSid } = await sendWhatsApp({
        to,
        contentSid,
        contentVariables: {
          '1': fullName,
          '2': hotel_name,
          '3': checkout_time,
        },
      })
      return { booking_id, sent: true, template: 'checkout', messageSid }
    }

    if (selectedTemplate === 'room-service') {
      const contentSid = process.env.TWILIO_TEMPLATE_ROOMSERVICE_SID!
      const { messageSid } = await sendWhatsApp({
        to,
        contentSid,
        contentVariables: {
          '1': fullName,
          '2': hotel_name,
          '3': 'Abierto de 12:00 a 23:00. Y la selección del chef para hoy es de Paletilla de Cordero',
        },
      })
      return { booking_id, sent: true, template: 'room-service', messageSid }
    }

    if (selectedTemplate === 'events') {
      const contentSid = process.env.TWILIO_TEMPLATE_EVENTS_SID!
      const { messageSid } = await sendWhatsApp({
        to,
        contentSid,
        contentVariables: {
          '1': fullName,
          '2': hotel_name,
          '3': 'Cena de San Valentín a las 20:30',
        },
      })
      return { booking_id, sent: true, template: 'events', messageSid }
    }

    if (selectedTemplate === 'welcome') {
      const contentSid = process.env.TWILIO_TEMPLATE_WELCOME_SID!
      const { messageSid } = await sendWhatsApp({
        to,
        contentSid,
        contentVariables: {
          '1': fullName,
          '2': hotel_name,
        },
      })
      return { booking_id, sent: true, template: 'welcome', messageSid }
    }

    return {
      booking_id,
      sent: false,
      reason: 'Plantilla no reconocida',
    }
  },
})

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
  .foreach(evaluateAndNotifyStep)
  .commit()
