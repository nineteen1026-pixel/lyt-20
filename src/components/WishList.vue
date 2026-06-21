<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, ChevronDown, Gem, Plane, Gift, Calendar, Flag, Pencil } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import type { WishCategory, WishPriority, Wish } from '@/types'

const store = useSavingStore()

const showAddModal = ref(false)
const newWishName = ref('')
const newWishTarget = ref('')
const newWishCategory = ref<WishCategory>('other')
const newWishDeadline = ref('')
const newWishPriority = ref<WishPriority>('medium')
const selectedIcon = ref('🎁')

const showEditModal = ref(false)
const editWishId = ref<string | null>(null)
const editWishName = ref('')
const editWishTarget = ref('')
const editWishCategory = ref<WishCategory>('other')
const editWishDeadline = ref('')
const editWishPriority = ref<WishPriority>('medium')
const editSelectedIcon = ref('🎁')

const depositWishId = ref<string | null>(null)
const depositAmount = ref('')
const showDepositModal = ref(false)

const wishCategories = [
  { key: 'jewelry' as WishCategory, label: '首饰', icon: Gem, emoji: '💍' },
  { key: 'travel' as WishCategory, label: '旅行', icon: Plane, emoji: '✈️' },
  { key: 'other' as WishCategory, label: '其他', icon: Gift, emoji: '🎁' },
] as const

const priorityOptions = [
  { key: 'low' as WishPriority, label: '低', color: '#10B981', bgColor: '#D1FAE5' },
  { key: 'medium' as WishPriority, label: '中', color: '#F59E0B', bgColor: '#FEF3C7' },
  { key: 'high' as WishPriority, label: '高', color: '#F97316', bgColor: '#FFEDD5' },
  { key: 'urgent' as WishPriority, label: '紧急', color: '#EF4444', bgColor: '#FEE2E2' },
] as const

const iconOptions = ['💍', '✈️', '📷', '👜', '👗', '🎮', '📚', '🏠', '🚗', '🎁']

const sortedWishes = computed(() => {
  return [...store.wishes].sort((a, b) => {
    return store.getWishUrgencyScore(b) - store.getWishUrgencyScore(a)
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

function getPriorityLabel(priority?: WishPriority): string {
  const p = priorityOptions.find(o => o.key === (priority || 'medium'))
  return p?.label || '中'
}

function getPriorityColor(priority?: WishPriority): string {
  const p = priorityOptions.find(o => o.key === (priority || 'medium'))
  return p?.color || '#F59E0B'
}

function getPriorityBgColor(priority?: WishPriority): string {
  const p = priorityOptions.find(o => o.key === (priority || 'medium'))
  return p?.bgColor || '#FEF3C7'
}

function formatDeadline(deadline?: string): string {
  if (!deadline) return ''
  const date = new Date(deadline)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

function getDaysText(wish: { deadline?: string }): string {
  const days = store.getDaysUntilDeadline(wish.deadline)
  if (days === null) return ''
  if (days < 0) return `已逾期${Math.abs(days)}天`
  if (days === 0) return '今天截止'
  if (days === 1) return '明天截止'
  return `还剩${days}天`
}

function getRemaining(wish: { targetAmount: number; currentAmount: number }): number {
  return Math.max(0, wish.targetAmount - wish.currentAmount)
}

function getSavingsHint(wish: Wish): string {
  const remaining = getRemaining(wish)
  if (remaining <= 0) return '目标已达成 🎉'

  const daysLeft = store.getDaysUntilDeadline(wish.deadline)

  if (daysLeft === null) {
    return `还差 ¥${remaining.toFixed(0)}，建议每月存 ¥${(remaining / 3).toFixed(0)}~¥${(remaining / 6).toFixed(0)}`
  }

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft)
    if (overdueDays <= 7) return `已逾期${overdueDays}天，请加快存入节奏！还差 ¥${remaining.toFixed(0)}`
    return `已逾期${overdueDays}天，尽快补齐！还差 ¥${remaining.toFixed(0)}`
  }

  if (daysLeft === 0) {
    return `今天截止！还差 ¥${remaining.toFixed(0)}，一次性补齐吧`
  }

  const daily = remaining / daysLeft
  const weekly = daily * 7
  const monthly = daily * 30

  if (daysLeft <= 3) {
    return `紧急！建议每天存 ¥${daily.toFixed(0)}（还差 ¥${remaining.toFixed(0)}，${daysLeft}天）`
  }
  if (daysLeft <= 7) {
    return `建议每天存 ¥${daily.toFixed(0)}，或本周一次存 ¥${weekly.toFixed(0)}（还差 ¥${remaining.toFixed(0)}）`
  }
  if (daysLeft <= 30) {
    return `建议每周存 ¥${weekly.toFixed(0)}（每天约 ¥${daily.toFixed(0)}，还差 ¥${remaining.toFixed(0)}）`
  }
  return `建议每月存 ¥${monthly.toFixed(0)}（每天约 ¥${daily.toFixed(0)}，还差 ¥${remaining.toFixed(0)}）`
}

function openAddModal() {
  newWishName.value = ''
  newWishTarget.value = ''
  newWishCategory.value = 'other'
  newWishDeadline.value = ''
  newWishPriority.value = 'medium'
  selectedIcon.value = '🎁'
  showAddModal.value = true
}

function handleAddWish() {
  if (!newWishName.value.trim() || !parseFloat(newWishTarget.value)) return
  const target = parseFloat(newWishTarget.value)
  if (target <= 0) return
  store.addWish(
    newWishName.value.trim(),
    selectedIcon.value,
    target,
    newWishCategory.value,
    newWishDeadline.value || undefined,
    newWishPriority.value
  )
  showAddModal.value = false
}

function openEditModal(wish: Wish) {
  editWishId.value = wish.id
  editWishName.value = wish.name
  editWishTarget.value = String(wish.targetAmount)
  editWishCategory.value = wish.category
  editWishDeadline.value = wish.deadline || ''
  editWishPriority.value = wish.priority || 'medium'
  editSelectedIcon.value = wish.icon
  showEditModal.value = true
}

function handleEditWish() {
  if (!editWishId.value) return
  if (!editWishName.value.trim() || !parseFloat(editWishTarget.value)) return
  const target = parseFloat(editWishTarget.value)
  if (target <= 0) return
  store.updateWish(editWishId.value, {
    name: editWishName.value.trim(),
    icon: editSelectedIcon.value,
    targetAmount: target,
    category: editWishCategory.value,
    deadline: editWishDeadline.value || undefined,
    priority: editWishPriority.value,
  })
  showEditModal.value = false
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
  <div class="px-4 pb-[100px]">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-xl font-bold text-gray-700">愿望清单</h2>
      <button
        class="flex items-center gap-1 px-3.5 py-2 bg-warm-500/15 text-warm-500 rounded-xl text-xs font-semibold transition-all duration-200 hover:bg-warm-500/25"
        @click="openAddModal"
      >
        <Plus :size="18" />
        <span>新愿望</span>
      </button>
    </div>

    <div class="flex items-center gap-1.5 mb-4 text-sm text-gray-500">
      <span>可用余额：</span>
      <span class="font-bold text-warm-500">¥{{ store.balance.toFixed(0) }}</span>
    </div>

    <div class="flex flex-col gap-3">
      <div
        v-for="wish in sortedWishes"
        :key="wish.id"
        class="bg-white rounded-[20px] p-4 shadow-softer flex gap-3.5 transition-all duration-300"
        :class="{
          'ring-2 ring-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]': store.isWishOverdue(wish),
          'ring-2 ring-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.15)] bg-gradient-to-br from-orange-50 to-white': store.isWishNearDeadline(wish) && !store.isWishOverdue(wish),
        }"
      >
        <div
          class="w-13 h-13 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{ backgroundColor: getProgressColor(wish.category) + '20' }"
        >
          <span class="text-2xl">{{ wish.icon }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <h3 class="text-sm font-bold text-gray-700">{{ wish.name }}</h3>
            <div class="flex items-center gap-1.5">
              <span
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                :style="{ color: getPriorityColor(wish.priority), backgroundColor: getPriorityBgColor(wish.priority) }"
              >
                <Flag :size="10" />
                {{ getPriorityLabel(wish.priority) }}
              </span>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-lg"
                :style="{ color: getProgressColor(wish.category), backgroundColor: getProgressColor(wish.category) + '15' }"
              >
                {{ getCategoryLabel(wish.category) }}
              </span>
            </div>
          </div>

          <div
            v-if="wish.deadline"
            class="flex items-center gap-1 mb-2 text-xs"
            :class="{
              'text-red-500 font-bold': store.isWishOverdue(wish),
              'text-orange-500 font-semibold': store.isWishNearDeadline(wish) && !store.isWishOverdue(wish),
              'text-gray-400': !store.isWishNearDeadline(wish) && !store.isWishOverdue(wish),
            }"
          >
            <Calendar :size="12" />
            <span>{{ formatDeadline(wish.deadline) }}</span>
            <span class="opacity-70">·</span>
            <span>{{ getDaysText(wish) }}</span>
          </div>

          <div class="mb-2.5">
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div
                class="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                :style="{
                  width: Math.min((wish.currentAmount / wish.targetAmount) * 100, 100) + '%',
                  backgroundColor: getProgressColor(wish.category),
                }"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-gray-400">
              <span>¥{{ wish.currentAmount.toFixed(0) }}</span>
              <span>/ ¥{{ wish.targetAmount.toFixed(0) }}</span>
            </div>
            <div class="text-right text-xs font-bold mt-0.5" :style="{ color: getProgressColor(wish.category) }">
              {{ Math.round((wish.currentAmount / wish.targetAmount) * 100) }}%
            </div>
          </div>

          <div
            class="text-[11px] mb-2.5 rounded-lg px-2.5 py-1.5"
            :class="{
              'bg-red-50 text-red-600 font-semibold': store.isWishOverdue(wish),
              'bg-orange-50 text-orange-600': store.isWishNearDeadline(wish) && !store.isWishOverdue(wish),
              'bg-gray-50 text-gray-500': !store.isWishNearDeadline(wish) && !store.isWishOverdue(wish),
            }"
          >
            {{ getSavingsHint(wish) }}
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-mint-500/12 text-mint-500 hover:bg-mint-500/20"
              @click="openDepositModal(wish.id)"
            >
              <Plus :size="14" />
              存入
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-amber-500/12 text-amber-500 hover:bg-amber-500/20"
              @click="handleWithdraw(wish.id)"
            >
              <ChevronDown :size="14" />
              取出
            </button>
            <button
              class="w-auto px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-blue-50 text-blue-500 hover:bg-blue-100"
              @click="openEditModal(wish)"
            >
              <Pencil :size="14" />
            </button>
            <button
              class="w-auto px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200 bg-red-50 text-red-500 hover:bg-red-100"
              @click="handleDeleteWish(wish.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.wishes.length === 0" class="text-center py-10 px-5">
      <div class="text-5xl mb-3">🌟</div>
      <div class="text-gray-500 text-sm font-semibold mb-1">还没有愿望，添加一个吧</div>
      <div class="text-gray-400 text-xs">为喜欢的东西攒钱更有动力</div>
    </div>

    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 z-[1000] flex items-end justify-center animate-[fadeIn_0.2s_ease]" @click.self="showAddModal = false">
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)] max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-gray-700">添加新愿望</h3>
          <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl flex items-center justify-center" @click="showAddModal = false">×</button>
        </div>

        <div class="flex flex-wrap gap-2 mb-5 justify-center">
          <button
            v-for="icon in iconOptions"
            :key="icon"
            class="w-11 h-11 rounded-xl text-2xl flex items-center justify-center bg-gray-50 transition-all duration-200"
            :class="{ 'bg-warm-50 shadow-[inset_0_0_0_2px_#ff9b7b] scale-110': selectedIcon === icon }"
            @click="selectedIcon = icon"
          >
            {{ icon }}
          </button>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">愿望名称</label>
          <input
            v-model="newWishName"
            type="text"
            placeholder="比如：小钻戒"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">目标金额</label>
          <div class="flex items-center gap-2 py-3 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl transition-colors duration-200 focus-within:border-warm-500">
            <span class="text-lg font-bold text-gray-700">¥</span>
            <input
              v-model="newWishTarget"
              type="number"
              placeholder="0"
              class="flex-1 text-lg font-bold border-none bg-transparent outline-none text-gray-700 p-0 w-auto"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">
            <span class="inline-flex items-center gap-1">
              <Calendar :size="14" />
              截止日期
              <span class="text-gray-400 font-normal text-xs">（可选）</span>
            </span>
          </label>
          <input
            v-model="newWishDeadline"
            type="date"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500 bg-gray-50"
          />
        </div>

        <div class="mb-5">
          <label class="block text-sm font-semibold text-gray-500 mb-2">
            <span class="inline-flex items-center gap-1">
              <Flag :size="14" />
              优先级
            </span>
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="p in priorityOptions"
              :key="p.key"
              class="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition-all duration-200 text-xs font-semibold"
              :class="{ 'scale-105 shadow-md': newWishPriority === p.key }"
              :style="newWishPriority === p.key ? { backgroundColor: p.bgColor, color: p.color } : { backgroundColor: '#F9FAFB', color: '#9CA3AF' }"
              @click="newWishPriority = p.key"
            >
              <Flag :size="14" />
              <span>{{ p.label }}</span>
            </button>
          </div>
        </div>

        <div class="mb-5">
          <label class="block text-sm font-semibold text-gray-500 mb-2">分类</label>
          <div class="flex gap-2.5">
            <button
              v-for="cat in wishCategories"
              :key="cat.key"
              class="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-gray-50 transition-all duration-200 text-xs font-semibold text-gray-500"
              :class="{ 'text-warm-500': newWishCategory === cat.key }"
              :style="newWishCategory === cat.key ? { backgroundColor: getProgressColor(cat.key) + '20', color: getProgressColor(cat.key) } : {}"
              @click="newWishCategory = cat.key"
            >
              <span class="text-xl">{{ cat.emoji }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <button
          class="w-full py-4 bg-gradient-to-br from-warm-500 to-warm-600 text-white text-base font-bold rounded-xl shadow-pop transition-all duration-200 active:scale-[0.98]"
          @click="handleAddWish"
        >
          创建愿望
        </button>
      </div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 z-[1000] flex items-end justify-center animate-[fadeIn_0.2s_ease]" @click.self="showEditModal = false">
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)] max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-gray-700">编辑愿望</h3>
          <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl flex items-center justify-center" @click="showEditModal = false">×</button>
        </div>

        <div class="flex flex-wrap gap-2 mb-5 justify-center">
          <button
            v-for="icon in iconOptions"
            :key="icon"
            class="w-11 h-11 rounded-xl text-2xl flex items-center justify-center bg-gray-50 transition-all duration-200"
            :class="{ 'bg-warm-50 shadow-[inset_0_0_0_2px_#ff9b7b] scale-110': editSelectedIcon === icon }"
            @click="editSelectedIcon = icon"
          >
            {{ icon }}
          </button>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">愿望名称</label>
          <input
            v-model="editWishName"
            type="text"
            placeholder="比如：小钻戒"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">目标金额</label>
          <div class="flex items-center gap-2 py-3 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl transition-colors duration-200 focus-within:border-warm-500">
            <span class="text-lg font-bold text-gray-700">¥</span>
            <input
              v-model="editWishTarget"
              type="number"
              placeholder="0"
              class="flex-1 text-lg font-bold border-none bg-transparent outline-none text-gray-700 p-0 w-auto"
            />
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">
            <span class="inline-flex items-center gap-1">
              <Calendar :size="14" />
              截止日期
              <span class="text-gray-400 font-normal text-xs">（可选）</span>
            </span>
          </label>
          <input
            v-model="editWishDeadline"
            type="date"
            class="w-full py-3 px-4 border-2 border-gray-100 rounded-xl text-sm outline-none transition-colors duration-200 focus:border-warm-500 bg-gray-50"
          />
        </div>

        <div class="mb-5">
          <label class="block text-sm font-semibold text-gray-500 mb-2">
            <span class="inline-flex items-center gap-1">
              <Flag :size="14" />
              优先级
            </span>
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="p in priorityOptions"
              :key="p.key"
              class="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition-all duration-200 text-xs font-semibold"
              :class="{ 'scale-105 shadow-md': editWishPriority === p.key }"
              :style="editWishPriority === p.key ? { backgroundColor: p.bgColor, color: p.color } : { backgroundColor: '#F9FAFB', color: '#9CA3AF' }"
              @click="editWishPriority = p.key"
            >
              <Flag :size="14" />
              <span>{{ p.label }}</span>
            </button>
          </div>
        </div>

        <div class="mb-5">
          <label class="block text-sm font-semibold text-gray-500 mb-2">分类</label>
          <div class="flex gap-2.5">
            <button
              v-for="cat in wishCategories"
              :key="cat.key"
              class="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-gray-50 transition-all duration-200 text-xs font-semibold text-gray-500"
              :class="{ 'text-warm-500': editWishCategory === cat.key }"
              :style="editWishCategory === cat.key ? { backgroundColor: getProgressColor(cat.key) + '20', color: getProgressColor(cat.key) } : {}"
              @click="editWishCategory = cat.key"
            >
              <span class="text-xl">{{ cat.emoji }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <button
          class="w-full py-4 bg-gradient-to-br from-warm-500 to-warm-600 text-white text-base font-bold rounded-xl shadow-pop transition-all duration-200 active:scale-[0.98]"
          @click="handleEditWish"
        >
          保存修改
        </button>
      </div>
    </div>

    <div v-if="showDepositModal" class="fixed inset-0 bg-black/40 z-[1000] flex items-end justify-center animate-[fadeIn_0.2s_ease]" @click.self="showDepositModal = false">
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-gray-700">存入愿望</h3>
          <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl flex items-center justify-center" @click="showDepositModal = false">×</button>
        </div>

        <div
          v-if="depositWishId && getWishById(depositWishId)"
          class="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl mb-4"
        >
          <span class="text-3xl">{{ getWishById(depositWishId)?.icon }}</span>
          <div class="flex-1">
            <div class="font-semibold text-gray-700">{{ getWishById(depositWishId)?.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">
              当前：¥{{ getWishById(depositWishId)?.currentAmount.toFixed(0) }} / ¥{{ getWishById(depositWishId)?.targetAmount.toFixed(0) }}
            </div>
          </div>
        </div>

        <div
          v-if="depositWishId && getWishById(depositWishId)"
          class="p-3.5 rounded-xl mb-4 border-2"
          :class="{
            'bg-red-50 border-red-200': store.isWishOverdue(getWishById(depositWishId)!),
            'bg-orange-50 border-orange-200': store.isWishNearDeadline(getWishById(depositWishId)!) && !store.isWishOverdue(getWishById(depositWishId)!),
            'bg-warm-50 border-warm-200': !store.isWishNearDeadline(getWishById(depositWishId)!) && !store.isWishOverdue(getWishById(depositWishId)!)
              && getWishById(depositWishId)?.deadline,
            'bg-gray-50 border-gray-200': !getWishById(depositWishId)?.deadline,
          }"
        >
          <div
            v-if="getWishById(depositWishId)?.deadline"
            class="flex items-center gap-2 mb-1.5"
          >
            <Calendar :size="14" class="text-warm-500" />
            <span
              class="text-xs font-semibold"
              :class="{
                'text-red-600': store.isWishOverdue(getWishById(depositWishId)!),
                'text-orange-600': store.isWishNearDeadline(getWishById(depositWishId)!) && !store.isWishOverdue(getWishById(depositWishId)!),
                'text-gray-600': !store.isWishNearDeadline(getWishById(depositWishId)!) && !store.isWishOverdue(getWishById(depositWishId)!),
              }"
            >
              {{ getDaysText(getWishById(depositWishId)!) }}
            </span>
          </div>
          <div
            class="text-sm font-bold"
            :class="{
              'text-red-600': store.isWishOverdue(getWishById(depositWishId)!),
              'text-gray-700': !store.isWishOverdue(getWishById(depositWishId)!),
            }"
          >
            {{ getSavingsHint(getWishById(depositWishId)!) }}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">
            距离目标还差 ¥{{ getRemaining(getWishById(depositWishId)!).toFixed(0) }}
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-semibold text-gray-500 mb-2">存入金额</label>
          <div class="flex items-center gap-2 py-3 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl transition-colors duration-200 focus-within:border-warm-500">
            <span class="text-lg font-bold text-gray-700">¥</span>
            <input
              v-model="depositAmount"
              type="number"
              placeholder="0"
              autofocus
              class="flex-1 text-lg font-bold border-none bg-transparent outline-none text-gray-700 p-0 w-auto"
            />
          </div>
        </div>

        <div class="text-center text-xs text-gray-400 mb-4">
          可用余额：¥{{ store.balance.toFixed(0) }}
        </div>

        <button
          class="w-full py-4 bg-gradient-to-br from-warm-500 to-warm-600 text-white text-base font-bold rounded-xl shadow-pop transition-all duration-200 active:scale-[0.98]"
          @click="handleDeposit"
        >
          确认存入
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
