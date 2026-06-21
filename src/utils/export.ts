import type { ExportData, SavingState, Transaction, Wish, Category, AchievementState } from '@/types'

const EXPORT_VERSION = '1.1.0'

function downloadCsv(csvContent: string, filename: string): void {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

interface ReportExportOptions {
  getCategoryById?: (id: string) => Category | undefined
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  options: ReportExportOptions = {}
): void {
  const headers = ['日期', '类型', '分类', '金额', '备注']
  const rows = transactions.map((tx) => {
    const cat = options.getCategoryById?.(tx.categoryId)
    return [
      tx.date,
      tx.type === 'income' ? '收入' : '支出',
      cat?.name || '其他',
      tx.amount.toFixed(2),
      tx.note || '',
    ]
  })
  const csv = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const date = new Date().toISOString().split('T')[0]
  downloadCsv(csv, `交易记录-${date}.csv`)
}

export function exportMonthlyReportToCsv(
  monthlyTrend: { month: string; monthLabel: string; income: number; expense: number; balance: number }[],
  expenseStats: { categoryName: string; amount: number; percent: number; count: number }[],
  incomeStats: { categoryName: string; amount: number; percent: number; count: number }[],
  wishSummary: {
    totalCount: number
    achievedCount: number
    achievedRate: number
    totalTargetAmount: number
    totalCurrentAmount: number
    overallProgress: number
    wishes: { name: string; targetAmount: number; currentAmount: number; progress: number; achieved: boolean }[]
  },
  periodLabel: string
): void {
  const lines: string[] = []
  lines.push(`报表口径,${periodLabel}`)
  lines.push('')
  lines.push('月度收支趋势')
  lines.push(['月份', '收入', '支出', '结余'].map((c) => `"${c}"`).join(','))
  for (const m of monthlyTrend) {
    lines.push([m.monthLabel, m.income.toFixed(2), m.expense.toFixed(2), m.balance.toFixed(2)].map((c) => `"${c}"`).join(','))
  }
  lines.push('')
  lines.push('支出分类统计')
  lines.push(['分类', '金额', '占比(%)', '笔数'].map((c) => `"${c}"`).join(','))
  for (const s of expenseStats) {
    lines.push([s.categoryName, s.amount.toFixed(2), s.percent.toFixed(2), String(s.count)].map((c) => `"${c}"`).join(','))
  }
  lines.push('')
  lines.push('收入分类统计')
  lines.push(['分类', '金额', '占比(%)', '笔数'].map((c) => `"${c}"`).join(','))
  for (const s of incomeStats) {
    lines.push([s.categoryName, s.amount.toFixed(2), s.percent.toFixed(2), String(s.count)].map((c) => `"${c}"`).join(','))
  }
  lines.push('')
  lines.push('愿望达成率汇总')
  lines.push(['总愿望数', '已达成', '达成率(%)', '目标总额', '已存总额', '整体进度(%)'].map((c) => `"${c}"`).join(','))
  lines.push([
    String(wishSummary.totalCount),
    String(wishSummary.achievedCount),
    wishSummary.achievedRate.toFixed(2),
    wishSummary.totalTargetAmount.toFixed(2),
    wishSummary.totalCurrentAmount.toFixed(2),
    wishSummary.overallProgress.toFixed(2),
  ].map((c) => `"${c}"`).join(','))
  lines.push('')
  lines.push('愿望明细')
  lines.push(['愿望名称', '目标金额', '已存金额', '进度(%)', '状态'].map((c) => `"${c}"`).join(','))
  for (const w of wishSummary.wishes) {
    lines.push([
      w.name,
      w.targetAmount.toFixed(2),
      w.currentAmount.toFixed(2),
      w.progress.toFixed(2),
      w.achieved ? '已达成' : '进行中',
    ].map((c) => `"${c}"`).join(','))
  }
  const date = new Date().toISOString().split('T')[0]
  downloadCsv(lines.join('\n'), `月度报表-${date}.csv`)
}

export function exportWishesToCsv(wishes: Wish[]): void {
  const headers = ['愿望名称', '分类', '目标金额', '已存金额', '进度(%)', '优先级', '创建日期', '截止日期']
  const categoryMap: Record<string, string> = {
    jewelry: '首饰',
    travel: '旅行',
    other: '其他',
  }
  const priorityMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  }
  const rows = wishes.map((w) => {
    const progress = w.targetAmount > 0 ? (w.currentAmount / w.targetAmount) * 100 : 0
    return [
      w.name,
      categoryMap[w.category] || '其他',
      w.targetAmount.toFixed(2),
      w.currentAmount.toFixed(2),
      progress.toFixed(2),
      priorityMap[w.priority || 'medium'] || '中',
      w.createdAt,
      w.deadline || '',
    ]
  })
  const csv = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const date = new Date().toISOString().split('T')[0]
  downloadCsv(csv, `愿望清单-${date}.csv`)
}

export function exportToJson(state: SavingState & Partial<AchievementState>): void {
  const exportData: ExportData = {
    unlockedAchievements: [],
    stats: {
      totalIncome: 0,
      totalTransactions: 0,
      consecutiveDays: 0,
      lastActiveDate: '',
      wishesAchieved: 0,
      decorationsOwned: 0,
      monthsWithSurplus: 0,
      consecutiveNoOverspend: 0,
    },
    ...state,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
  }

  const jsonStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  const date = new Date().toISOString().split('T')[0]
  link.download = `saving-cottage-backup-${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function importFromJson(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as ExportData
        resolve(data)
      } catch (err) {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function validateImportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  const baseValid =
    typeof d.balance === 'number' &&
    typeof d.points === 'number' &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.wishes) &&
    Array.isArray(d.ownedDecorations) &&
    typeof d.activeDecorations === 'object' &&
    d.activeDecorations !== null &&
    Array.isArray(d.recurringBills) &&
    Array.isArray(d.budgets)

  if (!baseValid) return false

  if (d.unlockedAchievements !== undefined && !Array.isArray(d.unlockedAchievements)) {
    return false
  }

  if (d.stats !== undefined && (typeof d.stats !== 'object' || d.stats === null)) {
    return false
  }

  return true
}
