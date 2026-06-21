<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, ChevronDown, Gem, Plane, Gift } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import type { WishCategory } from '@/types'

const store = useSavingStore()

const showAddModal = ref(false)
const newWishName = ref('')
const newWishTarget = ref('')
const newWishCategory = ref<WishCategory>('other')
const selectedIcon = ref('🎁')

const depositWishId = ref<string | null>(null)
const depositAmount = ref('')
const showDepositModal = ref(false)

const wishCategories = [
  { key: 'jewelry' as WishCategory, label: '首饰', icon: Gem, emoji: '💍' },
  { key: 'travel' as WishCategory, label: '旅行', icon: Plane, emoji: '✈️' },
  { key: 'other' as WishCategory, label: '其他', icon: Gift, emoji: '🎁' },
] as const

const iconOptions = ['💍', '✈️', '📷', '👜', '👗', '🎮', '📚', '🏠', '🚗', '🎁']

const sortedWishes = computed(() => {
  return [...store.wishes].sort((a, b) => {
    const progressA = a.currentAmount / a.targetAmount
    const progressB = b.currentAmount / b.targetAmount
    return progressA - progressB
  })
})

function getProgressColor(category: WishCategory): string {
  const colors: Record<WishCategory, string> = {
    jewelry: '#FF6B9D',
    travel: '#60A5FA',
    other: '#FBBF24',
  }
  return colors[category]
}

function getCategoryLabel(category: WishCategory): string {
  const cat = wishCategories.find(c => c.key === category)
  return cat?.label || '其他'
}

function openAddModal() {
  newWishName.value = ''
  newWishTarget.value = ''
  newWishCategory.value = 'other'
  selectedIcon.value = '🎁'
  showAddModal.value = true
}

function handleAddWish() {
  if (!newWishName.value.trim() || !parseFloat(newWishTarget.value)) return
  const target = parseFloat(newWishTarget.value)
  if (target <= 0) return
  store.addWish(newWishName.value.trim(), selectedIcon.value, target, newWishCategory.value)
  showAddModal.value = false
}

function openDepositModal(wishId: string) {
  depositWishId.value = wishId
  depositAmount.value = ''
  showDepositModal.value = true
}

function handleDeposit() {
  if (!depositWishId.value || !parseFloat(depositAmount.value)) return
  const amount = parseFloat(depositAmount.value)
  if (amount <= 0) return
  store.depositToWish(depositWishId.value, amount)
  showDepositModal.value = false
}

function handleWithdraw(wishId: string) {
  const wish = store.wishes.find(w => w.id === wishId)
  if (!wish) return
  const amount = Math.min(wish.currentAmount, 100)
  store.withdrawFromWish(wishId, amount)
}

function handleDeleteWish(id: string) {
  if (confirm('确定要删除这个愿望吗？已存入的金额会返回到余额中。')) {
    store.deleteWish(id)
  }
}

function getWishById(id: string) {
  return store.wishes.find(w => w.id === id)
}
</script>

<template>
  <div class="wish-list">
    <div class="section-header">
      <h2 class="section-title">愿望清单</h2>
      <button class="add-btn" @click="openAddModal">
        <Plus :size="18" />
        <span>新愿望</span>
      </button>
    </div>

    <div class="balance-hint">
      <span>可用余额：</span>
      <span class="balance-amount">¥{{ store.balance.toFixed(0) }}</span>
    </div>

    <div class="wish-grid">
      <div
        v-for="wish in sortedWishes"
        :key="wish.id"
        class="wish-card"
      >
        <div class="wish-icon" :style="{ backgroundColor: getProgressColor(wish.category) + '20' }">
          <span class="wish-emoji">{{ wish.icon }}</span>
        </div>
        <div class="wish-info">
          <div class="wish-header">
            <h3 class="wish-name">{{ wish.name }}</h3>
            <span class="wish-cat" :style="{ color: getProgressColor(wish.category), backgroundColor: getProgressColor(wish.category) + '15' }">
              {{ getCategoryLabel(wish.category) }}
            </span>
          </div>
          <div class="wish-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: Math.min((wish.currentAmount / wish.targetAmount) * 100, 100) + '%',
                  backgroundColor: getProgressColor(wish.category),
                }"
              ></div>
            </div>
            <div class="progress-text">
              <span>¥{{ wish.currentAmount.toFixed(0) }}</span>
              <span>/ ¥{{ wish.targetAmount.toFixed(0) }}</span>
            </div>
            <div class="progress-percent" :style="{ color: getProgressColor(wish.category) }">
              {{ Math.round((wish.currentAmount / wish.targetAmount) * 100) }}%
            </div>
          </div>
          <div class="wish-actions">
            <button class="action-btn deposit" @click="openDepositModal(wish.id)">
              <Plus :size="14" />
              存入
            </button>
            <button class="action-btn withdraw" @click="handleWithdraw(wish.id)">
              <ChevronDown :size="14" />
              取出
            </button>
            <button class="action-btn delete" @click="handleDeleteWish(wish.id)">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.wishes.length === 0" class="empty-state">
      <div class="empty-icon">🌟</div>
      <div class="empty-text">还没有愿望，添加一个吧</div>
      <div class="empty-hint">为喜欢的东西攒钱更有动力</div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加新愿望</h3>
          <button class="close-btn" @click="showAddModal = false">×</button>
        </div>

        <div class="icon-picker">
          <button
            v-for="icon in iconOptions"
            :key="icon"
            class="icon-option"
            :class="{ active: selectedIcon === icon }"
            @click="selectedIcon = icon"
          >
            {{ icon }}
          </button>
        </div>

        <div class="form-group">
          <label>愿望名称</label>
          <input v-model="newWishName" type="text" placeholder="比如：小钻戒" />
        </div>

        <div class="form-group">
          <label>目标金额</label>
          <div class="amount-input">
            <span class="currency">¥</span>
            <input v-model="newWishTarget" type="number" placeholder="0" />
          </div>
        </div>

        <div class="form-group">
          <label>分类</label>
          <div class="cat-selector">
            <button
              v-for="cat in wishCategories"
              :key="cat.key"
              class="cat-chip"
              :class="{ active: newWishCategory === cat.key }"
              :style="newWishCategory === cat.key ? { backgroundColor: getProgressColor(cat.key) + '20', color: getProgressColor(cat.key) } : {}"
              @click="newWishCategory = cat.key"
            >
              <span class="cat-emoji">{{ cat.emoji }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <button class="confirm-btn" @click="handleAddWish">
          创建愿望
        </button>
      </div>
    </div>

    <div v-if="showDepositModal" class="modal-overlay" @click.self="showDepositModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>存入愿望</h3>
          <button class="close-btn" @click="showDepositModal = false">×</button>
        </div>

        <div v-if="depositWishId && getWishById(depositWishId)" class="deposit-wish-info">
          <span class="wish-icon-sm">{{ getWishById(depositWishId)?.icon }}</span>
          <div>
            <div class="wish-name">{{ getWishById(depositWishId)?.name }}</div>
            <div class="wish-balance">
              当前：¥{{ getWishById(depositWishId)?.currentAmount.toFixed(0) }} / ¥{{ getWishById(depositWishId)?.targetAmount.toFixed(0) }}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>存入金额</label>
          <div class="amount-input">
            <span class="currency">¥</span>
            <input v-model="depositAmount" type="number" placeholder="0" autofocus />
          </div>
        </div>

        <div class="deposit-hint">
          可用余额：¥{{ store.balance.toFixed(0) }}
        </div>

        <button class="confirm-btn" @click="handleDeposit">
          确认存入
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wish-list {
  padding: 0 16px 100px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #374151;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: rgba(255, 155, 123, 0.15);
  color: #ff9b7b;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: rgba(255, 155, 123, 0.25);
}

.balance-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #6b7280;
}

.balance-amount {
  font-weight: 700;
  color: #ff9b7b;
}

.wish-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wish-card {
  background: white;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  gap: 14px;
}

.wish-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wish-emoji {
  font-size: 26px;
}

.wish-info {
  flex: 1;
  min-width: 0;
}

.wish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.wish-name {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
}

.wish-cat {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
}

.wish-progress {
  margin-bottom: 10px;
}

.progress-bar {
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
}

.progress-percent {
  font-size: 11px;
  font-weight: 700;
  text-align: right;
  margin-top: 2px;
}

.wish-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-btn.deposit {
  background: rgba(90, 179, 126, 0.12);
  color: #5ab37e;
}

.action-btn.deposit:hover {
  background: rgba(90, 179, 126, 0.2);
}

.action-btn.withdraw {
  background: rgba(251, 191, 36, 0.12);
  color: #f59e0b;
}

.action-btn.withdraw:hover {
  background: rgba(251, 191, 36, 0.2);
}

.action-btn.delete {
  flex: none;
  width: auto;
  padding: 8px;
  background: #fef2f2;
  color: #ef4444;
}

.action-btn.delete:hover {
  background: #fee2e2;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.empty-hint {
  color: #9ca3af;
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  width: 100%;
  max-width: 480px;
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 20px;
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #374151;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  justify-content: center;
}

.icon-option {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.icon-option.active {
  background: #fff8f0;
  box-shadow: inset 0 0 0 2px #ff9b7b;
  transform: scale(1.1);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #f3f4f6;
  border-radius: 14px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-group input:focus {
  border-color: #ff9b7b;
}

.amount-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 2px solid #f3f4f6;
  border-radius: 14px;
  transition: border-color 0.2s ease;
}

.amount-input:focus-within {
  border-color: #ff9b7b;
}

.amount-input .currency {
  font-size: 18px;
  font-weight: 700;
  color: #374151;
}

.amount-input input {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  border: none;
  background: transparent;
  outline: none;
  color: #374151;
  padding: 0;
  width: auto;
}

.cat-selector {
  display: flex;
  gap: 10px;
}

.cat-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 14px;
  background: #f9fafb;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.cat-chip.active {
  color: #ff9b7b;
}

.cat-emoji {
  font-size: 20px;
}

.deposit-wish-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f9fafb;
  border-radius: 14px;
  margin-bottom: 20px;
}

.wish-icon-sm {
  font-size: 32px;
}

.wish-balance {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.deposit-hint {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.confirm-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #ff9b7b 0%, #ff7e5f 100%);
  color: white;
  font-size: 16px;
  font-weight: 700;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(255, 126, 95, 0.35);
  transition: all 0.2s ease;
}

.confirm-btn:active {
  transform: scale(0.98);
}
</style>
