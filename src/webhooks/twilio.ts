import { registerApiRoute } from '@mastra/core/server'
import twilio from 'twilio'

export const twilioWebhookRoute = registerApiRoute('/webhooks/twilio', {
  method: 'POST',
  handler: async (c) => {
    try {
      // Obtén la firma de Twilio del header
      const twilioSignature = c.req.header('x-twilio-signature')
      if (!twilioSignature) throw new Error('Unauthorized')

      // Obtén el auth token de las variables de entorno
      const authToken = process.env.TWILIO_AUTH_TOKEN!
      // Usa la URL pública exacta de tu endpoint
      const url = `${process.env.WEBHOOK_BASE_URL}/webhooks/twilio`

      // Hono puede recibir el body como JSON o como urlencoded (Twilio suele enviar x-www-form-urlencoded)
      let params: Record<string, any> = {}
      const contentType = c.req.header('content-type') || ''
      if (contentType.includes('application/json')) {
        params = await c.req.json()
      } else {
        // Para x-www-form-urlencoded
        const form = await c.req.formData()
        for (const [key, value] of form.entries()) {
          params[key] = value
        }
      }

      // Valida la petición
      const requestIsValid = twilio.validateRequest(
        authToken,
        twilioSignature,
        url,
        params,
      )

      if (!requestIsValid) throw new Error('Unauthorized')

      // Strip the "whatsapp:" prefix Twilio prepends to the sender number
      const phone = (params.From as string).replace(/^whatsapp:/i, '')
      const body = params.Body as string

      // Trigger the reply workflow (fire-and-forget; Twilio expects a fast 200)
      // Dynamic import breaks the circular dependency with src/mastra/index.ts
      const { mastra } = await import('../mastra/index.js')
      const workflow = mastra.getWorkflow('replyWhatsAppWorkflow')
      const run = await workflow.createRun()
      run.start({ inputData: { phone, body } })

      return c.text('<Response>' + run.runId + '</Response>', 200, {
        'Content-Type': 'text/xml',
      })
    } catch (error) {
      return c.text(
        error instanceof Error ? error.message : 'Unauthorized',
        401,
      )
    }
  },
})
