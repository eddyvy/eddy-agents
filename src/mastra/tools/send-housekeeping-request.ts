import twilio from 'twilio'
import { createTool } from '@mastra/core/tools'
import {
  housekeepingRequestInputSchema,
  housekeepingRequestOutputSchema,
  type RequestType,
} from '../../entities/room-attendant.js'

function normalizePhone(raw: string): string {
  return raw.replace(/^whatsapp:/i, '')
}

function generateRef(): string {
  return 'HK-' + Math.random().toString(36).slice(2, 6).toUpperCase()
}

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  towels: '🛁 REPOSICIÓN DE TOALLAS',
  repair: '🔧 AVERÍA / REPARACIÓN',
  room_change: '🔄 CAMBIO DE HABITACIÓN',
  cleaning: '🧹 LIMPIEZA',
  extra_amenities: '✨ ARTÍCULOS EXTRA',
  other: '📋 SOLICITUD GENERAL',
}

export const sendHousekeepingRequestTool = createTool({
  id: 'send-housekeeping-request',
  description:
    'Envía una solicitud de housekeeping al equipo de planta por SMS (reposición de toallas, comunicar una avería, solicitar cambio de habitación, limpieza, artículos extra, etc.). Úsala en cuanto el huésped haya confirmado los detalles de la solicitud.',
  inputSchema: housekeepingRequestInputSchema,
  outputSchema: housekeepingRequestOutputSchema,
  execute: async ({ roomNumber, guestName, requestType, details, urgency }) => {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    )

    const to = normalizePhone(process.env.EXAMPLE_PHONE_NUMBER!)
    const from = normalizePhone(
      process.env.TWILIO_SMS_FROM ?? process.env.TWILIO_WHATSAPP_FROM!,
    )

    const requestRef = generateRef()
    const label = REQUEST_TYPE_LABELS[requestType]
    const urgencyTag = urgency === 'urgent' ? ' ⚠️ URGENTE' : ''

    const body =
      `${label}${urgencyTag}\n` +
      `Ref: ${requestRef}\n` +
      `Habitación: ${roomNumber} — Huésped: ${guestName}\n` +
      `Detalle: ${details}`

    try {
      const message = await client.messages.create({ from, to, body })
      return { success: true, requestRef, messageSid: message.sid, to }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, error }
    }
  },
})
