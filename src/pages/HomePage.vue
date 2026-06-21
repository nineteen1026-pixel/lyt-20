<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import { useDecorations } from '@/composables/useDecorations'
import RoomView from '@/components/RoomView.vue'
import BottomNav from '@/components/BottomNav.vue'
import AccountBook from '@/components/AccountBook.vue'
import WishList from '@/components/WishList.vue'
import Workshop from '@/components/Workshop.vue'

const store = useSavingStore()
const { loadCategories } = useCategories()
const { loadDecorations } = useDecorations()

const activeTab = ref<'account' | 'wish' | 'workshop'>('account')
const showPanel = ref(false)

const tabs = ['account', 'wish', 'workshop'] as const

const activeIndex = computed(() => tabs.indexOf(activeTab.value))

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
  <div class="app-container">
    <div class="phone-frame">
      <header class="app-header">
        <div class="header-left">
          <span class="app-title">🏠 小屋存钱</span>
        </div>
        <div class="header-balance">
          <span class="balance-label">当前余额</span>
          <span class="balance-amount">¥{{ store.balance.toFixed(0) }}</span>
        </div>
      </header>

      <div class="main-content">
        <RoomView />

        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-label">本月收入</div>
            <div class="stat-value income">¥{{ store.monthlyIncome.toFixed(0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">本月支出</div>
            <div class="stat-value expense">¥{{ store.monthlyExpense.toFixed(0) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">储蓄积分</div>
            <div class="stat-value points">{{ store.points.toFixed(0) }} ✨</div>
          </div>
        </div>

        <div class="quick-nav">
          <button
            class="quick-item"
            :class="{ active: activeTab === 'account' && showPanel }"
            @click="handleTabChange('account')"
          >
            <span class="quick-icon">📒</span>
            <span class="quick-label">资金簿</span>
          </button>
          <button
            class="quick-item"
            :class="{ active: activeTab === 'wish' && showPanel }"
            @click="handleTabChange('wish')"
          >
            <span class="quick-icon">🌟</span>
            <span class="quick-label">愿望清单</span>
          </button>
          <button
            class="quick-item"
            :class="{ active: activeTab === 'workshop' && showPanel }"
            @click="handleTabChange('workshop')"
          >
            <span class="quick-icon">🎨</span>
            <span class="quick-label">装修工坊</span>
          </button>
        </div>
      </div>

      <transition name="panel">
        <div v-if="showPanel" class="panel-overlay" @click="closePanel"></div>
      </transition>

      <transition name="slide-up">
        <div v-if="showPanel" class="panel-content">
          <div class="panel-handle" @click="closePanel"></div>
          <div class="panel-scroll">
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

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #fff8f0 0%, #ffe8d6 100%);
  display: flex;
  justify-content: center;
  padding: 0;
}

.phone-frame {
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  background: #fff8f0;
  position: relative;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  padding-top: calc(16px + env(safe-area-inset-top, 0px));
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-title {
  font-size: 18px;
  font-weight: 800;
  color: #374151;
}

.header-balance {
  text-align: right;
}

.balance-label {
  display: block;
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}

.balance-amount {
  font-size: 20px;
  font-weight: 800;
  color: #ff9b7b;
}

.main-content {
  padding-bottom: 90px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 16px 16px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.stat-label {
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
}

.stat-value.income {
  color: #5ab37e;
}

.stat-value.expense {
  color: #ff9b7b;
}

.stat-value.points {
  color: #f59e0b;
}

.quick-nav {
  display: flex;
  gap: 10px;
  padding: 0 16px 16px;
}

.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: white;
  border-radius: 18px;
  transition: all 0.25s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.quick-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.quick-item.active {
  background: #fff8f0;
  box-shadow: 0 4px 16px rgba(255, 155, 123, 0.2);
}

.quick-icon {
  font-size: 26px;
}

.quick-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.quick-item.active .quick-label {
  color: #ff9b7b;
}

.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 90;
}

.panel-content {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 480px;
  max-height: 75vh;
  background: #fff8f0;
  border-radius: 28px 28px 0 0;
  z-index: 95;
  display: flex;
  flex-direction: column;
  padding-bottom: 80px;
}

.panel-handle {
  width: 40px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin: 10px auto;
  flex-shrink: 0;
  cursor: pointer;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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
