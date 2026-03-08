import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const menuItems = [
  {
    id: 'club-sandwich',
    category: 'Sandwiches',
    name: 'Club Sandwich',
    description:
      'Triple-decker con pollo a la plancha, bacon crujiente, lechuga, tomate y mayonesa casera. Servido con patatas fritas.',
    price: 18,
  },
  {
    id: 'caesar-salad',
    category: 'Ensaladas',
    name: 'Ensalada César',
    description:
      'Lechuga romana, crutones artesanales, parmesano rallado y aderezo César clásico. Opción con pollo o salmón (+4€).',
    price: 14,
  },
  {
    id: 'pasta-carbonara',
    category: 'Pastas',
    name: 'Tagliatelle Carbonara',
    description:
      'Pasta fresca con guanciale, huevo, pecorino romano y pimienta negra. Sin nata.',
    price: 19,
  },
  {
    id: 'salmon-teriyaki',
    category: 'Principales',
    name: 'Salmón Teriyaki',
    description:
      'Salmón del Atlántico con glaseado teriyaki, arroz de jazmín y verduras de temporada al wok.',
    price: 26,
  },
  {
    id: 'burger-wagyu',
    category: 'Principales',
    name: 'Burger Wagyu',
    description:
      'Hamburguesa de ternera Wagyu (180g), cheddar madurado, cebolla caramelizada, pepinillo y salsa de la casa. Servida con patatas fritas.',
    price: 28,
  },
  {
    id: 'risotto-trufa',
    category: 'Arroces',
    name: 'Risotto de Trufa',
    description:
      'Arroz Carnaroli con trufa negra, parmesano, mantequilla y aceite de trufa. Plato del día de hoy.',
    price: 24,
  },
  {
    id: 'tiramisú',
    category: 'Postres',
    name: 'Tiramisú Clásico',
    description:
      'Receta tradicional italiana con mascarpone, bizcochos empapados en café espresso y cacao.',
    price: 9,
  },
  {
    id: 'tarta-queso',
    category: 'Postres',
    name: 'Tarta de Queso Vasca',
    description:
      'Cremosa y ligeramente quemada por fuera, servida con mermelada de frutos rojos.',
    price: 9,
  },
  {
    id: 'agua',
    category: 'Bebidas',
    name: 'Agua mineral (750ml)',
    description: 'Con o sin gas.',
    price: 4,
  },
  {
    id: 'zumo-naranja',
    category: 'Bebidas',
    name: 'Zumo de naranja natural',
    description: 'Exprimido al momento.',
    price: 6,
  },
  {
    id: 'vino-tinto',
    category: 'Bebidas',
    name: 'Vino tinto (copa)',
    description: 'Selección del sommelier — Ribera del Duero Crianza.',
    price: 8,
  },
]

const todaysRecommendations = [
  {
    itemId: 'risotto-trufa',
    reason:
      'El risotto de trufa es el plato estrella de hoy: hemos recibido trufa negra fresca de temporada esta mañana. No te lo pierdas.',
  },
  {
    itemId: 'tarta-queso',
    reason:
      'La tarta de queso vasca está recién horneada y todavía templada. Perfecta como postre o capricho a cualquier hora.',
  },
  {
    itemId: 'salmon-teriyaki',
    reason:
      'El salmón viene hoy directamente del mercado. Muy fresco y con una presentación especial.',
  },
]

export const getMenuTool = createTool({
  id: 'get-menu',
  description:
    'Obtiene la carta completa del room service y las recomendaciones del chef para hoy. Úsala cuando el huésped pida el menú o quiera saber qué hay disponible.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
      }),
    ),
    recommendations: z.array(
      z.object({
        itemId: z.string(),
        itemName: z.string(),
        reason: z.string(),
      }),
    ),
  }),
  execute: async () => {
    const recommendations = todaysRecommendations.map((rec) => {
      const item = menuItems.find((i) => i.id === rec.itemId)!
      return {
        itemId: rec.itemId,
        itemName: item.name,
        reason: rec.reason,
      }
    })

    return { items: menuItems, recommendations }
  },
})
