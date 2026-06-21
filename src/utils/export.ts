import type { ExportData, SavingState } from '@/types'

const EXPORT_VERSION = '1.0.0'

export function exportToJson(state: SavingState): void {
  const exportData: ExportData = {
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
  return (
    typeof d.balance === 'number' &&
    typeof d.points === 'number' &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.wishes) &&
    Array.isArray(d.ownedDecorations) &&
    typeof d.activeDecorations === 'object' &&
    d.activeDecorations !== null &&
    Array.isArray(d.recurringBills) &&
    Array.isArray(d.budgets)
  )
}
