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
        class="bg-white rounded-[20px] p-4 shadow-softer flex gap-3.5"
      >
        <div
          class="w-13 h-13 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{ backgroundColor: getProgressColor(wish.category) + '20' }"
        >
          <span class="text-2xl">{{ wish.icon }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-bold text-gray-700">{{ wish.name }}</h3>
            <span
              class="text-xs font-semibold px-2 py-0.5 rounded-lg"
              :style="{ color: getProgressColor(wish.category), backgroundColor: getProgressColor(wish.category) + '15' }"
            >
              {{ getCategoryLabel(wish.category) }}
            </span>
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
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
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

    <div v-if="showDepositModal" class="fixed inset-0 bg-black/40 z-[1000] flex items-end justify-center animate-[fadeIn_0.2s_ease]" @click.self="showDepositModal = false">
      <div class="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 animate-[slideUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-bold text-gray-700">存入愿望</h3>
          <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xl flex items-center justify-center" @click="showDepositModal = false">×</button>
        </div>

        <div
          v-if="depositWishId && getWishById(depositWishId)"
          class="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl mb-5"
        >
          <span class="text-3xl">{{ getWishById(depositWishId)?.icon }}</span>
          <div>
            <div class="font-semibold text-gray-700">{{ getWishById(depositWishId)?.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">
              当前：¥{{ getWishById(depositWishId)?.currentAmount.toFixed(0) }} / ¥{{ getWishById(depositWishId)?.targetAmount.toFixed(0) }}
            </div>
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
