import { ref, onMounted } from 'vue'
import type { Decoration } from '@/types'

const allDecorations = ref<Decoration[]>([])
const loaded = ref(false)

export function useDecorations() {
  async function loadDecorations() {
    if (loaded.value) return

    try {
      const res = await fetch('/mock/decorations.json')
      const data = await res.json()
      allDecorations.value = [
        ...(data.wallpapers || []),
        ...(data.floors || []),
        ...(data.items || []),
      ]
      loaded.value = true
    } catch (e) {
      console.error('Failed to load decorations:', e)
    }
  }

  function getDecorationById(id: string): Decoration | undefined {
    return allDecorations.value.find((d) => d.id === id)
  }

  function getDecorationsByType(type: Decoration['type']): Decoration[] {
    return allDecorations.value.filter((d) => d.type === type)
  }

  onMounted(() => {
    loadDecorations()
  })

  return {
    allDecorations,
    loaded,
    loadDecorations,
    getDecorationById,
    getDecorationsByType,
  }
}
