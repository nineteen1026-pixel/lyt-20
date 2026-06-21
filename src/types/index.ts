export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  icon: string
}

export interface CategoryBudget {
  categoryId: string
  amount: number
  lastNotifiedOverspendMonth?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  note: string
  date: string
}

export type WishCategory = 'jewelry' | 'travel' | 'other'

export type WishPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Wish {
  id: string
  name: string
  icon: string
  targetAmount: number
  currentAmount: number
  category: WishCategory
  createdAt: string
  deadline?: string
  priority?: WishPriority
}

export type DecorationType = 'wallpaper' | 'floor' | 'item'

export interface DecorationStyle {
  backgroundColor?: string
  backgroundImage?: string
  pattern?: string
  gradient?: string
}

export interface Decoration {
  id: string
  name: string
  type: DecorationType
  price: number
  style: DecorationStyle
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  emoji?: string
}

export interface ActiveDecorations {
  wallpaper: string | null
  floor: string | null
  items: string[]
}

export type RecurrenceCycle = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringBill {
  id: string
  name: string
  amount: number
  categoryId: string
  type: TransactionType
  cycle: RecurrenceCycle
  startDate: string
  nextDueDate: string
  endDate?: string
  note: string
  isActive: boolean
  remindDaysBefore: number
  autoRecord: boolean
  lastRecordedDate?: string
  createdAt: string
}

export interface SavingState {
  balance: number
  points: number
  transactions: Transaction[]
  wishes: Wish[]
  ownedDecorations: string[]
  activeDecorations: ActiveDecorations
  lastMilestone: number
  recurringBills: RecurringBill[]
  lastRecurringCheckDate: string
  budgets: CategoryBudget[]
}

export type AchievementCategory = 'saving' | 'milestone' | 'consistency' | 'wish' | 'decoration' | 'budget'

export type AchievementConditionType =
  | 'first_income'
  | 'total_savings'
  | 'milestone_reached'
  | 'consecutive_days'
  | 'wish_achieved'
  | 'wish_count'
  | 'decoration_count'
  | 'budget_strict'
  | 'transaction_count'
  | 'monthly_surplus'
  | 'no_overspend'
  | 'recurring_bill'

export interface AchievementCondition {
  type: AchievementConditionType
  target: number
  description: string
}

export interface Achievement {
  id: string
  name: string
  category: AchievementCategory
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: AchievementCondition
  pointsReward: number
}

export interface UnlockedAchievement {
  achievementId: string
  unlockedAt: string
  displayed: boolean
}

export interface AchievementState {
  unlockedAchievements: UnlockedAchievement[]
  stats: {
    totalIncome: number
    totalTransactions: number
    consecutiveDays: number
    lastActiveDate: string
    wishesAchieved: number
    decorationsOwned: number
    monthsWithSurplus: number
    consecutiveNoOverspend: number
  }
}

export interface SavingState {
  balance: number
  points: number
  transactions: Transaction[]
  wishes: Wish[]
  ownedDecorations: string[]
  activeDecorations: ActiveDecorations
  lastMilestone: number
  recurringBills: RecurringBill[]
  lastRecurringCheckDate: string
  budgets: CategoryBudget[]
}

export interface ExportData extends SavingState, AchievementState {
  version: string
  exportedAt: string
}
