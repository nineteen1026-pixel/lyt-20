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

export interface Wish {
  id: string
  name: string
  icon: string
  targetAmount: number
  currentAmount: number
  category: WishCategory
  createdAt: string
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

export interface ExportData extends SavingState {
  version: string
  exportedAt: string
}
