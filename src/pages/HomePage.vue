<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import { useDecorations } from '@/composables/useDecorations'
import RoomView from '@/components/RoomView.vue'
import BottomNav from '@/components/BottomNav.vue'
import AccountBook from '@/components/AccountBook.vue'
import WishList from '@/components/WishList.vue'
import Workshop from '@/components/Workshop.vue'
import type { SavingEvent } from '@/stores/saving'

const store = useSavingStore()
const { loadCategories } = useCategories()
const { loadDecorations } = useDecorations()

const activeTab = ref<'account' | 'wish' | 'workshop'>('account')
const showPanel = ref(false)
const displayedBalance = ref(0)
const displayedPoints = ref(0)
const displayedIncome = ref(0)
const displayedExpense = ref(0)

const tabs = ['account', 'wish', 'workshop'] as const
const activeIndex = computed(() => tabs.indexOf(activeTab.value))

const visibleEvents = computed(() => store.recentEvents.slice(0, 3))

function handleTabChange(tab: 'account' | 'wish' | 'workshop') {
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

onMounted(async () => {
  store.initFromStorage()

  if (store.transactions.length === 0 && store.wishes.length === 0) {
    await loadInitialData()
  }

  loadCategories()
  loadDecorations()
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

        <div class="flex gap-2.5 px-4 pb-4">
          <button
            class="flex-1 flex flex-col items-center gap-1.5 p-3.5 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'account' && showPanel }"
            @click="handleTabChange('account')"
          >
            <span class="text-2xl">📒</span>
            <span class="text-xs font-semibold" :class="activeTab === 'account' && showPanel ? 'text-warm-500' : 'text-gray-500'">资金簿</span>
          </button>
          <button
            class="flex-1 flex flex-col items-center gap-1.5 p-3.5 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'wish' && showPanel }"
            @click="handleTabChange('wish')"
          >
            <span class="text-2xl">🌟</span>
            <span class="text-xs font-semibold" :class="activeTab === 'wish' && showPanel ? 'text-warm-500' : 'text-gray-500'">愿望清单</span>
          </button>
          <button
            class="flex-1 flex flex-col items-center gap-1.5 p-3.5 bg-white rounded-2xl transition-all duration-250 shadow-softer hover:translate-y-[-2px] hover:shadow-soft active:scale-95"
            :class="{ 'bg-warm-50 shadow-pop': activeTab === 'workshop' && showPanel }"
            @click="handleTabChange('workshop')"
          >
            <span class="text-2xl">🎨</span>
            <span class="text-xs font-semibold" :class="activeTab === 'workshop' && showPanel ? 'text-warm-500' : 'text-gray-500'">装修工坊</span>
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
            <AccountBook v-if="activeTab === 'account'" />
            <WishList v-else-if="activeTab === 'wish'" />
            <Workshop v-else-if="activeTab === 'workshop'" />
          </div>
        </div>
      </transition>

      <BottomNav
        :active-tab="activeTab"
        @update:active-tab="handleTabChange"
        @add-transaction="handleAddTransaction"
      />
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
</style>
