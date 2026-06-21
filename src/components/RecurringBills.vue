<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Trash2, Edit, Bell, RefreshCw, Calendar, Check, X } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import { getIconComponent } from '@/utils/iconMap'
import type { TransactionType, RecurrenceCycle, RecurringBill } from '@/types'

const store = useSavingStore()
const { getCategoryById, getCategoriesByType, loadCategories } = useCategories()

const showAddModal = ref(false)
const isEditing = ref(false)
const editingId = ref('')

const newBillName = ref('')
const newBillAmount = ref('')
const newBillType = ref<TransactionType>('expense')
const newBillCategory = ref('')
const newBillCycle = ref<RecurrenceCycle>('monthly')
const newBillStartDate = ref(new Date().toISOString().split('T')[0])
const newBillEndDate = ref('')
const newBillNote = ref('')
const newBillRemindDays = ref(3)
const newBillAutoRecord = ref(true)

const cycles: { key: RecurrenceCycle; label: string }[] = [
  { key: 'daily', label: '每天' },
  { key: 'weekly', label: '每周' },
  { key: 'monthly', label: '每月' },
  { key: 'yearly', label: '每年' },
]

const sortedBills = computed(() => {
  return [...store.recurringBills].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
  })
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function formatCycle(cycle: RecurrenceCycle): string {
  const map: Record<RecurrenceCycle, string> = {
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    yearly: '每年',
  }
  return map[cycle]
}

function getDaysUntilDue(dueDate: string): { days: number; text: string; status: 'overdue' | 'soon' | 'normal' } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return { days, text: `已逾期 ${Math.abs(days)} 天`, status: 'overdue' }
  } else if (days === 0) {
    return { days, text: '今天到期', status: 'soon' }
  } else if (days <= 3) {
    return { days, text: `${days} 天后到期`, status: 'soon' }
  } else {
    return { days, text: `${days} 天后到期`, status: 'normal' }
  }
}

function openAddModal() {
  isEditing.value = false
  editingId.value = ''
  newBillName.value = ''
  newBillAmount.value = ''
  newBillType.value = 'expense'
  newBillCycle.value = 'monthly'
  newBillStartDate.value = new Date().toISOString().split('T')[0]
  newBillEndDate.value = ''
  newBillNote.value = ''
  newBillRemindDays.value = 3
  newBillAutoRecord.value = true
  const cats = getCategoriesByType('expense')
  newBillCategory.value = cats[0]?.id || ''
  showAddModal.value = true
}

function openEditModal(bill: RecurringBill) {
  isEditing.value = true
  editingId.value = bill.id
  newBillName.value = bill.name
  newBillAmount.value = bill.amount.toString()
  newBillType.value = bill.type
  newBillCategory.value = bill.categoryId
  newBillCycle.value = bill.cycle
  newBillStartDate.value = bill.startDate
  newBillEndDate.value = bill.endDate || ''
  newBillNote.value = bill.note
  newBillRemindDays.value = bill.remindDaysBefore
  newBillAutoRecord.value = bill.autoRecord
  showAddModal.value = true
}

function handleTypeChange(type: TransactionType) {
  newBillType.value = type
  const cats = getCategoriesByType(type)
  newBillCategory.value = cats[0]?.id || ''
}

function handleSave() {
  const amount = parseFloat(newBillAmount.value)
  if (!amount || amount <= 0 || !newBillCategory.value || !newBillName.value) return

  if (isEditing.value) {
    store.updateRecurringBill(editingId.value, {
      name: newBillName.value,
      amount,
      categoryId: newBillCategory.value,
      type: newBillType.value,
      cycle: newBillCycle.value,
      startDate: newBillStartDate.value,
      endDate: newBillEndDate.value || undefined,
      note: newBillNote.value,
      remindDaysBefore: newBillRemindDays.value,
      autoRecord: newBillAutoRecord.value,
    })
  } else {
    store.addRecurringBill(
      newBillName.value,
      amount,
      newBillCategory.value,
      newBillType.value,
      newBillCycle.value,
      newBillStartDate.value,
      newBillNote.value,
      newBillRemindDays.value,
      newBillAutoRecord.value,
      newBillEndDate.value || undefined
    )
  }

  showAddModal.value = false
}

function handleDelete(id: string) {
  if (confirm('确定要删除这个周期性账单吗？')) {
    store.deleteRecurringBill(id)
  }
}

function handleToggle(id: string) {
  store.toggleRecurringBill(id)
}

function handleCheckNow() {
  store.checkAndRecordRecurringBills()
}

onMounted(() => {
  loadCategories()
  store.checkAndRecordRecurringBills()
})
</script>

<template>
  <div class="px-4 pb-[100px]">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-gray-700">🔄 周期性账单</h2>
      <button
        class="flex items-center gap-1 px-3 py-2 bg-warm-500/10 text-warm-500 rounded-xl text-sm font-semibold hover:bg-warm-500/20 transition-all active:scale-95"
        @click="handleCheckNow"
      >
        <RefreshCw :size="16" />
        <span>立即结算</span>
      </button>
    </div>

    <div v-if="store.overdueBills.length > 0" class="mb-4">
      <div class="bg-red-50 rounded-2xl p-4 border border-red-100">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-lg">⚠️</span>
          <span class="font-bold text-red-500">逾期账单</span>
          <span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{{ store.overdueBills.length }}</span>
        </div>
        <div class="space-y-2">
          <div
            v-for="bill in store.overdueBills"
            :key="bill.id"
            class="flex items-center justify-between bg-white rounded-xl p-3"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :style="{ backgroundColor: (getCategoryById(bill.categoryId)?.color || '#9CA3AF') + '20', color: getCategoryById(bill.categoryId)?.color || '#9CA3AF' }"
              >
                <component
                  v-if="getIconComponent(getCategoryById(bill.categoryId)?.icon || '')"
                  :is="getIconComponent(getCategoryById(bill.categoryId)?.icon || '')"
                  :size="20"
                />
                <span v-else class="text-lg">📌</span>
              </div>
              <div>
                <div class="font-semibold text-gray-700 text-sm">{{ bill.name }}</div>
                <div class="text-xs text-red-400">{{ getDaysUntilDue(bill.nextDueDate).text }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold" :class="bill.type === 'income' ? 'text-mint-500' : 'text-red-500'">
                {{ bill.type === 'income' ? '+' : '-' }}¥{{ bill.amount.toFixed(0) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.upcomingBills.length > 0" class="mb-4">
      <div class="bg-amber-50 rounded-2xl p-4 border border-amber-100">
        <div class="flex items-center gap-2 mb-3">
          <Bell :size="18" class="text-amber-500" />
          <span class="font-bold text-amber-600">即将到期</span>
          <span class="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{{ store.upcomingBills.length }}</span>
        </div>
        <div class="space-y-2">
          <div
            v-for="bill in store.upcomingBills"
            :key="bill.id"
            class="flex items-center justify-between bg-white rounded-xl p-3"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :style="{ backgroundColor: (getCategoryById(bill.categoryId)?.color || '#9CA3AF') + '20', color: getCategoryById(bill.categoryId)?.color || '#9CA3AF' }"
              >
                <component
                  v-if="getIconComponent(getCategoryById(bill.categoryId)?.icon || '')"
                  :is="getIconComponent(getCategoryById(bill.categoryId)?.icon || '')"
                  :size="20"
                />
                <span v-else class="text-lg">📌</span>
              </div>
              <div>
                <div class="font-semibold text-gray-700 text-sm">{{ bill.name }}</div>
                <div class="text-xs text-amber-500">{{ getDaysUntilDue(bill.nextDueDate).text }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold" :class="bill.type === 'income' ? 'text-mint-500' : 'text-warm-500'">
                {{ bill.type === 'income' ? '+' : '-' }}¥{{ bill.amount.toFixed(0) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2.5 mb-4">
      <div class="bg-white rounded-2xl p-3.5 text-center shadow-softer">
        <div class="text-xs text-gray-400 mb-1">月均支出</div>
        <div class="text-base font-bold text-warm-500">¥{{ store.monthlyRecurringExpense.toFixed(0) }}</div>
      </div>
      <div class="bg-white rounded-2xl p-3.5 text-center shadow-softer">
        <div class="text-xs text-gray-400 mb-1">月均收入</div>
        <div class="text-base font-bold text-mint-500">¥{{ store.monthlyRecurringIncome.toFixed(0) }}</div>
      </div>
    </div>

    <button
      class="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-br from-warm-500 to-warm-600 text-white text-base font-bold rounded-2xl shadow-pop transition-all duration-200 active:scale-[0.98] mb-5"
      @click="openAddModal"
    >
      <Plus :size="22" />
      <span>添加周期性账单</span>
    </button>

    <div class="bg-white rounded-[20px] py-1 shadow-softer">
      <div
        v-for="bill in sortedBills"
        :key="bill.id"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
        :class="{ 'opacity-50': !bill.isActive }"
      >
        <div
          class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{ backgroundColor: (getCategoryById(bill.categoryId)?.color || '#9CA3AF') + '20', color: getCategoryById(bill.categoryId)?.color || '#9CA3AF' }"
        >
          <component
            v-if="getIconComponent(getCategoryById(bill.categoryId)?.icon || '')"
            :is="getIconComponent(getCategoryById(bill.categoryId)?.icon || '')"
            :size="24"
          />
          <span v-else class="text-xl">📌</span>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-gray-700 truncate">{{ bill.name }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              :class="bill.type === 'income' ? 'bg-mint-100 text-mint-600' : 'bg-warm-100 text-warm-600'"
            >
              {{ formatCycle(bill.cycle) }}
            </span>
            <span v-if="bill.autoRecord" class="text-[10px] px-1.5 py-0.5 rounded-full bg-lavender-100 text-lavender-600 font-medium">
              自动
            </span>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <Calendar :size="12" class="text-gray-400" />
            <span class="text-xs text-gray-400">下次：{{ formatDate(bill.nextDueDate) }}</span>
          </div>
          <div v-if="bill.note" class="text-xs text-gray-400 mt-0.5 truncate">{{ bill.note }}</div>
        </div>

        <div class="text-right flex-shrink-0">
          <div class="text-base font-bold" :class="bill.type === 'income' ? 'text-mint-500' : 'text-warm-500'">
            {{ bill.type === 'income' ? '+' : '-' }}¥{{ bill.amount.toFixed(0) }}
          </div>
          <div
            class="text-xs mt-0.5"
            :class="{
              'text-red-500': getDaysUntilDue(bill.nextDueDate).status === 'overdue',
              'text-amber-500': getDaysUntilDue(bill.nextDueDate).status === 'soon',
              'text-gray-400': getDaysUntilDue(bill.nextDueDate).status === 'normal',
            }"
          >
            {{ getDaysUntilDue(bill.nextDueDate).text }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 flex-shrink-0">
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-warm-500 hover:bg-warm-50 transition-all"
            @click="openEditModal(bill)"
          >
            <Edit :size="16" />
          </button>
          <button
            class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            @click="handleDelete(bill.id)"
          >
            <Trash2 :size="16" />
          </button>
          <button
            class="p-1.5 rounded-lg transition-all"
            :class="bill.isActive ? 'text-mint-500 hover:bg-mint-50' : 'text-gray-300 hover:bg-gray-50'"
            @click="handleToggle(bill.id)"
          >
            <Check :size="16" v-if="bill.isActive" />
            <X :size="16" v-else />
          </button>
        </div>
      </div>

      <div v-if="sortedBills.length === 0" class="text-center py-10 px-5">
        <div class="text-5xl mb-3">🔄</div>
        <div class="text-gray-400 text-sm">还没有周期性账单</div>
        <div class="text-gray-300 text-xs mt-1">订阅、会员、房租等定期收支都可以记录</div>
      </div>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 z-[1000] flex items-end justify-center animate-[fadeIn_0.2s_ease]" @click.self="showAddModal = false">
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)] max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-700">{{ isEditing ? '编辑周期性账单' : '添加周期性账单' }}</h3>
          <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl flex items-center justify-center" @click="showAddModal = false">×</button>
        </div>

        <div class="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            class="flex-1 py-2.5 rounded-lg font-semibold text-sm text-gray-500 transition-all duration-200"
            :class="{ 'bg-white text-warm-500 shadow-sm': newBillType === 'income' }"
            @click="handleTypeChange('income')"
          >
            收入
          </button>
          <button
            class="flex-1 py-2.5 rounded-lg font-semibold text-sm text-gray-500 transition-all duration-200"
            :class="{ 'bg-white text-warm-500 shadow-sm': newBillType === 'expense' }"
            @click="handleTypeChange('expense')"
          >
            支出
          </button>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-2">账单名称</label>
          <input
            v-model="newBillName"
            type="text"
            placeholder="例如：网易云音乐会员"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-2">金额</label>
          <div class="flex items-baseline gap-2 py-3 px-4 bg-gray-50 rounded-xl">
            <span class="text-2xl font-bold text-gray-700">¥</span>
            <input
              v-model="newBillAmount"
              type="number"
              placeholder="0.00"
              class="flex-1 text-3xl font-bold border-none bg-transparent outline-none text-gray-700"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-2">分类</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="cat in getCategoriesByType(newBillType)"
              :key="cat.id"
              class="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all duration-200"
              :class="{ 'bg-warm-50 shadow-[inset_0_0_0_2px_#ff9b7b]': newBillCategory === cat.id }"
              @click="newBillCategory = cat.id"
            >
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                :style="{ backgroundColor: cat.color + '20', color: cat.color }"
              >
                <component v-if="getIconComponent(cat.icon)" :is="getIconComponent(cat.icon)" :size="18" />
                <span v-else>📌</span>
              </div>
              <span class="text-xs font-semibold truncate w-full text-center" :class="newBillCategory === cat.id ? 'text-warm-500' : 'text-gray-500'">{{ cat.name }}</span>
            </button>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-2">周期</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="cycle in cycles"
              :key="cycle.key"
              class="py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
              :class="newBillCycle === cycle.key ? 'bg-warm-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
              @click="newBillCycle = cycle.key"
            >
              {{ cycle.label }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">开始日期</label>
            <input
              v-model="newBillStartDate"
              type="date"
              class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">结束日期（可选）</label>
            <input
              v-model="newBillEndDate"
              type="date"
              class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-600 mb-2">提前提醒天数</label>
          <div class="flex gap-2">
            <button
              v-for="days in [0, 1, 3, 7]"
              :key="days"
              class="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
              :class="newBillRemindDays === days ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
              @click="newBillRemindDays = days"
            >
              {{ days === 0 ? '当天' : days + '天前' }}
            </button>
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-600">自动记账</label>
            <button
              class="w-12 h-7 rounded-full transition-all duration-200 relative"
              :class="newBillAutoRecord ? 'bg-mint-500' : 'bg-gray-200'"
              @click="newBillAutoRecord = !newBillAutoRecord"
            >
              <div
                class="w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm"
                :class="newBillAutoRecord ? 'left-6' : 'left-1'"
              ></div>
            </button>
          </div>
          <p class="text-xs text-gray-400 mt-1">开启后，到期时会自动记录一笔收支</p>
        </div>

        <div class="mb-5">
          <label class="block text-sm font-medium text-gray-600 mb-2">备注（可选）</label>
          <input
            v-model="newBillNote"
            type="text"
            placeholder="添加备注"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
          />
        </div>

        <button
          class="w-full py-4 bg-gradient-to-br from-warm-500 to-warm-600 text-white text-base font-bold rounded-xl shadow-pop transition-all duration-200 active:scale-[0.98]"
          @click="handleSave"
        >
          {{ isEditing ? '保存修改' : '确认添加' }}
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
