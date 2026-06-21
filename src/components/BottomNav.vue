<script setup lang="ts">
import { Wallet, Star, Paintbrush, Plus, Repeat } from 'lucide-vue-next'

interface Props {
  activeTab: 'account' | 'recurring' | 'wish' | 'workshop'
  overdueCount?: number
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:activeTab', value: 'account' | 'recurring' | 'wish' | 'workshop'): void
  (e: 'add-transaction'): void
}>()

const leftTabs = [
  { key: 'account', label: '资金簿', icon: Wallet },
  { key: 'recurring', label: '周期账单', icon: Repeat },
] as const

const rightTabs = [
  { key: 'wish', label: '愿望清单', icon: Star },
  { key: 'workshop', label: '装修工坊', icon: Paintbrush },
] as const
</script>

<template>
  <div class="bottom-nav">
    <div class="nav-inner">
      <button
        v-for="tab in leftTabs"
        :key="tab.key"
        class="nav-item relative"
        :class="{ active: activeTab === tab.key }"
        @click="emit('update:activeTab', tab.key)"
      >
        <component :is="tab.icon" class="nav-icon" :size="22" />
        <span class="nav-label">{{ tab.label }}</span>
        <span
          v-if="tab.key === 'recurring' && overdueCount && overdueCount > 0"
          class="badge"
        >
          {{ overdueCount > 99 ? '99+' : overdueCount }}
        </span>
      </button>

      <button class="add-btn" @click="emit('add-transaction')">
        <Plus :size="24" />
      </button>

      <button
        v-for="tab in rightTabs"
        :key="tab.key"
        class="nav-item"
        :class="{ active: activeTab === tab.key }"
        @click="emit('update:activeTab', tab.key)"
      >
        <component :is="tab.icon" class="nav-icon" :size="22" />
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding-bottom: env(safe-area-inset-bottom, 12px);
  pointer-events: none;
}

.nav-inner {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 28px 28px 0 0;
  padding: 10px 8px 8px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.06);
  position: relative;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 14px;
  color: #9ca3af;
  transition: all 0.25s ease;
  flex: 1;
  min-width: 0;
  position: relative;
}

.nav-item.active {
  color: #ff9b7b;
  background: rgba(255, 155, 123, 0.1);
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.badge {
  position: absolute;
  top: 2px;
  right: 8px;
  min-width: 16px;
  height: 16px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

.add-btn {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9b7b 0%, #ff7e5f 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(255, 126, 95, 0.4);
  transition: all 0.2s ease;
  z-index: 1;
}

.add-btn:hover {
  transform: translateX(-50%) scale(1.05);
}

.add-btn:active {
  transform: translateX(-50%) scale(0.95);
}
</style>
