import {
  Briefcase,
  Gift,
  TrendingUp,
  PiggyBank,
  PlusCircle,
  Utensils,
  ShoppingCart,
  Bus,
  Gamepad2,
  Coffee,
  Heart,
  MoreHorizontal,
} from 'lucide-vue-next'
import type { Component } from 'vue'

export const iconMap: Record<string, Component> = {
  'briefcase': Briefcase,
  'gift': Gift,
  'trending-up': TrendingUp,
  'piggy-bank': PiggyBank,
  'plus-circle': PlusCircle,
  'utensils': Utensils,
  'shopping-cart': ShoppingCart,
  'bus': Bus,
  'gamepad-2': Gamepad2,
  'coffee': Coffee,
  'heart': Heart,
  'more-horizontal': MoreHorizontal,
}

export function getIconComponent(iconName: string): Component | null {
  return iconMap[iconName] || null
}
