import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  Transaction,
  Wish,
  WishPriority,
  Decoration,
  ActiveDecorations,
  TransactionType,
  ExportData,
  RecurringBill,
  RecurrenceCycle,
  CategoryBudget,
  Achievement,
  Room,
} from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { validateImportData } from '@/utils/export'
import { useCategories } from '@/composables/useCategories'
import { useAchievements } from '@/composables/useAchievements'

export interface SavingEvent {
  type: 'income' | 'expense' | 'decoration' | 'milestone' | 'wish'
  amount?: number
  message: string
  decorationId?: string
  milestone?: number
  timestamp: number
}

const defaultRoomId = 'room-default'

const initialState = {
  balance: 0,
  points: 0,
  transactions: [] as Transaction[],
  wishes: [] as Wish[],
  rooms: [
    {
      id: defaultRoomId,
      name: '我的小屋',
      emoji: '🏠',
      ownedDecorations: [] as string[],
      activeDecorations: {
        wallpaper: null,
        floor: null,
        items: [] as string[],
      } as ActiveDecorations,
    },
  ] as Room[],
  currentRoomId: defaultRoomId,
  lastMilestone: 0,
  recurringBills: [] as RecurringBill[],
  lastRecurringCheckDate: '',
  budgets: [] as CategoryBudget[],
}

const milestones = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000]

export const useSavingStore = defineStore('saving', () => {
  const balance = ref(initialState.balance)
  const points = ref(initialState.points)
  const transactions = ref<Transaction[]>(initialState.transactions)
  const wishes = ref<Wish[]>(initialState.wishes)
  const rooms = ref<Room[]>(JSON.parse(JSON.stringify(initialState.rooms)))
  const currentRoomId = ref(initialState.currentRoomId)
  const lastMilestone = ref(initialState.lastMilestone)
  const recurringBills = ref<RecurringBill[]>(initialState.recurringBills)
  const lastRecurringCheckDate = ref(initialState.lastRecurringCheckDate)
  const budgets = ref<CategoryBudget[]>(initialState.budgets)
  const recentEvents = ref<SavingEvent[]>([])
  const recentlyUpdatedDecoration = ref<string | null>(null)
  const pointsAnimation = ref({ show: false, amount: 0, startX: 0, startY: 0 })
  const newlyUnlockedAchievements = ref<Achievement[]>([])
  const showAchievementNotification = ref(false)
  const currentNotificationAchievement = ref<Achievement | null>(null)

  const currentRoom = computed(() => {
    return rooms.value.find(r => r.id === currentRoomId.value) || rooms.value[0]
  })

  const ownedDecorations = computed(() => currentRoom.value.ownedDecorations)
  const activeDecorations = computed(() => currentRoom.value.activeDecorations)

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

  function getCurrentMonthKey(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function getMonthlyAmountByCategory(categoryId: string, type: TransactionType): number {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return transactions.value
      .filter((t) => {
        const d = new Date(t.date)
        return (
          t.type === type &&
          t.categoryId === categoryId &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }

  function getMonthlyExpenseByCategory(categoryId: string): number {
    return getMonthlyAmountByCategory(categoryId, 'expense')
  }

  function getMonthlyIncomeByCategory(categoryId: string): number {
    return getMonthlyAmountByCategory(categoryId, 'income')
  }

  function getBudgetByCategory(categoryId: string): CategoryBudget | undefined {
    return budgets.value.find((b) => b.categoryId === categoryId)
  }

  function setBudget(categoryId: string, amount: number) {
    const existing = budgets.value.find((b) => b.categoryId === categoryId)
    if (amount <= 0) {
      const idx = budgets.value.findIndex((b) => b.categoryId === categoryId)
      if (idx !== -1) {
        budgets.value.splice(idx, 1)
      }
      return
    }
    if (existing) {
      existing.amount = amount
    } else {
      budgets.value.push({ categoryId, amount })
    }
  }

  function removeBudget(categoryId: string) {
    const idx = budgets.value.findIndex((b) => b.categoryId === categoryId)
    if (idx !== -1) {
      budgets.value.splice(idx, 1)
    }
  }

  interface BudgetStat {
    categoryId: string
    categoryType: TransactionType
    budgetAmount: number
    usedAmount: number
    remainingAmount: number
    usedPercent: number
    isOverspent: boolean
    isNearOverspent: boolean
  }

  const budgetStats = computed<BudgetStat[]>(() => {
    return budgets.value.map((budget) => {
      const category = [...useCategories().categories.value.income, ...useCategories().categories.value.expense]
        .find((c) => c.id === budget.categoryId)
      const type: TransactionType = category?.type || 'expense'
      const used = getMonthlyAmountByCategory(budget.categoryId, type)
      const remaining = budget.amount - used
      const percent = budget.amount > 0 ? (used / budget.amount) * 100 : 0
      return {
        categoryId: budget.categoryId,
        categoryType: type,
        budgetAmount: budget.amount,
        usedAmount: used,
        remainingAmount: Math.max(0, remaining),
        usedPercent: Math.min(100, Math.max(0, percent)),
        isOverspent: used > budget.amount,
        isNearOverspent: percent >= 80 && used <= budget.amount,
      }
    })
  })

  const overspentBudgets = computed(() => budgetStats.value.filter((b) => b.isOverspent))
  const nearOverspentBudgets = computed(() => budgetStats.value.filter((b) => b.isNearOverspent))
  const hasOverspentBudgets = computed(() => overspentBudgets.value.length > 0)

  function checkAndNotifyBudgetOverspent(categoryId: string, categoryName: string) {
    const stat = budgetStats.value.find((b) => b.categoryId === categoryId)
    if (!stat || !stat.isOverspent) return

    const budget = getBudgetByCategory(categoryId)
    if (!budget) return

    const monthKey = getCurrentMonthKey()
    if (budget.lastNotifiedOverspendMonth === monthKey) return

    budget.lastNotifiedOverspendMonth = monthKey

    const typeText = stat.categoryType === 'income' ? '收入' : '支出'
    const overspendAmount = stat.usedAmount - stat.budgetAmount

    addEvent({
      type: stat.categoryType === 'income' ? 'income' : 'expense',
      amount: overspendAmount,
      message: `⚠️ 本月「${categoryName}」${typeText}已超预算！已${stat.categoryType === 'income' ? '入账' : '用'} ¥${stat.usedAmount.toFixed(0)}，预算 ¥${stat.budgetAmount.toFixed(0)}，超${stat.categoryType === 'income' ? '额' : '支'} ¥${overspendAmount.toFixed(0)}`,
    })
  }

  function checkAndNotifyAllOverspentBudgets() {
    const { getCategoryById } = useCategories()
    for (const stat of overspentBudgets.value) {
      const categoryName = getCategoryById(stat.categoryId)?.name || '其他'
      checkAndNotifyBudgetOverspent(stat.categoryId, categoryName)
    }
  }

  const totalBudgetedExpense = computed(() => {
    return budgetStats.value.filter(b => b.categoryType === 'expense').reduce((sum, b) => sum + b.budgetAmount, 0)
  })

  const totalBudgetedIncome = computed(() => {
    return budgetStats.value.filter(b => b.categoryType === 'income').reduce((sum, b) => sum + b.budgetAmount, 0)
  })

  const totalBudgetUsed = computed(() => {
    return budgetStats.value.reduce((sum, b) => sum + b.usedAmount, 0)
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

  const reportMonthKeys = computed<Set<string>>(() => {
    const keys = new Set<string>()
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return keys
  })

  const reportPeriodLabel = computed(() => {
    const keys = Array.from(reportMonthKeys.value)
    if (keys.length === 0) return ''
    const start = keys[0]
    const end = keys[keys.length - 1]
    const startLabel = `${parseInt(start.split('-')[0])}.${parseInt(start.split('-')[1])}月`
    const endLabel = `${parseInt(end.split('-')[0])}.${parseInt(end.split('-')[1])}月`
    return start === end ? startLabel : `${startLabel} - ${endLabel}`
  })

  function isTransactionInReportPeriod(tx: Transaction): boolean {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return reportMonthKeys.value.has(key)
  }

  interface MonthlyTrendItem {
    month: string
    monthLabel: string
    income: number
    expense: number
    balance: number
  }

  const monthlyTrend = computed<MonthlyTrendItem[]>(() => {
    const months: Map<string, MonthlyTrendItem> = new Map()
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.set(key, {
        month: key,
        monthLabel: `${d.getMonth() + 1}月`,
        income: 0,
        expense: 0,
        balance: 0,
      })
    }
    for (const tx of transactions.value) {
      if (!isTransactionInReportPeriod(tx)) continue
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (months.has(key)) {
        const item = months.get(key)!
        if (tx.type === 'income') {
          item.income += tx.amount
        } else {
          item.expense += tx.amount
        }
        item.balance = item.income - item.expense
      }
    }
    return Array.from(months.values())
  })

  interface CategoryStat {
    categoryId: string
    categoryName: string
    categoryColor: string
    categoryIcon: string
    amount: number
    percent: number
    count: number
  }

  function getCategoryStats(type: TransactionType): CategoryStat[] {
    const { getCategoryById } = useCategories()
    const totalMap = new Map<string, CategoryStat>()
    let totalAmount = 0
    for (const tx of transactions.value) {
      if (tx.type !== type) continue
      if (!isTransactionInReportPeriod(tx)) continue
      const cat = getCategoryById(tx.categoryId)
      if (!totalMap.has(tx.categoryId)) {
        totalMap.set(tx.categoryId, {
          categoryId: tx.categoryId,
          categoryName: cat?.name || '其他',
          categoryColor: cat?.color || '#9CA3AF',
          categoryIcon: cat?.icon || '',
          amount: 0,
          percent: 0,
          count: 0,
        })
      }
      const stat = totalMap.get(tx.categoryId)!
      stat.amount += tx.amount
      stat.count += 1
      totalAmount += tx.amount
    }
    const result = Array.from(totalMap.values())
    for (const stat of result) {
      stat.percent = totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0
    }
    return result.sort((a, b) => b.amount - a.amount)
  }

  const expenseCategoryStats = computed(() => getCategoryStats('expense'))
  const incomeCategoryStats = computed(() => getCategoryStats('income'))

  interface WishStats {
    totalCount: number
    achievedCount: number
    inProgressCount: number
    achievedRate: number
    totalTargetAmount: number
    totalCurrentAmount: number
    overallProgress: number
  }

  const wishStats = computed<WishStats>(() => {
    const totalCount = wishes.value.length
    const achievedCount = wishes.value.filter(w => w.currentAmount >= w.targetAmount).length
    const inProgressCount = totalCount - achievedCount
    const totalTargetAmount = wishes.value.reduce((s, w) => s + w.targetAmount, 0)
    const totalCurrentAmount = wishes.value.reduce((s, w) => s + w.currentAmount, 0)
    const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0
    const achievedRate = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0
    return {
      totalCount,
      achievedCount,
      inProgressCount,
      achievedRate,
      totalTargetAmount,
      totalCurrentAmount,
      overallProgress,
    }
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

    setTimeout(() => {
      checkAndTriggerAchievements()
    }, 100)

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
      const { getCategoryById } = useCategories()
      const categoryName = getCategoryById(record.bill.categoryId)?.name || '其他'
      checkAndNotifyBudgetOverspent(record.bill.categoryId, categoryName)
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

  function getAchievementStats() {
    const totalIncome = transactions.value
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const achievedWishes = wishes.value.filter((w) => w.currentAmount >= w.targetAmount).length
    const activeWishes = wishes.value.filter((w) => w.currentAmount < w.targetAmount).length

    const now = new Date()
    let monthsWithSurplus = 0
    for (let i = 0; i < 12; i++) {
      const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`
      const monthIncome = transactions.value
        .filter((t) => t.type === 'income' && t.date.startsWith(monthKey))
        .reduce((sum, t) => sum + t.amount, 0)
      const monthExpense = transactions.value
        .filter((t) => t.type === 'expense' && t.date.startsWith(monthKey))
        .reduce((sum, t) => sum + t.amount, 0)
      if (monthIncome > monthExpense && monthIncome > 0) {
        monthsWithSurplus++
      } else if (monthIncome > 0 || monthExpense > 0) {
        break
      }
    }

    let consecutiveNoOverspend = 0
    if (budgets.value.length > 0) {
      for (let i = 0; i < 12; i++) {
        const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`
        let hasOverspend = false
        for (const budget of budgets.value) {
          const used = getMonthlyAmountByCategory(budget.categoryId, 'expense')
          if (used > budget.amount) {
            hasOverspend = true
            break
          }
        }
        if (!hasOverspend) {
          consecutiveNoOverspend++
        } else {
          break
        }
      }
    }

    const recurringCount = recurringBills.value.filter((b) => b.isActive).length

    return {
      totalIncome,
      totalTransactions: transactions.value.length,
      wishesAchieved: achievedWishes,
      decorationsOwned: rooms.value.reduce((sum, r) => sum + r.ownedDecorations.length, 0),
      monthsWithSurplus,
      consecutiveNoOverspend,
    }
  }

  function checkAndTriggerAchievements() {
    const achievements = useAchievements()
    if (!achievements.loaded.value) return

    const stats = getAchievementStats()
    const newlyUnlocked = achievements.checkAchievements(stats)

    if (newlyUnlocked.length > 0) {
      newlyUnlockedAchievements.value.push(...newlyUnlocked)
      for (const achievement of newlyUnlocked) {
        points.value += achievement.pointsReward
        addEvent({
          type: 'milestone',
          message: `🏆 解锁成就「${achievement.name}」！奖励积分 +${achievement.pointsReward}`,
        })
      }
      showNextAchievementNotification()
    }
  }

  function showNextAchievementNotification() {
    if (newlyUnlockedAchievements.value.length > 0 && !showAchievementNotification.value) {
      currentNotificationAchievement.value = newlyUnlockedAchievements.value[0]
      showAchievementNotification.value = true
    }
  }

  function dismissAchievementNotification() {
    if (currentNotificationAchievement.value) {
      const achievements = useAchievements()
      achievements.markAsDisplayed(currentNotificationAchievement.value.id)
      newlyUnlockedAchievements.value.shift()
    }
    showAchievementNotification.value = false
    currentNotificationAchievement.value = null
    setTimeout(() => {
      showNextAchievementNotification()
    }, 300)
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

    setTimeout(() => {
      checkAndTriggerAchievements()
    }, 100)
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

  function addWish(
    name: string,
    icon: string,
    targetAmount: number,
    category: Wish['category'],
    deadline?: string,
    priority: WishPriority = 'medium'
  ) {
    const wish: Wish = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      icon,
      targetAmount,
      currentAmount: 0,
      category,
      createdAt: new Date().toISOString().split('T')[0],
      deadline,
      priority,
    }
    wishes.value.push(wish)
    addEvent({
      type: 'wish',
      message: `🌟 新愿望「${name}」已添加，目标 ¥${targetAmount}`,
    })

    setTimeout(() => {
      checkAndTriggerAchievements()
    }, 100)
  }

  function getDaysUntilDeadline(deadline?: string): number | null {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(deadline)
    due.setHours(0, 0, 0, 0)
    const diffTime = due.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  function getPriorityWeight(priority?: WishPriority): number {
    const p = priority || 'medium'
    const weights: Record<WishPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    }
    return weights[p]
  }

  function getWishUrgencyScore(wish: Wish): number {
    const priorityScore = getPriorityWeight(wish.priority) * 100
    const daysLeft = getDaysUntilDeadline(wish.deadline)
    if (daysLeft === null) return priorityScore
    if (daysLeft < 0) return priorityScore + 1000
    if (daysLeft <= 3) return priorityScore + 500 - daysLeft * 50
    if (daysLeft <= 7) return priorityScore + 200 - daysLeft * 10
    if (daysLeft <= 30) return priorityScore + 100 - daysLeft
    return priorityScore - daysLeft * 0.5
  }

  function isWishNearDeadline(wish: Wish): boolean {
    const daysLeft = getDaysUntilDeadline(wish.deadline)
    if (daysLeft === null) return false
    return daysLeft <= 7 && daysLeft >= 0
  }

  function isWishOverdue(wish: Wish): boolean {
    const daysLeft = getDaysUntilDeadline(wish.deadline)
    return daysLeft !== null && daysLeft < 0
  }

  function getDailySavingsNeeded(wish: Wish): number | null {
    const daysLeft = getDaysUntilDeadline(wish.deadline)
    if (daysLeft === null || daysLeft <= 0) return null
    const remaining = wish.targetAmount - wish.currentAmount
    if (remaining <= 0) return 0
    return remaining / daysLeft
  }

  function updateWish(id: string, updates: Partial<Pick<Wish, 'name' | 'icon' | 'targetAmount' | 'category' | 'deadline' | 'priority'>>) {
    const wish = wishes.value.find(w => w.id === id)
    if (!wish) return
    Object.assign(wish, updates)
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

    setTimeout(() => {
      checkAndTriggerAchievements()
    }, 100)
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
    if (currentRoom.value.ownedDecorations.includes(decoration.id)) return false

    points.value -= decoration.price
    currentRoom.value.ownedDecorations.push(decoration.id)
    recentlyUpdatedDecoration.value = decoration.id

    if (decoration.type === 'wallpaper') {
      currentRoom.value.activeDecorations.wallpaper = decoration.id
    } else if (decoration.type === 'floor') {
      currentRoom.value.activeDecorations.floor = decoration.id
    } else if (decoration.type === 'item') {
      currentRoom.value.activeDecorations.items.push(decoration.id)
    }

    addEvent({
      type: 'decoration',
      decorationId: decoration.id,
      message: `🎨 解锁新装饰「${decoration.name}」！`,
    })

    setTimeout(() => {
      recentlyUpdatedDecoration.value = null
    }, 3000)

    setTimeout(() => {
      checkAndTriggerAchievements()
    }, 100)

    return true
  }

  function toggleDecorationItem(itemId: string) {
    if (!currentRoom.value.ownedDecorations.includes(itemId)) return
    const idx = currentRoom.value.activeDecorations.items.indexOf(itemId)
    if (idx === -1) {
      currentRoom.value.activeDecorations.items.push(itemId)
      recentlyUpdatedDecoration.value = itemId
      setTimeout(() => {
        recentlyUpdatedDecoration.value = null
      }, 2000)
    } else {
      currentRoom.value.activeDecorations.items.splice(idx, 1)
    }
  }

  function setActiveWallpaper(id: string | null) {
    if (id && !currentRoom.value.ownedDecorations.includes(id)) return
    currentRoom.value.activeDecorations.wallpaper = id
    if (id) {
      recentlyUpdatedDecoration.value = id
      setTimeout(() => {
        recentlyUpdatedDecoration.value = null
      }, 2000)
    }
  }

  function setActiveFloor(id: string | null) {
    if (id && !currentRoom.value.ownedDecorations.includes(id)) return
    currentRoom.value.activeDecorations.floor = id
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

  function addRoom(name: string, emoji: string) {
    const id = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const room: Room = {
      id,
      name,
      emoji,
      ownedDecorations: [],
      activeDecorations: { wallpaper: null, floor: null, items: [] },
    }
    rooms.value.push(room)
    currentRoomId.value = id
    addEvent({
      type: 'decoration',
      message: `🏠 新房间「${emoji} ${name}」已创建！`,
    })
    return room
  }

  function deleteRoom(id: string) {
    if (rooms.value.length <= 1) return false
    const idx = rooms.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    const room = rooms.value[idx]
    rooms.value.splice(idx, 1)
    if (currentRoomId.value === id) {
      currentRoomId.value = rooms.value[0].id
    }
    addEvent({
      type: 'decoration',
      message: `🗑️ 房间「${room.emoji} ${room.name}」已删除`,
    })
    return true
  }

  function switchRoom(id: string) {
    const room = rooms.value.find(r => r.id === id)
    if (!room) return
    currentRoomId.value = id
  }

  function renameRoom(id: string, name: string, emoji?: string) {
    const room = rooms.value.find(r => r.id === id)
    if (!room) return
    room.name = name
    if (emoji !== undefined) room.emoji = emoji
  }

  function loadInitialData(data: Partial<ExportData>) {
    if (typeof data.balance === 'number') balance.value = data.balance
    if (typeof data.points === 'number') points.value = data.points
    if (Array.isArray(data.transactions)) transactions.value = data.transactions
    if (Array.isArray(data.wishes)) wishes.value = data.wishes
    if (typeof data.lastMilestone === 'number') lastMilestone.value = data.lastMilestone
    if (Array.isArray(data.recurringBills)) recurringBills.value = data.recurringBills
    if (typeof data.lastRecurringCheckDate === 'string') lastRecurringCheckDate.value = data.lastRecurringCheckDate
    if (Array.isArray(data.budgets)) budgets.value = data.budgets

    if (Array.isArray(data.rooms) && data.rooms.length > 0) {
      rooms.value = data.rooms
      currentRoomId.value = data.currentRoomId || data.rooms[0].id
    } else if (Array.isArray((data as Record<string, unknown>).ownedDecorations) || (data as Record<string, unknown>).activeDecorations) {
      const oldOwned = (data as Record<string, unknown>).ownedDecorations as string[] || []
      const oldActive = (data as Record<string, unknown>).activeDecorations as ActiveDecorations || { wallpaper: null, floor: null, items: [] }
      rooms.value = [{
        id: defaultRoomId,
        name: '我的小屋',
        emoji: '🏠',
        ownedDecorations: oldOwned,
        activeDecorations: { ...initialState.rooms[0].activeDecorations, ...oldActive },
      }]
      currentRoomId.value = defaultRoomId
    }

    if (data.unlockedAchievements || data.stats) {
      const achievements = useAchievements()
      achievements.loadAchievementState({
        unlockedAchievements: data.unlockedAchievements,
        stats: data.stats,
      })
    }
  }

  function importData(data: ExportData): boolean {
    if (!validateImportData(data)) return false
    loadInitialData(data)
    return true
  }

  function getExportState(): ExportData {
    const achievements = useAchievements()
    const achievementState = achievements.getAchievementState()

    return {
      balance: balance.value,
      points: points.value,
      transactions: transactions.value,
      wishes: wishes.value,
      rooms: rooms.value,
      currentRoomId: currentRoomId.value,
      lastMilestone: lastMilestone.value,
      recurringBills: recurringBills.value,
      lastRecurringCheckDate: lastRecurringCheckDate.value,
      budgets: budgets.value,
      unlockedAchievements: achievementState.unlockedAchievements,
      stats: achievementState.stats,
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
    }
  }

  const storeState = computed(() => {
    const achievements = useAchievements()
    const achievementState = achievements.getAchievementState()
    return {
      balance: balance.value,
      points: points.value,
      transactions: transactions.value,
      wishes: wishes.value,
      rooms: rooms.value,
      currentRoomId: currentRoomId.value,
      lastMilestone: lastMilestone.value,
      recurringBills: recurringBills.value,
      lastRecurringCheckDate: lastRecurringCheckDate.value,
      budgets: budgets.value,
      unlockedAchievements: achievementState.unlockedAchievements,
      stats: achievementState.stats,
    }
  })

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
    rooms,
    currentRoomId,
    currentRoom,
    ownedDecorations,
    activeDecorations,
    lastMilestone,
    recurringBills,
    lastRecurringCheckDate,
    budgets,
    recentEvents,
    recentlyUpdatedDecoration,
    pointsAnimation,
    newlyUnlockedAchievements,
    showAchievementNotification,
    currentNotificationAchievement,
    dismissAchievementNotification,
    checkAndTriggerAchievements,
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
    budgetStats,
    overspentBudgets,
    nearOverspentBudgets,
    hasOverspentBudgets,
    totalBudgetedExpense,
    totalBudgetedIncome,
    totalBudgetUsed,
    monthlyTrend,
    reportPeriodLabel,
    expenseCategoryStats,
    incomeCategoryStats,
    getCategoryStats,
    wishStats,
    calculateMonthlyAmount,
    addTransaction,
    deleteTransaction,
    addWish,
    updateWish,
    deleteWish,
    depositToWish,
    withdrawFromWish,
    getDaysUntilDeadline,
    getPriorityWeight,
    getWishUrgencyScore,
    isWishNearDeadline,
    isWishOverdue,
    getDailySavingsNeeded,
    buyDecoration,
    toggleDecorationItem,
    setActiveWallpaper,
    setActiveFloor,
    addRoom,
    deleteRoom,
    switchRoom,
    renameRoom,
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    toggleRecurringBill,
    checkAndRecordRecurringBills,
    calculateNextDueDate,
    getDaysUntilDue,
    getRecurringBillsByCategory,
    getMonthlyExpenseByCategory,
    getMonthlyIncomeByCategory,
    getMonthlyAmountByCategory,
    getBudgetByCategory,
    setBudget,
    removeBudget,
    checkAndNotifyBudgetOverspent,
    checkAndNotifyAllOverspentBudgets,
    loadInitialData,
    importData,
    getExportState,
    initFromStorage,
    clearRecentEvent,
  }
})
