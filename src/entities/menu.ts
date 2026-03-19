import { z } from 'zod'

export const menuItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
})
export type MenuItem = z.infer<typeof menuItemSchema>

export const menuRecommendationSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  reason: z.string(),
})
export type MenuRecommendation = z.infer<typeof menuRecommendationSchema>

export const menuOutputSchema = z.object({
  items: z.array(menuItemSchema),
  recommendations: z.array(menuRecommendationSchema),
})
export type MenuOutput = z.infer<typeof menuOutputSchema>
