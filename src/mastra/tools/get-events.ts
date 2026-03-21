import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { type Event, getEventsOutputSchema } from '../../entities/event.js'

export const events: Event[] = [
  {
    id: 'wine-tasting-mar26',
    name: 'Cata de Vinos Premium',
    description:
      'Degustación guiada de 6 vinos seleccionados de la Ribera del Duero con maridaje de embutidos ibéricos y quesos artesanales. A cargo del sommelier del hotel.',
    date: '2026-03-26',
    time: '19:30',
    location: 'Bodega del Hotel — Planta Baja',
    capacity: 20,
    availableSeats: 8,
    pricePerPerson: 65,
    category: 'Gastronomía',
  },
  {
    id: 'flamenco-show-mar27',
    name: 'Espectáculo Flamenco',
    description:
      'Actuación en vivo de un cuadro flamenco profesional con bailaores, guitarrista y cantaor. Incluye copa de bienvenida.',
    date: '2026-03-27',
    time: '21:00',
    location: 'Salón Andalucía — Planta 1',
    capacity: 50,
    availableSeats: 22,
    pricePerPerson: 45,
    category: 'Cultura & Entretenimiento',
  },
  {
    id: 'yoga-sunrise-mar28',
    name: 'Yoga al Amanecer',
    description:
      'Sesión de yoga y meditación en la terraza del hotel con vistas a la ciudad. Nivel principiante–intermedio. Esterilla incluida.',
    date: '2026-03-28',
    time: '07:30',
    location: 'Terraza — Planta 8',
    capacity: 15,
    availableSeats: 6,
    pricePerPerson: 20,
    category: 'Bienestar',
  },
  {
    id: 'cooking-class-mar29',
    name: 'Taller de Cocina — Tapas Españolas',
    description:
      'Aprende a preparar 5 tapas clásicas de la mano del chef ejecutivo del hotel. Incluye recetario y degustación.',
    date: '2026-03-29',
    time: '11:00',
    location: 'Cocina de Demostración — Planta Baja',
    capacity: 12,
    availableSeats: 4,
    pricePerPerson: 85,
    category: 'Gastronomía',
  },
  {
    id: 'city-tour-mar29',
    name: 'City Tour Privado',
    description:
      'Recorrido guiado en minibús por los principales monumentos de la ciudad. Guía bilingüe (español/inglés). Incluye entrada a 2 museos.',
    date: '2026-03-29',
    time: '10:00',
    location: 'Salida desde Recepción',
    capacity: 10,
    availableSeats: 7,
    pricePerPerson: 55,
    category: 'Excursiones',
  },
]

export const getEventsTool = createTool({
  id: 'get-events',
  description:
    'Devuelve el catálogo de eventos disponibles en el hotel. Úsala para mostrar la oferta al huésped o para buscar el ID de un evento antes de realizar una reserva.',
  inputSchema: z.object({
    category: z
      .string()
      .optional()
      .describe(
        'Filtra por categoría (Gastronomía, Cultura & Entretenimiento, Bienestar, Excursiones). Si se omite, devuelve todos los eventos.',
      ),
  }),
  outputSchema: getEventsOutputSchema,
  execute: async ({ category }) => {
    const filtered = category
      ? events.filter(
          (e) => e.category.toLowerCase() === category.toLowerCase(),
        )
      : events
    return { events: filtered }
  },
})
