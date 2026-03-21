import { Mastra } from '@mastra/core/mastra'
import { PinoLogger } from '@mastra/loggers'
import {
  Observability,
  DefaultExporter,
  CloudExporter,
  SensitiveDataFilter,
} from '@mastra/observability'
import { PostgresStore } from '@mastra/pg'
import { VercelDeployer } from '@mastra/deployer-vercel'
import { MastraAuthConfig } from '@mastra/core/server'
import { storage } from './storage.js'
import { sendNotificationsWorkflow } from './workflows/send-notifications.js'
import { replyWhatsAppWorkflow } from './workflows/reply-whatsapp.js'
import { roomServiceAgent } from './agents/room-service.js'
import { eventsAgent } from './agents/events-agent.js'
import { hotelInfoAgent } from './agents/hotel-info-agent.js'
import { roomAttendantAgent } from './agents/room-attendant-agent.js'
import { hotelAgent } from './agents/hotel-agent.js'
import { SimpleAuth } from '@mastra/core/server'
import { twilioWebhookRoute } from '../webhooks/twilio.js'

// Define your user type
type User = {
  id: string
  name: string
  role: 'admin' | 'user'
}

const authConfig: MastraAuthConfig<User> = {
  async authenticateToken(token, request) {
    if (token === process.env.SIMPLE_AUTH_TOKEN) {
      return {
        id: 'user-admin',
        name: 'Admin User',
        role: 'admin',
      }
    }
    throw new Error('Invalid token')
  },
  async authorize(path, method, user, context) {
    return true
  },
}

export const mastra = new Mastra({
  deployer: new VercelDeployer(),
  workflows: { sendNotificationsWorkflow, replyWhatsAppWorkflow },
  agents: {
    roomServiceAgent,
    eventsAgent,
    hotelInfoAgent,
    roomAttendantAgent,
    hotelAgent,
  },
  scorers: {},
  storage,
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  server: {
    auth: new SimpleAuth<User>({
      tokens: {
        [process.env.SIMPLE_AUTH_TOKEN || '']: {
          id: 'user-admin',
          name: 'Admin User',
          role: 'admin',
        },
      },
      public: ['/webhooks/twilio'],
    }),
    apiRoutes: [twilioWebhookRoute],
  },
})
