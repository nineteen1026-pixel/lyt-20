<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import { useDecorations } from '@/composables/useDecorations'
import RoomView from '@/components/RoomView.vue'
import BottomNav from '@/components/BottomNav.vue'
import AccountBook from '@/components/AccountBook.vue'
import WishList from '@/components/WishList.vue'
import Workshop from '@/components/Workshop.vue'
import RecurringBills from '@/components/RecurringBills.vue'
import { Bell, Calendar, AlertTriangle } from 'lucide-vue-next'
import { getIconComponent } from '@/utils/iconMap'
import type { SavingEvent } from '@/stores/saving'
import type { RecurringBill } from '@/types'

const store = useSavingStore()
const { loadCategories, getCategoryById } = useCategories()
const { loadDecorations } = useDecorations()

const activeTab = ref<'account' | 'wish' | 'workshop' | 'recurring'>('account')
const showPanel = ref(false)
const displayedBalance = ref(0)
const displayedPoints = ref(0)
const displayedIncome = ref(0)
const displayedExpense = ref(0)
const showReminderModal = ref(false)

const tabs = ['account', 'wish', 'workshop', 'recurring'] as const
const activeIndex = computed(() => tabs.indexOf(activeTab.value))

const visibleEvents = computed(() => store.recentEvents.slice(0, 3))

function handleTabChange(tab: 'account' | 'wish' | 'workshop' | 'recurring') {
  activeTab.value = tab
  showPanel.value = true
}

function handleAddTransaction() {
  activeTab.value = 'account'
  showPanel.value = true
}

function closePanel() {
  showPanel.value = false
}

async function loadInitialData() {
  try {
    const res = await fetch('/mock/initial-data.json')
    const data = await res.json()
    store.loadInitialData(data)
  } catch (e) {
    console.error('Failed to load initial data:', e)
  }
}

function animateNumber(target: number, current: number, setter: (v: number) => void, duration = 600) {
  const start = current
  const diff = target - start
  if (Math.abs(diff) < 0.5) {
    setter(target)
    return
  }
  const startTime = performance.now()
  function update(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    const value = start + diff * easeProgress
    setter(value)
    if (progress < 1) {
      requestAnimationFrame(update)
    }
  }
  requestAnimationFrame(update)
}

function dismissEvent(index: number) {
  store.clearRecentEvent(index)
}

watch(
  () => store.balance,
  (newVal) => {
    animateNumber(newVal, displayedBalance.value, (v) => { displayedBalance.value = v })
  },
  { immediate: true }
)

watch(
  () => store.points,
  (newVal) => {
    animateNumber(newVal, displayedPoints.value, (v) => { displayedPoints.value = v })
  },
  { immediate: true }
)

watch(
  () => store.monthlyIncome,
  (newVal) => {
    animateNumber(newVal, displayedIncome.value, (v) => { displayedIncome.value = v })
  },
  { immediate: true }
)

watch(
  () => store.monthlyExpense,
  (newVal) => {
    animateNumber(newVal, displayedExpense.value, (v) => { displayedExpense.value = v })
  },
  { immediate: true }
)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function getDaysUntilDue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function getReminderBills(): { overdue: RecurringBill[]; reminding: RecurringBill[] } {
  const overdue = store.overdueBills
  const reminding = store.remindingBills
  return { overdue, reminding }
}

function handleGoToRecurring() {
  showReminderModal.value = false
  nextTick(() => {
    activeTab.value = 'recurring'
    showPanel.value = true
  })
}

function dismissReminder() {
  showReminderModal.value = false
}

onMounted(async () => {
  store.initFromStorage()

  if (store.transactions.length === 0 && store.wishes.length === 0) {
    await loadInitialData()
  }

  await loadCategories()
  loadDecorations()
  store.checkAndRecordRecurringBills()

  setTimeout(() => {
    const { overdue, reminding } = getReminderBills()
    if (overdue.length > 0 || reminding.length > 0) {
      showReminderModal.value = true
    }
  }, 800)

  setTimeout(() => {
    store.checkAndNotifyAllOverspentBudgets()
  }, 1200)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-warm-50 to-warm-100 flex justify-center p-0">
    <div class="w-full max-w-[480px] min-h-screen bg-warm-50 relative overflow-hidden">
      <header class="flex items-center justify-between px-5 py-4 pt-[calc(16px+env(safe-area-inset-top,0px))]">
        <div class="flex items-center gap-2">
          <span class="text-lg font-extrabold text-gray-700">🏠 小屋存钱</span>
        </div>
        <div class="text-right">
          <span class="block text-xs text-gray-400 font-medium">当前余额</span>
          <span class="text-2xl font-extrabold text-warm-500">¥{{ displayedBalance.toFixed(0) }}</span>
        </div>
      </header>

      <div class="pb-[90px]">
        <div v-if="store.nextMilestone" class="px-4 pb-3">
          <div class="bg-white rounded-2xl p-3 shadow-softer">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-gray-500">🎯 下一里程碑</span>
              <span class="text-xs font-bold text-warm-500">¥{{ store.nextMilestone }}</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-warm-400 to-warm-500 rounded-full transition-all duration-700 ease-out"
                :style="{ width: store.milestoneProgress + '%' }"
              ></div>
            </div>
            <div class="text-right text-[10px] text-gray-400 mt-1">
              已完成 {{ store.milestoneProgress.toFixed(0) }}%
            </div>
          </div>
        </div>

        <div
          v-if="store.hasOverspentBudgets"
          class="px-4 pb-3"
        >
          <div
            class="bg-red-50 border border-red-100 rounded-2xl p-3.5 shadow-softer cursor-pointer hover:shadow-soft transition-all active:scale-[0.99]"
            @click="handleTabChange('account')"
          >
            <div class="flex items-center justify-between mb-2.5">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center animate-pulse">
                  <AlertTriangle :size="16" class="text-red-500" />
                </div>
                <div>
                  <div class="text-sm font-bold text-red-600">预算超支提醒</div>
                  <div class="text-[11px] text-red-400">
                    {{ store.overspentBudgets.length }} 个分类已超预算
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-semibold text-red-500">查看详情 →</div>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="stat in store.overspentBudgets.slice(0, 5)"
                :key="stat.categoryId"
                class="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-red-100"
              >
                <div
                  class="w-5 h-5 rounded flex items-center justify-center"
                  :style="{
                    backgroundColor: (getCategoryById(stat.categoryId)?.color || '#9CA3AF') + '20',
                    color: getCategoryById(stat.categoryId)?.color || '#9CA3AF',
                  }"
                >
                  <component
                    v-if="getIconComponent(getCategoryById(stat.categoryId)?.icon || '')"
                    :is="getIconComponent(getCategoryById(stat.categoryId)?.icon || '')"
                    :size="11"
                  />
                  <span v-else class="text-[10px]">📌</span>
                </div>
                <span class="text-[10px] font-semibold text-red-600">
                  {{ getCategoryById(stat.categoryId)?.name }}
                </span>
                <span class="text-[10px] font-bold text-red-500">
                  +¥{{ (stat.usedAmount - stat.budgetAmount).toFixed(0) }}
                </span>
              </div>
              <div
                v-if="store.overspentBudgets.length > 5"
                class="flex items-center px-2 py-1 bg-white rounded-lg border border-red-100"
              >
                <span class="text-[10px] font-medium text-red-400">
                  +{{ store.overspentBudgets.length - 5 }} 个
                </span>
              </div>
            </div>
          </div>
        </div>

        <RoomView />

        <div class="grid grid-cols-3 gap-2 px-4 pb-4">
          <div class="bg-white rounded-2xl p-3 text-center shadow-softer">
            <div class="text-xs text-gray-400 mb-1 font-medium">本月收入</div>
            <div class="text-base font-bold text-mint-500">¥{{ displayedIncome.toFixed(0) }}</div>
          </div>
          <div class="bg-white rounded-2xl p-3 text-center shadow-softer">
            <div class="text-xs text-gray-400 mb-1 font-medium">本月支出</div>
            <div class="text-base font-bold text-warm-500">¥{{ displayedExpense.toFixed(0) }}</div>
          </div>
          <div class="bg-white rounded-2xl p-3 text-center shadow-softer relative overflow-hidden">
            <div class="text-xs text-gray-400 mb-1 font-medium">储蓄积分</div>
            <div class="text-base font-bold text-amber-500">{{ displayedPoints.toFixed(0) }} ✨</div>
            <transition name="points-fly">
              <div
                v-if="store.pointsAnimation.show"
                class="absolute top-1/2 left-1/2 text-lg font-extrabold text-amber-500 pointer-events-none z-10"
              >
                +{{ store.pointsAnimation.amount }}
              </div>
            </transition>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2 px-4 pb-4">
          <button
            class="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'account' && showPanel }"
            @click="handleTabChange('account')"
          >
            <span class="text-xl">📒</span>
            <span class="text-[11px] font-semibold" :class="activeTab === 'account' && showPanel ? 'text-warm-500' : 'text-gray-500'">资金簿</span>
          </button>
          <button
            class="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95 relative"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'recurring' && showPanel }"
            @click="handleTabChange('recurring')"
          >
            <span class="text-xl">🔄</span>
            <span class="text-[11px] font-semibold" :class="activeTab === 'recurring' && showPanel ? 'text-warm-500' : 'text-gray-500'">周期账单</span>
            <span
              v-if="store.overdueBills.length > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
            >
              {{ store.overdueBills.length }}
            </span>
          </button>
          <button
            class="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'wish' && showPanel }"
            @click="handleTabChange('wish')"
          >
            <span class="text-xl">🌟</span>
            <span class="text-[11px] font-semibold" :class="activeTab === 'wish' && showPanel ? 'text-warm-500' : 'text-gray-500'">愿望清单</span>
          </button>
          <button
            class="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'workshop' && showPanel }"
            @click="handleTabChange('workshop')"
          >
            <span class="text-xl">🎨</span>
            <span class="text-[11px] font-semibold" :class="activeTab === 'workshop' && showPanel ? 'text-warm-500' : 'text-gray-500'">装修工坊</span>
          </button>
        </div>

        <div class="fixed top-[calc(60px+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 w-full max-w-[480px] px-4 pointer-events-none">
          <transition-group name="toast" tag="div" class="flex flex-col gap-2">
            <div
              v-for="(event, index) in visibleEvents"
              :key="event.timestamp"
              class="pointer-events-auto bg-white rounded-2xl shadow-soft px-4 py-3 flex items-center gap-3 transform transition-all duration-300"
              :class="{
                'border-l-4 border-mint-500': event.type === 'income',
                'border-l-4 border-warm-500': event.type === 'expense',
                'border-l-4 border-amber-500': event.type === 'milestone',
                'border-l-4 border-lavender-500': event.type === 'decoration',
                'border-l-4 border-butter-500': event.type === 'wish',
              }"
            >
              <span class="text-xl">
                {{ event.type === 'income' ? '💰' : event.type === 'expense' ? '💸' : event.type === 'milestone' ? '🎉' : event.type === 'decoration' ? '🎨' : '🌟' }}
              </span>
              <span class="flex-1 text-sm font-medium text-gray-700">{{ event.message }}</span>
              <button
                class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                @click="dismissEvent(index)"
              >
                ✕
              </button>
            </div>
          </transition-group>
        </div>
      </div>

      <transition name="panel">
        <div v-if="showPanel" class="fixed inset-0 bg-black/35 z-90" @click="closePanel"></div>
      </transition>

      <transition name="slide-up">
        <div v-if="showPanel" class="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] max-h-[75vh] bg-warm-50 rounded-t-[28px] z-95 flex flex-col pb-20">
          <div class="w-10 h-1 bg-gray-200 rounded my-2.5 mx-auto flex-shrink-0 cursor-pointer" @click="closePanel"></div>
          <div class="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch">
            <AccountBook v-if="activeTab === 'account'" @goto-recurring="handleTabChange('recurring')" />
            <RecurringBills v-else-if="activeTab === 'recurring'" />
            <WishList v-else-if="activeTab === 'wish'" />
            <Workshop v-else-if="activeTab === 'workshop'" />
          </div>
        </div>
      </transition>

      <BottomNav
        :active-tab="activeTab"
        :overdue-count="store.overdueBills.length"
        @update:active-tab="handleTabChange"
        @add-transaction="handleAddTransaction"
      />

      <transition name="reminder-modal">
        <div v-if="showReminderModal" class="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-5" @click.self="dismissReminder">
          <div class="w-full max-w-[400px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-[reminderPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div class="bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Bell :size="28" />
                </div>
                <div>
                  <h3 class="text-lg font-extrabold">账单提醒</h3>
                  <p class="text-sm opacity-90">
                    {{ store.overdueBills.length > 0 ? `${store.overdueBills.length} 笔逾期，` : '' }}
                    {{ store.remindingBills.length > 0 ? `${store.remindingBills.length} 笔即将到期` : '' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="p-5 max-h-[50vh] overflow-y-auto">
              <div v-if="store.overdueBills.length > 0" class="mb-4">
                <div class="flex items-center gap-2 mb-3">
                  <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span class="text-sm font-bold text-red-500">逾期账单</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="bill in store.overdueBills"
                    :key="bill.id"
                    class="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100"
                  >
                    <div
                      class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      :style="{ backgroundColor: (getCategoryById(bill.categoryId)?.color || '#9CA3AF') + '20', color: getCategoryById(bill.categoryId)?.color || '#9CA3AF' }"
                    >
                      <span class="text-lg">{{ bill.type === 'income' ? '💰' : '💸' }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-semibold text-gray-700 truncate">{{ bill.name }}</div>
                      <div class="text-xs text-red-500 flex items-center gap-1">
                        <Calendar :size="12" />
                        <span>已逾期 {{ Math.abs(getDaysUntilDue(bill.nextDueDate)) }} 天</span>
                      </div>
                    </div>
                    <div class="text-sm font-bold text-red-500 flex-shrink-0">
                      {{ bill.type === 'income' ? '+' : '-' }}¥{{ bill.amount.toFixed(0) }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="store.remindingBills.length > 0">
                <div class="flex items-center gap-2 mb-3">
                  <span class="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span class="text-sm font-bold text-amber-600">即将到期</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="bill in store.remindingBills"
                    :key="bill.id"
                    class="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100"
                  >
                    <div
                      class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      :style="{ backgroundColor: (getCategoryById(bill.categoryId)?.color || '#9CA3AF') + '20', color: getCategoryById(bill.categoryId)?.color || '#9CA3AF' }"
                    >
                      <span class="text-lg">{{ bill.type === 'income' ? '💰' : '💸' }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-semibold text-gray-700 truncate">{{ bill.name }}</div>
                      <div class="text-xs text-amber-600 flex items-center gap-1">
                        <Calendar :size="12" />
                        <span>{{ formatDate(bill.nextDueDate) }}（还有 {{ getDaysUntilDue(bill.nextDueDate) }} 天）</span>
                      </div>
                    </div>
                    <div class="text-sm font-bold text-amber-600 flex-shrink-0">
                      {{ bill.type === 'income' ? '+' : '-' }}¥{{ bill.amount.toFixed(0) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-5 pt-0 flex gap-3">
              <button
                class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors active:scale-95"
                @click="dismissReminder"
              >
                稍后再说
              </button>
              <button
                class="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all active:scale-95"
                @click="handleGoToRecurring"
              >
                去查看
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style>
.points-fly-enter-active {
  animation: pointsFly 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes pointsFly {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -80%) scale(1.3);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -150%) scale(0.8);
  }
}

.toast-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  animation: toastOut 0.3s ease forwards;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100px) scale(0.9);
  }
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.3s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(100%);
}

.reminder-modal-enter-active,
.reminder-modal-leave-active {
  transition: opacity 0.3s ease;
}

.reminder-modal-enter-from,
.reminder-modal-leave-to {
  opacity: 0;
}

@keyframes reminderPop {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  60% {
    transform: scale(1.05) translateY(-5px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
