import { createTool } from '@mastra/core/tools'
import {
  type RoomInfo,
  getRoomInfoInputSchema,
  getRoomInfoOutputSchema,
} from '../../entities/room-attendant.js'

// ── Mocked room catalogue ────────────────────────────────────────────────────
// Covers a representative sample of room categories. In production this would
// be a live lookup against the PMS (Property Management System).

const rooms: RoomInfo[] = [
  {
    roomNumber: '101',
    floor: 1,
    category: 'Estándar',
    wifiNetwork: 'HotelEjemplo_Guest',
    wifiPassword: 'Bienvenido2026',
    complimentaryItems: [
      {
        name: 'Agua mineral',
        description: '2 botellas de 50 cl en la nevera, reposición diaria',
      },
      {
        name: 'Café e infusiones',
        description: 'Cápsulas Nespresso + variedad de tés en el escritorio',
      },
      {
        name: 'Bombón de bienvenida',
        description: 'Trufas artesanales de elaboración propia',
      },
    ],
  },
  {
    roomNumber: '215',
    floor: 2,
    category: 'Superior',
    wifiNetwork: 'HotelEjemplo_Guest',
    wifiPassword: 'Bienvenido2026',
    complimentaryItems: [
      {
        name: 'Agua mineral',
        description: '2 botellas de 50 cl en la nevera, reposición diaria',
      },
      {
        name: 'Café e infusiones',
        description: 'Cápsulas Nespresso + variedad de tés',
      },
      {
        name: 'Bombón de bienvenida',
        description: 'Trufas artesanales de elaboración propia',
      },
      {
        name: 'Fruta fresca',
        description: 'Selección de temporada renovada cada día',
      },
    ],
  },
  {
    roomNumber: '312',
    floor: 3,
    category: 'Deluxe Vista Mar',
    wifiNetwork: 'HotelEjemplo_Guest',
    wifiPassword: 'Bienvenido2026',
    complimentaryItems: [
      {
        name: 'Agua mineral',
        description: '2 botellas de 75 cl con gas y sin gas, reposición diaria',
      },
      {
        name: 'Café e infusiones',
        description: 'Cápsulas Nespresso Grand Cru + tés premium',
      },
      {
        name: 'Bombones de bienvenida',
        description: 'Surtido de chocolates belgas',
      },
      {
        name: 'Fruta fresca',
        description: 'Selección de temporada renovada cada día',
      },
      {
        name: 'Minibar básico',
        description: 'Refrescos y zumos de cortesía (reposición única)',
      },
    ],
    notes:
      'Terraza privada con vistas al mar. Servicio de café en terraza disponible previa solicitud.',
  },
  {
    roomNumber: '501',
    floor: 5,
    category: 'Junior Suite',
    wifiNetwork: 'HotelEjemplo_Premium',
    wifiPassword: 'Suite2026*',
    complimentaryItems: [
      {
        name: 'Agua mineral premium',
        description: 'Acqua Panna y S. Pellegrino ilimitadas',
      },
      {
        name: 'Café e infusiones',
        description: 'Máquina Nespresso Vertuo + tés Dammann Frères',
      },
      {
        name: 'Bombones y petit fours',
        description: 'Surtido gourmet renovado cada tarde',
      },
      {
        name: 'Fruta fresca',
        description: 'Cesta de temporada renovada cada día',
      },
      {
        name: 'Minibar completo',
        description:
          'Vinos, cervezas artesanales, refrescos y zumos de cortesía',
      },
      {
        name: 'Amenities premium',
        description: 'Set completo Bulgari en el baño',
      },
    ],
    notes:
      'Mayordomo personal disponible 08:00–22:00. Llamar al 9000 desde el teléfono de la habitación.',
  },
  {
    roomNumber: '801',
    floor: 8,
    category: 'Suite Presidencial',
    wifiNetwork: 'HotelEjemplo_Presidential',
    wifiPassword: 'Presidential2026#',
    complimentaryItems: [
      {
        name: 'Agua mineral premium',
        description: 'Acqua Panna y S. Pellegrino ilimitadas',
      },
      {
        name: 'Café e infusiones',
        description:
          'Máquina Nespresso Vertuo + tés Dammann Frères + servicio de té a solicitud',
      },
      {
        name: 'Selección de bombones',
        description: 'Pralinés artesanos renovados mañana y tarde',
      },
      {
        name: 'Cesta de fruta y snacks gourmet',
        description: 'Renovada diariamente',
      },
      {
        name: 'Minibar completo',
        description:
          'Champán, vinos seleccionados, licores, cervezas y refrescos (todo de cortesía)',
      },
      {
        name: 'Amenities de lujo',
        description: 'Set Hermès en el baño principal y el aseo de cortesía',
      },
      {
        name: 'Ramo de flores de bienvenida',
        description: 'Flores frescas renovadas cada 2 días',
      },
    ],
    notes:
      'Mayordomo personal 24 h (ext. 9000). Terraza privada con jacuzzi. Servicio de limusina incluido.',
  },
]

export const getRoomInfoTool = createTool({
  id: 'get-room-info',
  description:
    'Devuelve la información particular de una habitación: red y contraseña WiFi, artículos de bienvenida y cortesía incluidos, y notas especiales. Úsala cuando el huésped pregunte por el WiFi, qué tienen en la habitación o qué se les ofrece de cortesía.',
  inputSchema: getRoomInfoInputSchema,
  outputSchema: getRoomInfoOutputSchema,
  execute: async ({ roomNumber }) => {
    const room = rooms.find((r) => r.roomNumber === roomNumber)
    if (!room) {
      return {
        found: false,
        error: `No se encontró información para la habitación ${roomNumber}. Puede que el número sea incorrecto o que aún no esté registrada en el sistema.`,
      }
    }
    return { found: true, room }
  },
})
