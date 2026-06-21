import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  Transaction,
  Wish,
  Decoration,
  ActiveDecorations,
  TransactionType,
  ExportData,
  RecurringBill,
  RecurrenceCycle,
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
  recurringBills: [] as RecurringBill[],
  lastRecurringCheckDate: '',
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
  const recurringBills = ref<RecurringBill[]>(initialState.recurringBills)
  const lastRecurringCheckDate = ref(initialState.lastRecurringCheckDate)
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

  const activeRecurringBills = computed(() => {
    return recurringBills.value.filter(bill => bill.isActive)
  })

  const remindingBills = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return activeRecurringBills.value
      .filter(bill => {
        const dueDate = new Date(bill.nextDueDate)
        dueDate.setHours(0, 0, 0, 0)
        const diffTime = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return daysUntilDue >= 0 && daysUntilDue <= bill.remindDaysBefore
      })
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  })

  const upcomingBills = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    return activeRecurringBills.value
      .filter(bill => {
        const dueDate = new Date(bill.nextDueDate)
        return dueDate >= today && dueDate <= nextWeek
      })
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  })

  const overdueBills = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return activeRecurringBills.value
      .filter(bill => {
        const dueDate = new Date(bill.nextDueDate)
        return dueDate < today
      })
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
  })

  function calculateMonthlyAmount(amount: number, cycle: RecurrenceCycle): number {
    switch (cycle) {
      case 'daily':
        return amount * 30
      case 'weekly':
        return amount * 4.33
      case 'monthly':
        return amount
      case 'yearly':
        return amount / 12
      default:
        return amount
    }
  }

  const monthlyRecurringExpense = computed(() => {
    return activeRecurringBills.value
      .filter(bill => bill.type === 'expense')
      .reduce((sum, bill) => sum + calculateMonthlyAmount(bill.amount, bill.cycle), 0)
  })

  const monthlyRecurringIncome = computed(() => {
    return activeRecurringBills.value
      .filter(bill => bill.type === 'income')
      .reduce((sum, bill) => sum + calculateMonthlyAmount(bill.amount, bill.cycle), 0)
  })

  interface CategoryRecurringStats {
    categoryId: string
    bills: RecurringBill[]
    totalAmount: number
    monthlyAmount: number
  }

  const recurringBillsByCategory = computed(() => {
    const categoriesMap = new Map<string, CategoryRecurringStats>()

    for (const bill of activeRecurringBills.value) {
      if (!categoriesMap.has(bill.categoryId)) {
        categoriesMap.set(bill.categoryId, {
          categoryId: bill.categoryId,
          bills: [],
          totalAmount: 0,
          monthlyAmount: 0,
        })
      }
      const stats = categoriesMap.get(bill.categoryId)!
      stats.bills.push(bill)
      stats.totalAmount += bill.amount
      stats.monthlyAmount += calculateMonthlyAmount(bill.amount, bill.cycle)
    }

    return Array.from(categoriesMap.values()).sort((a, b) => b.monthlyAmount - a.monthlyAmount)
  })

  const expenseRecurringByCategory = computed(() => {
    return recurringBillsByCategory.value.filter(s => s.bills.some(b => b.type === 'expense'))
  })

  const incomeRecurringByCategory = computed(() => {
    return recurringBillsByCategory.value.filter(s => s.bills.some(b => b.type === 'income'))
  })

  function calculateNextDueDate(startDate: string, cycle: RecurrenceCycle): string {
    const date = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let nextDate = new Date(date)
    nextDate.setHours(0, 0, 0, 0)

    while (nextDate < today) {
      switch (cycle) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1)
          break
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7)
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1)
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          break
      }
    }

    return nextDate.toISOString().split('T')[0]
  }

  function getDaysUntilDue(dueDate: string): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  function addRecurringBill(
    name: string,
    amount: number,
    categoryId: string,
    type: TransactionType,
    cycle: RecurrenceCycle,
    startDate: string,
    note: string,
    remindDaysBefore: number,
    autoRecord: boolean,
    endDate?: string
  ) {
    const nextDueDate = calculateNextDueDate(startDate, cycle)
    const bill: RecurringBill = {
      id: `rb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      amount,
      categoryId,
      type,
      cycle,
      startDate,
      nextDueDate,
      endDate,
      note,
      isActive: true,
      remindDaysBefore,
      autoRecord,
      createdAt: new Date().toISOString().split('T')[0],
    }
    recurringBills.value.push(bill)
    addEvent({
      type: 'wish',
      message: `🔄 新增周期性账单「${name}」，${cycle === 'daily' ? '每天' : cycle === 'weekly' ? '每周' : cycle === 'monthly' ? '每月' : '每年'} ¥${amount}`,
    })
    return bill
  }

  function updateRecurringBill(id: string, updates: Partial<RecurringBill>) {
    const bill = recurringBills.value.find(b => b.id === id)
    if (!bill) return

    if (updates.startDate || updates.cycle) {
      const newStartDate = updates.startDate || bill.startDate
      const newCycle = updates.cycle || bill.cycle
      updates.nextDueDate = calculateNextDueDate(newStartDate, newCycle)
    }

    Object.assign(bill, updates)
  }

  function deleteRecurringBill(id: string) {
    const idx = recurringBills.value.findIndex(b => b.id === id)
    if (idx === -1) return
    recurringBills.value.splice(idx, 1)
  }

  function toggleRecurringBill(id: string) {
    const bill = recurringBills.value.find(b => b.id === id)
    if (!bill) return
    bill.isActive = !bill.isActive
  }

  function checkAndRecordRecurringBills() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    if (lastRecurringCheckDate.value === todayStr) return

    const recordsToAdd: { bill: RecurringBill; dueDate: string }[] = []

    for (const bill of activeRecurringBills.value) {
      if (!bill.autoRecord) continue

      let dueDate = new Date(bill.nextDueDate)
      dueDate.setHours(0, 0, 0, 0)

      while (dueDate <= today) {
        if (bill.endDate) {
          const endDate = new Date(bill.endDate)
          endDate.setHours(0, 0, 0, 0)
          if (dueDate > endDate) {
            bill.isActive = false
            break
          }
        }

        recordsToAdd.push({
          bill,
          dueDate: dueDate.toISOString().split('T')[0],
        })

        switch (bill.cycle) {
          case 'daily':
            dueDate.setDate(dueDate.getDate() + 1)
            break
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + 7)
            break
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + 1)
            break
          case 'yearly':
            dueDate.setFullYear(dueDate.getFullYear() + 1)
            break
        }
      }

      bill.nextDueDate = dueDate.toISOString().split('T')[0]
      bill.lastRecordedDate = todayStr
    }

    for (const record of recordsToAdd) {
      addTransaction(
        record.bill.type,
        record.bill.amount,
        record.bill.categoryId,
        `${record.bill.name}（自动记账）${record.bill.note ? ' - ' + record.bill.note : ''}`,
        0,
        0,
        record.dueDate
      )
      addEvent({
        type: record.bill.type,
        amount: record.bill.amount,
        message: `🔄 周期性账单「${record.bill.name}」自动${record.bill.type === 'income' ? '入账' : '扣费'} ¥${record.bill.amount}`,
      })
    }

    lastRecurringCheckDate.value = todayStr
  }

  function getRecurringBillsByCategory(categoryId: string) {
    return recurringBills.value.filter(bill => bill.categoryId === categoryId)
  }

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

  function addTransaction(type: TransactionType, amount: number, categoryId: string, note: string, x = 0, y = 0, date?: string) {
    const oldPoints = points.value
    const transaction: Transaction = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      amount,
      categoryId,
      note,
      date: date || new Date().toISOString().split('T')[0],
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
    if (Array.isArray(data.recurringBills)) recurringBills.value = data.recurringBills
    if (typeof data.lastRecurringCheckDate === 'string') lastRecurringCheckDate.value = data.lastRecurringCheckDate
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
      recurringBills: recurringBills.value,
      lastRecurringCheckDate: lastRecurringCheckDate.value,
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
    recurringBills: recurringBills.value,
    lastRecurringCheckDate: lastRecurringCheckDate.value,
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
    recurringBills,
    lastRecurringCheckDate,
    recentEvents,
    recentlyUpdatedDecoration,
    pointsAnimation,
    monthlyIncome,
    monthlyExpense,
    nextMilestone,
    milestoneProgress,
    activeRecurringBills,
    upcomingBills,
    overdueBills,
    remindingBills,
    monthlyRecurringExpense,
    monthlyRecurringIncome,
    recurringBillsByCategory,
    expenseRecurringByCategory,
    incomeRecurringByCategory,
    calculateMonthlyAmount,
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
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    toggleRecurringBill,
    checkAndRecordRecurringBills,
    calculateNextDueDate,
    getDaysUntilDue,
    getRecurringBillsByCategory,
    loadInitialData,
    importData,
    getExportState,
    initFromStorage,
    clearRecentEvent,
  }
})
