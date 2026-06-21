import { ref, onMounted } from 'vue'
import type { Category, TransactionType } from '@/types'

const categories = ref<{ income: Category[]; expense: Category[] }>({
  income: [],
  expense: [],
})
const loaded = ref(false)

export function useCategories() {
  async function loadCategories() {
    if (loaded.value) return

    try {
      const res = await fetch('/mock/categories.json')
      const data = await res.json()
      categories.value = data
      loaded.value = true
    } catch (e) {
      console.error('Failed to load categories:', e)
    }
  }

  function getCategoryById(id: string): Category | undefined {
    return [...categories.value.income, ...categories.value.expense].find((c) => c.id === id)
  }

  function getCategoriesByType(type: TransactionType): Category[] {
    return categories.value[type] || []
  }

  onMounted(() => {
    loadCategories()
  })

  return {
    categories,
    loaded,
    loadCategories,
    getCategoryById,
    getCategoriesByType,
  }
}
