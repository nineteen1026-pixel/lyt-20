<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2, Plus, Minus, Repeat, ChevronDown, ChevronUp, Calendar } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import { getIconComponent } from '@/utils/iconMap'
import type { TransactionType, RecurrenceCycle } from '@/types'

const emit = defineEmits<{
  (e: 'goto-recurring'): void
}>()

const store = useSavingStore()
const { getCategoryById, getCategoriesByType } = useCategories()

const showAddModal = ref(false)
const showRecurringDetail = ref(false)
const newTxType = ref<TransactionType>('expense')
const newTxAmount = ref('')
const newTxCategory = ref('')
const newTxNote = ref('')

const expenseRecurringStats = computed(() => {
  const categoriesMap = new Map<string, {
    categoryId: string
    categoryName: string
    categoryColor: string
    categoryIcon: string
    bills: typeof store.recurringBills[number][]
    monthlyAmount: number
    billCount: number
  }>()

  for (const bill of store.activeRecurringBills) {
    if (bill.type !== 'expense') continue

    const cat = getCategoryById(bill.categoryId)
    if (!categoriesMap.has(bill.categoryId)) {
      categoriesMap.set(bill.categoryId, {
        categoryId: bill.categoryId,
        categoryName: cat?.name || '其他',
        categoryColor: cat?.color || '#9CA3AF',
        categoryIcon: cat?.icon || '',
        bills: [],
        monthlyAmount: 0,
        billCount: 0,
      })
    }
    const stats = categoriesMap.get(bill.categoryId)!
    stats.bills.push(bill)
    stats.monthlyAmount += store.calculateMonthlyAmount(bill.amount, bill.cycle)
    stats.billCount += 1
  }

  return Array.from(categoriesMap.values()).sort((a, b) => b.monthlyAmount - a.monthlyAmount)
})

function formatCycle(cycle: RecurrenceCycle): string {
  const map: Record<RecurrenceCycle, string> = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    yearly: '每年',
  }
  return map[cycle]
}

const sortedTransactions = computed(() => {
  return [...store.transactions].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
})

const groupedTransactions = computed(() => {
  const groups: Record<string, typeof store.transactions> = {}
  for (const tx of sortedTransactions.value) {
    if (!groups[tx.date]) {
      groups[tx.date] = []
    }
    groups[tx.date].push(tx)
  }
  return groups
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return '今天'
  if (d.toDateString() === yesterday.toDateString()) return '昨天'

  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function formatAmount(amount: number, type: TransactionType): string {
  const prefix = type === 'income' ? '+' : '-'
  return `${prefix}¥${amount.toFixed(0)}`
}

function openAddModal(type: TransactionType, event?: MouseEvent) {
  newTxType.value = type
  newTxAmount.value = ''
  newTxNote.value = ''
  const cats = getCategoriesByType(type)
  newTxCategory.value = cats[0]?.id || ''
  showAddModal.value = true
}

function handleAdd(event?: MouseEvent) {
  const amount = parseFloat(newTxAmount.value)
  if (!amount || amount <= 0 || !newTxCategory.value) return
  const rect = (event?.target as HTMLElement)?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : 0
  const y = rect ? rect.top + rect.height / 2 : 0
  store.addTransaction(
    newTxType.value,
    amount,
    newTxCategory.value,
    newTxNote.value || (newTxType.value === 'income' ? '收入' : '支出'),
    x,
    y
  )
  showAddModal.value = false
}

function handleDelete(id: string) {
  if (confirm('确定要删除这条记录吗？')) {
    store.deleteTransaction(id)
  }
}
</script>

<template>
  <div class="px-4 pb-[100px]">
    <div class="grid grid-cols-3 gap-2.5 mb-4">
      <div class="bg-white rounded-2xl p-3.5 text-center shadow-softer">
        <div class="text-xs text-gray-400 mb-1">本月收入</div>
        <div class="text-base font-bold text-mint-500">¥{{ store.monthlyIncome.toFixed(0) }}</div>
      </div>
      <div class="bg-white rounded-2xl p-3.5 text-center shadow-softer">
        <div class="text-xs text-gray-400 mb-1">本月支出</div>
        <div class="text-base font-bold text-warm-500">¥{{ store.monthlyExpense.toFixed(0) }}</div>
      </div>
      <div class="bg-white rounded-2xl p-3.5 text-center shadow-softer">
        <div class="text-xs text-gray-400 mb-1">结余</div>
        <div class="text-base font-bold text-lavender-500">¥{{ (store.monthlyIncome - store.monthlyExpense).toFixed(0) }}</div>
      </div>
    </div>

    <div
      v-if="store.recurringBills.length > 0"
      class="bg-gradient-to-r from-lavender-50 to-lavender-100 rounded-2xl p-4 mb-4 cursor-pointer hover:shadow-soft transition-all active:scale-[0.99]"
      @click="emit('goto-recurring')"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <Repeat :size="20" class="text-lavender-500" />
          </div>
          <div>
            <div class="text-sm font-bold text-gray-700">周期性账单</div>
            <div class="text-xs text-gray-500">
              月均支出 ¥{{ store.monthlyRecurringExpense.toFixed(0) }}
              <span v-if="store.monthlyRecurringIncome > 0">
                · 月均收入 ¥{{ store.monthlyRecurringIncome.toFixed(0) }}
              </span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <div v-if="store.overdueBills.length > 0" class="text-xs font-bold text-red-500">
            {{ store.overdueBills.length }} 笔逾期
          </div>
          <div v-else-if="store.remindingBills.length > 0" class="text-xs font-bold text-amber-500">
            {{ store.remindingBills.length }} 笔即将到期
          </div>
          <div v-else class="text-xs text-gray-400">运行正常</div>
        </div>
      </div>
    </div>

    <div v-if="expenseRecurringStats.length > 0" class="bg-white rounded-2xl p-4 mb-4 shadow-softer">
      <button
        class="w-full flex items-center justify-between mb-3"
        @click="showRecurringDetail = !showRecurringDetail"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-gray-700">📊 订阅支出分类统计</span>
          <span class="text-[10px] px-2 py-0.5 bg-lavender-100 text-lavender-600 rounded-full font-medium">
            月均 ¥{{ store.monthlyRecurringExpense.toFixed(0) }}
          </span>
        </div>
        <ChevronDown v-if="!showRecurringDetail" :size="18" class="text-gray-400" />
        <ChevronUp v-else :size="18" class="text-gray-400" />
      </button>

      <div v-if="showRecurringDetail" class="space-y-3">
        <div v-for="stat in expenseRecurringStats" :key="stat.categoryId" class="border-t border-gray-50 pt-3 first:border-t-0 first:pt-0">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center"
                :style="{ backgroundColor: stat.categoryColor + '20', color: stat.categoryColor }"
              >
                <component v-if="getIconComponent(stat.categoryIcon)" :is="getIconComponent(stat.categoryIcon)" :size="16" />
                <span v-else class="text-sm">📌</span>
              </div>
              <div>
                <span class="text-sm font-semibold text-gray-700">{{ stat.categoryName }}</span>
                <span class="text-[10px] text-gray-400 ml-1">{{ stat.billCount }} 笔</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold text-warm-500">¥{{ stat.monthlyAmount.toFixed(0) }}<span class="text-[10px] font-normal text-gray-400">/月</span></div>
            </div>
          </div>

          <div class="space-y-1.5 pl-10">
            <div
              v-for="bill in stat.bills"
              :key="bill.id"
              class="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-2 min-w-0">
                <Calendar :size="12" class="text-gray-400 flex-shrink-0" />
                <span class="text-xs text-gray-600 truncate">{{ bill.name }}</span>
                <span class="text-[10px] text-gray-400 flex-shrink-0">{{ formatCycle(bill.cycle) }}</span>
              </div>
              <div class="text-xs font-semibold text-warm-500 flex-shrink-0">-¥{{ bill.amount.toFixed(0) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-2.5 mb-5">
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 bg-mint-500/12 text-mint-500 hover:bg-mint-500/20"
        @click="openAddModal('income', $event)"
      >
        <Plus :size="18" />
        <span>记收入</span>
      </button>
      <button
        class="flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 bg-warm-500/12 text-warm-500 hover:bg-warm-500/20"
        @click="openAddModal('expense', $event)"
      >
        <Minus :size="18" />
        <span>记支出</span>
      </button>
    </div>

    <div class="bg-white rounded-[20px] py-1 shadow-softer">
      <div v-for="(txs, date) in groupedTransactions" :key="date" class="px-4">
        <div class="text-xs text-gray-400 py-3 pb-1.5 font-semibold">{{ formatDate(date as string) }}</div>
        <div
          v-for="tx in txs"
          :key="tx.id"
          class="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0"
        >
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            :style="{ backgroundColor: (getCategoryById(tx.categoryId)?.color || '#9CA3AF') + '20', color: getCategoryById(tx.categoryId)?.color || '#9CA3AF' }"
          >
            <component
              v-if="getIconComponent(getCategoryById(tx.categoryId)?.icon || '')"
              :is="getIconComponent(getCategoryById(tx.categoryId)?.icon || '')"
              :size="20"
            />
            <span v-else class="text-lg">💰</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-700">{{ getCategoryById(tx.categoryId)?.name || '其他' }}</div>
            <div v-if="tx.note" class="text-xs text-gray-400 mt-0.5 truncate">{{ tx.note }}</div>
          </div>
          <div class="text-base font-bold flex-shrink-0" :class="tx.type === 'income' ? 'text-mint-500' : 'text-warm-500'">
            {{ formatAmount(tx.amount, tx.type) }}
          </div>
          <button
            class="text-gray-300 p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 hover:text-red-500 hover:bg-red-50"
            @click="handleDelete(tx.id)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <div v-if="sortedTransactions.length === 0" class="text-center py-10 px-5">
        <div class="text-5xl mb-3">📒</div>
        <div class="text-gray-400 text-sm">还没有记录，开始记账吧</div>
      </div>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 z-[1000] flex items-end justify-center animate-[fadeIn_0.2s_ease]" @click.self="showAddModal = false">
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-700">{{ newTxType === 'income' ? '记一笔收入' : '记一笔支出' }}</h3>
          <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl flex items-center justify-center" @click="showAddModal = false">×</button>
        </div>

        <div class="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            class="flex-1 py-2.5 rounded-lg font-semibold text-sm text-gray-500 transition-all duration-200"
            :class="{ 'bg-white text-warm-500 shadow-sm': newTxType === 'income' }"
            @click="newTxType = 'income'; newTxCategory = getCategoriesByType('income')[0]?.id || ''"
          >
            收入
          </button>
          <button
            class="flex-1 py-2.5 rounded-lg font-semibold text-sm text-gray-500 transition-all duration-200"
            :class="{ 'bg-white text-warm-500 shadow-sm': newTxType === 'expense' }"
            @click="newTxType = 'expense'; newTxCategory = getCategoriesByType('expense')[0]?.id || ''"
          >
            支出
          </button>
        </div>

        <div class="flex items-baseline gap-2 mb-6 py-3 px-4 bg-gray-50 rounded-xl">
          <span class="text-2xl font-bold text-gray-700">¥</span>
          <input
            v-model="newTxAmount"
            type="number"
            placeholder="0.00"
            autofocus
            class="flex-1 text-3xl font-bold border-none bg-transparent outline-none text-gray-700"
          />
        </div>

        <div class="grid grid-cols-4 gap-2.5 mb-5">
          <button
            v-for="cat in getCategoriesByType(newTxType)"
            :key="cat.id"
            class="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-all duration-200"
            :class="{ 'bg-warm-50 shadow-[inset_0_0_0_2px_#ff9b7b]': newTxCategory === cat.id }"
            @click="newTxCategory = cat.id"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
              :style="{ backgroundColor: cat.color + '20', color: cat.color }"
            >
              <component v-if="getIconComponent(cat.icon)" :is="getIconComponent(cat.icon)" :size="20" />
              <span v-else>📌</span>
            </div>
            <span class="text-xs font-semibold" :class="newTxCategory === cat.id ? 'text-warm-500' : 'text-gray-500'">{{ cat.name }}</span>
          </button>
        </div>

        <div class="mb-5">
          <input
            v-model="newTxNote"
            type="text"
            placeholder="添加备注（可选）"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
          />
        </div>

        <button
          class="w-full py-4 bg-gradient-to-br from-warm-500 to-warm-600 text-white text-base font-bold rounded-xl shadow-pop transition-all duration-200 active:scale-[0.98]"
          @click="handleAdd($event)"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
