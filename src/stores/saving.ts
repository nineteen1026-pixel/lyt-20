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
} from '@/types'
import { saveToStorage, loadFromStorage } from '@/utils/storage'
import { validateImportData } from '@/utils/export'
import { useCategories } from '@/composables/useCategories'

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
  budgets: [] as CategoryBudget[],
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
  const budgets = ref<CategoryBudget[]>(initialState.budgets)
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
    if (Array.isArray(data.budgets)) budgets.value = data.budgets
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
      budgets: budgets.value,
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
    budgets: budgets.value,
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
    budgets,
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
    budgetStats,
    overspentBudgets,
    nearOverspentBudgets,
    hasOverspentBudgets,
    totalBudgetedExpense,
    totalBudgetedIncome,
    totalBudgetUsed,
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
