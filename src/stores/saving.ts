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

export interface SavingEvent {
  type: 'income' | 'expense' | 'decoration' | 'milestone' | 'wish'
  amount?: number
  message: string
  decorationId?: string
  milestone?: number
  timestamp: number
}

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
  lastMilestone: 0,
}

const milestones = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000]

export const useSavingStore = defineStore('saving', () => {
  const balance = ref(initialState.balance)
  const points = ref(initialState.points)
  const transactions = ref<Transaction[]>(initialState.transactions)
  const wishes = ref<Wish[]>(initialState.wishes)
  const ownedDecorations = ref<string[]>(initialState.ownedDecorations)
  const activeDecorations = ref<ActiveDecorations>(initialState.activeDecorations)
  const lastMilestone = ref(initialState.lastMilestone)
  const recentEvents = ref<SavingEvent[]>([])
  const recentlyUpdatedDecoration = ref<string | null>(null)
  const pointsAnimation = ref({ show: false, amount: 0, startX: 0, startY: 0 })

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

  const nextMilestone = computed(() => {
    return milestones.find(m => m > points.value) || null
  })

  const milestoneProgress = computed(() => {
    const next = nextMilestone.value
    if (!next) return 100
    const prev = milestones.filter(m => m <= points.value).pop() || 0
    const progress = ((points.value - prev) / (next - prev)) * 100
    return Math.min(100, Math.max(0, progress))
  })

  function addEvent(event: Omit<SavingEvent, 'timestamp'>) {
    const fullEvent: SavingEvent = {
      ...event,
      timestamp: Date.now(),
    }
    recentEvents.value.unshift(fullEvent)
    if (recentEvents.value.length > 10) {
      recentEvents.value = recentEvents.value.slice(0, 10)
    }
  }

  function checkMilestone(newPoints: number, oldPoints: number) {
    for (const milestone of milestones) {
      if (oldPoints < milestone && newPoints >= milestone && milestone > lastMilestone.value) {
        lastMilestone.value = milestone
        addEvent({
          type: 'milestone',
          milestone,
          message: `🎉 恭喜！储蓄突破 ¥${milestone} 里程碑！`,
        })
        return milestone
      }
    }
    return null
  }

  function triggerPointsAnimation(amount: number, x: number, y: number) {
    pointsAnimation.value = { show: false, amount: 0, startX: 0, startY: 0 }
    setTimeout(() => {
      pointsAnimation.value = { show: true, amount, startX: x, startY: y }
    }, 10)
  }

  function addTransaction(type: TransactionType, amount: number, categoryId: string, note: string, x = 0, y = 0) {
    const oldPoints = points.value
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
      addEvent({
        type: 'income',
        amount,
        message: `💰 收入 ¥${amount}，积分 +${amount}`,
      })
      triggerPointsAnimation(amount, x, y)
      checkMilestone(points.value, oldPoints)
    } else {
      balance.value -= amount
      addEvent({
        type: 'expense',
        amount,
        message: `💸 支出 ¥${amount}`,
      })
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
    addEvent({
      type: 'wish',
      message: `🌟 新愿望「${name}」已添加，目标 ¥${targetAmount}`,
    })
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
    addEvent({
      type: 'wish',
      amount: actualAmount,
      message: `💝 为「${wish.name}」存入 ¥${actualAmount}`,
    })
    if (wish.currentAmount >= wish.targetAmount) {
      addEvent({
        type: 'wish',
        message: `🎊 愿望「${wish.name}」已达成！`,
      })
    }
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
    recentlyUpdatedDecoration.value = decoration.id

    if (decoration.type === 'wallpaper') {
      activeDecorations.value.wallpaper = decoration.id
    } else if (decoration.type === 'floor') {
      activeDecorations.value.floor = decoration.id
    } else if (decoration.type === 'item') {
      activeDecorations.value.items.push(decoration.id)
    }

    addEvent({
      type: 'decoration',
      decorationId: decoration.id,
      message: `🎨 解锁新装饰「${decoration.name}」！`,
    })

    setTimeout(() => {
      recentlyUpdatedDecoration.value = null
    }, 3000)

    return true
  }

  function toggleDecorationItem(itemId: string) {
    if (!ownedDecorations.value.includes(itemId)) return
    const idx = activeDecorations.value.items.indexOf(itemId)
    if (idx === -1) {
      activeDecorations.value.items.push(itemId)
      recentlyUpdatedDecoration.value = itemId
      setTimeout(() => {
        recentlyUpdatedDecoration.value = null
      }, 2000)
    } else {
      activeDecorations.value.items.splice(idx, 1)
    }
  }

  function setActiveWallpaper(id: string | null) {
    if (id && !ownedDecorations.value.includes(id)) return
    activeDecorations.value.wallpaper = id
    if (id) {
      recentlyUpdatedDecoration.value = id
      setTimeout(() => {
        recentlyUpdatedDecoration.value = null
      }, 2000)
    }
  }

  function setActiveFloor(id: string | null) {
    if (id && !ownedDecorations.value.includes(id)) return
    activeDecorations.value.floor = id
    if (id) {
      recentlyUpdatedDecoration.value = id
      setTimeout(() => {
        recentlyUpdatedDecoration.value = null
      }, 2000)
    }
  }

  function clearRecentEvent(index: number) {
    if (index >= 0 && index < recentEvents.value.length) {
      recentEvents.value.splice(index, 1)
    }
  }

  function loadInitialData(data: Partial<ExportData>) {
    if (typeof data.balance === 'number') balance.value = data.balance
    if (typeof data.points === 'number') points.value = data.points
    if (Array.isArray(data.transactions)) transactions.value = data.transactions
    if (Array.isArray(data.wishes)) wishes.value = data.wishes
    if (Array.isArray(data.ownedDecorations)) ownedDecorations.value = data.ownedDecorations
    if (data.activeDecorations) activeDecorations.value = { ...initialState.activeDecorations, ...data.activeDecorations }
    if (typeof data.lastMilestone === 'number') lastMilestone.value = data.lastMilestone
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
      lastMilestone: lastMilestone.value,
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
    lastMilestone: lastMilestone.value,
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
    lastMilestone,
    recentEvents,
    recentlyUpdatedDecoration,
    pointsAnimation,
    monthlyIncome,
    monthlyExpense,
    nextMilestone,
    milestoneProgress,
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
    clearRecentEvent,
  }
})
