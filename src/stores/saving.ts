import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  Transaction,
  Wish,
  Decoration,
  ActiveDecorations,
  TransactionType,
  ExportData,
} from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { validateImportData } from '@/utils/export'

const initialState = {
  balance: 0,
  points: 0,
  transactions: [] as Transaction[],
  wishes: [] as Wish[],
  ownedDecorations: [] as string[],
  activeDecorations: {
    wallpaper: null,
    floor: null,
    items: [] as string[],
  } as ActiveDecorations,
}

export const useSavingStore = defineStore('saving', () => {
  const balance = ref(initialState.balance)
  const points = ref(initialState.points)
  const transactions = ref<Transaction[]>(initialState.transactions)
  const wishes = ref<Wish[]>(initialState.wishes)
  const ownedDecorations = ref<string[]>(initialState.ownedDecorations)
  const activeDecorations = ref<ActiveDecorations>(initialState.activeDecorations)

  const monthlyIncome = computed(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return transactions.value
      .filter((t) => {
        const d = new Date(t.date)
        return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, t) => sum + t.amount, 0)
  })

  const monthlyExpense = computed(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return transactions.value
      .filter((t) => {
        const d = new Date(t.date)
        return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear
      })
      .reduce((sum, t) => sum + t.amount, 0)
  })

  function addTransaction(type: TransactionType, amount: number, categoryId: string, note: string) {
    const transaction: Transaction = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      amount,
      categoryId,
      note,
      date: new Date().toISOString().split('T')[0],
    }
    transactions.value.unshift(transaction)

    if (type === 'income') {
      balance.value += amount
      points.value += amount
    } else {
      balance.value -= amount
    }
  }

  function deleteTransaction(id: string) {
    const idx = transactions.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    const t = transactions.value[idx]
    if (t.type === 'income') {
      balance.value -= t.amount
      points.value -= Math.min(points.value, t.amount)
    } else {
      balance.value += t.amount
    }
    transactions.value.splice(idx, 1)
  }

  function addWish(name: string, icon: string, targetAmount: number, category: Wish['category']) {
    const wish: Wish = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      icon,
      targetAmount,
      currentAmount: 0,
      category,
      createdAt: new Date().toISOString().split('T')[0],
    }
    wishes.value.push(wish)
  }

  function deleteWish(id: string) {
    const idx = wishes.value.findIndex((w) => w.id === id)
    if (idx === -1) return
    const wish = wishes.value[idx]
    balance.value += wish.currentAmount
    wishes.value.splice(idx, 1)
  }

  function depositToWish(id: string, amount: number) {
    const wish = wishes.value.find((w) => w.id === id)
    if (!wish) return
    const actualAmount = Math.min(amount, balance.value, wish.targetAmount - wish.currentAmount)
    if (actualAmount <= 0) return
    wish.currentAmount += actualAmount
    balance.value -= actualAmount
  }

  function withdrawFromWish(id: string, amount: number) {
    const wish = wishes.value.find((w) => w.id === id)
    if (!wish) return
    const actualAmount = Math.min(amount, wish.currentAmount)
    if (actualAmount <= 0) return
    wish.currentAmount -= actualAmount
    balance.value += actualAmount
  }

  function buyDecoration(decoration: Decoration) {
    if (points.value < decoration.price) return false
    if (ownedDecorations.value.includes(decoration.id)) return false

    points.value -= decoration.price
    ownedDecorations.value.push(decoration.id)

    if (decoration.type === 'wallpaper') {
      activeDecorations.value.wallpaper = decoration.id
    } else if (decoration.type === 'floor') {
      activeDecorations.value.floor = decoration.id
    } else if (decoration.type === 'item') {
      activeDecorations.value.items.push(decoration.id)
    }

    return true
  }

  function toggleDecorationItem(itemId: string) {
    if (!ownedDecorations.value.includes(itemId)) return
    const idx = activeDecorations.value.items.indexOf(itemId)
    if (idx === -1) {
      activeDecorations.value.items.push(itemId)
    } else {
      activeDecorations.value.items.splice(idx, 1)
    }
  }

  function setActiveWallpaper(id: string | null) {
    if (id && !ownedDecorations.value.includes(id)) return
    activeDecorations.value.wallpaper = id
  }

  function setActiveFloor(id: string | null) {
    if (id && !ownedDecorations.value.includes(id)) return
    activeDecorations.value.floor = id
  }

  function loadInitialData(data: Partial<ExportData>) {
    if (typeof data.balance === 'number') balance.value = data.balance
    if (typeof data.points === 'number') points.value = data.points
    if (Array.isArray(data.transactions)) transactions.value = data.transactions
    if (Array.isArray(data.wishes)) wishes.value = data.wishes
    if (Array.isArray(data.ownedDecorations)) ownedDecorations.value = data.ownedDecorations
    if (data.activeDecorations) activeDecorations.value = { ...initialState.activeDecorations, ...data.activeDecorations }
  }

  function importData(data: ExportData): boolean {
    if (!validateImportData(data)) return false
    loadInitialData(data)
    return true
  }

  function getExportState(): ExportData {
    return {
      balance: balance.value,
      points: points.value,
      transactions: transactions.value,
      wishes: wishes.value,
      ownedDecorations: ownedDecorations.value,
      activeDecorations: activeDecorations.value,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    }
  }

  const storeState = computed(() => ({
    balance: balance.value,
    points: points.value,
    transactions: transactions.value,
    wishes: wishes.value,
    ownedDecorations: ownedDecorations.value,
    activeDecorations: activeDecorations.value,
  }))

  watch(
    storeState,
    (state) => {
      saveToStorage(state)
    },
    { deep: true }
  )

  function initFromStorage() {
    const saved = loadFromStorage<Partial<ExportData> | null>(null)
    if (saved) {
      loadInitialData(saved)
    }
  }

  return {
    balance,
    points,
    transactions,
    wishes,
    ownedDecorations,
    activeDecorations,
    monthlyIncome,
    monthlyExpense,
    addTransaction,
    deleteTransaction,
    addWish,
    deleteWish,
    depositToWish,
    withdrawFromWish,
    buyDecoration,
    toggleDecorationItem,
    setActiveWallpaper,
    setActiveFloor,
    loadInitialData,
    importData,
    getExportState,
    initFromStorage,
  }
})
