<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2, Plus, Minus } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import type { TransactionType } from '@/types'

const store = useSavingStore()
const { getCategoryById, getCategoriesByType } = useCategories()

const showAddModal = ref(false)
const newTxType = ref<TransactionType>('expense')
const newTxAmount = ref('')
const newTxCategory = ref('')
const newTxNote = ref('')

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

function openAddModal(type: TransactionType) {
  newTxType.value = type
  newTxAmount.value = ''
  newTxNote.value = ''
  const cats = getCategoriesByType(type)
  newTxCategory.value = cats[0]?.id || ''
  showAddModal.value = true
}

function handleAdd() {
  const amount = parseFloat(newTxAmount.value)
  if (!amount || amount <= 0 || !newTxCategory.value) return
  store.addTransaction(newTxType.value, amount, newTxCategory.value, newTxNote.value || (newTxType.value === 'income' ? '收入' : '支出'))
  showAddModal.value = false
}

function handleDelete(id: string) {
  if (confirm('确定要删除这条记录吗？')) {
    store.deleteTransaction(id)
  }
}
</script>

<template>
  <div class="account-book">
    <div class="summary-cards">
      <div class="summary-card income">
        <div class="summary-label">本月收入</div>
        <div class="summary-value">¥{{ store.monthlyIncome.toFixed(0) }}</div>
      </div>
      <div class="summary-card expense">
        <div class="summary-label">本月支出</div>
        <div class="summary-value">¥{{ store.monthlyExpense.toFixed(0) }}</div>
      </div>
      <div class="summary-card balance">
        <div class="summary-label">结余</div>
        <div class="summary-value">¥{{ (store.monthlyIncome - store.monthlyExpense).toFixed(0) }}</div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="quick-btn income-btn" @click="openAddModal('income')">
        <Plus :size="18" />
        <span>记收入</span>
      </button>
      <button class="quick-btn expense-btn" @click="openAddModal('expense')">
        <Minus :size="18" />
        <span>记支出</span>
      </button>
    </div>

    <div class="transaction-list">
      <div v-for="(txs, date) in groupedTransactions" :key="date" class="date-group">
        <div class="date-header">{{ formatDate(date as string) }}</div>
        <div
          v-for="tx in txs"
          :key="tx.id"
          class="tx-item"
        >
          <div
            class="tx-icon"
            :style="{ backgroundColor: getCategoryById(tx.categoryId)?.color + '20', color: getCategoryById(tx.categoryId)?.color }"
          >
            <span class="tx-emoji">{{ getCategoryById(tx.categoryId)?.icon ? '' : '💰' }}</span>
          </div>
          <div class="tx-info">
            <div class="tx-name">{{ getCategoryById(tx.categoryId)?.name || '其他' }}</div>
            <div class="tx-note" v-if="tx.note">{{ tx.note }}</div>
          </div>
          <div class="tx-amount" :class="tx.type">
            {{ formatAmount(tx.amount, tx.type) }}
          </div>
          <button class="tx-delete" @click="handleDelete(tx.id)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <div v-if="sortedTransactions.length === 0" class="empty-state">
        <div class="empty-icon">📒</div>
        <div class="empty-text">还没有记录，开始记账吧</div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ newTxType === 'income' ? '记一笔收入' : '记一笔支出' }}</h3>
          <button class="close-btn" @click="showAddModal = false">×</button>
        </div>

        <div class="type-toggle">
          <button
            :class="{ active: newTxType === 'income' }"
            @click="newTxType = 'income'; newTxCategory = getCategoriesByType('income')[0]?.id || ''"
          >
            收入
          </button>
          <button
            :class="{ active: newTxType === 'expense' }"
            @click="newTxType = 'expense'; newTxCategory = getCategoriesByType('expense')[0]?.id || ''"
          >
            支出
          </button>
        </div>

        <div class="amount-input">
          <span class="currency">¥</span>
          <input
            v-model="newTxAmount"
            type="number"
            placeholder="0.00"
            autofocus
          />
        </div>

        <div class="category-grid">
          <button
            v-for="cat in getCategoriesByType(newTxType)"
            :key="cat.id"
            class="cat-item"
            :class="{ active: newTxCategory === cat.id }"
            @click="newTxCategory = cat.id"
          >
            <div class="cat-icon" :style="{ backgroundColor: cat.color + '20', color: cat.color }">
              <span>{{ cat.icon ? '' : '📌' }}</span>
            </div>
            <span class="cat-name">{{ cat.name }}</span>
          </button>
        </div>

        <div class="note-input">
          <input
            v-model="newTxNote"
            type="text"
            placeholder="添加备注（可选）"
          />
        </div>

        <button class="confirm-btn" @click="handleAdd">
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-book {
  padding: 0 16px 100px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.summary-card {
  background: white;
  border-radius: 16px;
  padding: 14px 10px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.summary-label {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 700;
}

.summary-card.income .summary-value {
  color: #5ab37e;
}

.summary-card.expense .summary-value {
  color: #ff9b7b;
}

.summary-card.balance .summary-value {
  color: #9c7dd4;
}

.quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.income-btn {
  background: rgba(90, 179, 126, 0.12);
  color: #5ab37e;
}

.income-btn:hover {
  background: rgba(90, 179, 126, 0.2);
}

.expense-btn {
  background: rgba(255, 155, 123, 0.12);
  color: #ff9b7b;
}

.expense-btn:hover {
  background: rgba(255, 155, 123, 0.2);
}

.transaction-list {
  background: white;
  border-radius: 20px;
  padding: 4px 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.date-group {
  padding: 0 16px;
}

.date-header {
  font-size: 12px;
  color: #9ca3af;
  padding: 12px 0 6px;
  font-weight: 600;
}

.tx-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.tx-item:last-child {
  border-bottom: none;
}

.tx-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.tx-emoji {
  font-size: 20px;
}

.tx-info {
  flex: 1;
  min-width: 0;
}

.tx-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.tx-note {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tx-amount {
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.tx-amount.income {
  color: #5ab37e;
}

.tx-amount.expense {
  color: #ff9b7b;
}

.tx-delete {
  color: #d1d5db;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.tx-delete:hover {
  color: #ef4444;
  background: #fef2f2;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  color: #9ca3af;
  font-size: 14px;
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
  margin-bottom: 16px;
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

.type-toggle {
  display: flex;
  background: #f3f4f6;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
}

.type-toggle button {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.type-toggle button.active {
  background: white;
  color: #ff9b7b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.amount-input {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 16px;
}

.currency {
  font-size: 24px;
  font-weight: 700;
  color: #374151;
}

.amount-input input {
  flex: 1;
  font-size: 32px;
  font-weight: 700;
  border: none;
  background: transparent;
  outline: none;
  color: #374151;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 14px;
  transition: all 0.2s ease;
}

.cat-item.active {
  background: #fff8f0;
  box-shadow: inset 0 0 0 2px #ff9b7b;
}

.cat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.cat-name {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}

.cat-item.active .cat-name {
  color: #ff9b7b;
}

.note-input {
  margin-bottom: 20px;
}

.note-input input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #f3f4f6;
  border-radius: 14px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.note-input input:focus {
  border-color: #ff9b7b;
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
