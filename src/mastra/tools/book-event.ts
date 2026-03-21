import twilio from 'twilio'
import { createTool } from '@mastra/core/tools'
import {
  bookEventInputSchema,
  bookEventOutputSchema,
  smsEventBookingInputSchema,
  type SmsEventBookingInput,
} from '../../entities/event.js'
import { events } from './get-events.js'

/** Normalise phone — strip "whatsapp:" prefix if present */
function normalizePhone(raw: string): string {
  return raw.replace(/^whatsapp:/i, '')
}

/** Generates a short booking reference, e.g. "EVT-A3F9" */
function generateRef(): string {
  return 'EVT-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export const bookEventTool = createTool({
  id: 'book-event',
  description:
    'Reserva plazas en un evento del hotel para un huésped. Devuelve la confirmación con el número de referencia o un error si no hay disponibilidad.',
  inputSchema: bookEventInputSchema,
  outputSchema: bookEventOutputSchema,
  execute: async ({ eventId, guestName, roomNumber, numberOfSeats }) => {
    const event = events.find((e) => e.id === eventId)

    if (!event) {
      return {
        success: false,
        error: `No se encontró ningún evento con ID "${eventId}".`,
      }
    }

    if (event.availableSeats < numberOfSeats) {
      return {
        success: false,
        error: `Solo quedan ${event.availableSeats} plaza(s) disponibles para "${event.name}".`,
      }
    }

    const bookingRef = generateRef()
    const totalPrice = event.pricePerPerson * numberOfSeats

    // In production this would persist the booking to a database.
    // For now we return the confirmed reservation data.
    return {
      success: true,
      bookingRef,
      eventName: event.name,
      date: event.date,
      time: event.time,
      location: event.location,
      seatsBooked: numberOfSeats,
      totalPrice,
    }
  },
})

export const sendEventBookingSmsTool = createTool({
  id: 'send-event-booking-sms',
  description:
    'Envía una notificación por SMS al equipo de eventos confirmando la reserva de un huésped. Úsala justo después de confirmar una reserva exitosa.',
  inputSchema: smsEventBookingInputSchema,
  outputSchema: bookEventOutputSchema.pick({ success: true as any }).extend({
    messageSid: bookEventOutputSchema.shape.bookingRef.optional(),
    error: bookEventOutputSchema.shape.error,
  }),
  execute: async ({
    guestName,
    roomNumber,
    eventName,
    date,
    time,
    location,
    seatsBooked,
    totalPrice,
    bookingRef,
  }: SmsEventBookingInput) => {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    )

    const to = normalizePhone(process.env.EXAMPLE_PHONE_NUMBER!)
    const from = normalizePhone(
      process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_WHATSAPP_FROM!,
    )

    const body =
      `🎟️ RESERVA EVENTO\n` +
      `Ref: ${bookingRef}\n` +
      `Huésped: ${guestName} — Hab. ${roomNumber}\n` +
      `Evento: ${eventName}\n` +
      `Fecha: ${date} a las ${time}\n` +
      `Lugar: ${location}\n` +
      `Plazas: ${seatsBooked} × ${(totalPrice / seatsBooked).toFixed(2)}€ = ${totalPrice.toFixed(2)}€`

    try {
      const message = await client.messages.create({ from, to, body })
      return { success: true, messageSid: message.sid }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, error }
    }
  },
})
