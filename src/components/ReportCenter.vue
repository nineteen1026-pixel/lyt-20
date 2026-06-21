<script setup lang="ts">
import { computed, ref } from 'vue'
import { TrendingUp, PieChart, Target, Download, BarChart3, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import { useCategories } from '@/composables/useCategories'
import { getIconComponent } from '@/utils/iconMap'
import { exportTransactionsToCsv, exportMonthlyReportToCsv, exportWishesToCsv, exportToJson } from '@/utils/export'
import type { TransactionType } from '@/types'

const store = useSavingStore()
const { getCategoryById } = useCategories()

const showExportMenu = ref(false)
const activeCategoryType = ref<TransactionType>('expense')

const maxTrendValue = computed(() => {
  let max = 0
  for (const m of store.monthlyTrend) {
    max = Math.max(max, m.income, m.expense)
  }
  return max || 1
})

const totalExpense = computed(() =>
  store.expenseCategoryStats.reduce((s, c) => s + c.amount, 0)
)

const totalIncome = computed(() =>
  store.incomeCategoryStats.reduce((s, c) => s + c.amount, 0)
)

const activeStats = computed(() =>
  activeCategoryType.value === 'expense' ? store.expenseCategoryStats : store.incomeCategoryStats
)

function handleExportTransactions() {
  exportTransactionsToCsv(store.transactions, { getCategoryById })
  showExportMenu.value = false
}

function handleExportMonthlyReport() {
  const ws = store.wishStats
  exportMonthlyReportToCsv(
    store.monthlyTrend,
    store.expenseCategoryStats,
    store.incomeCategoryStats,
    {
      totalCount: ws.totalCount,
      achievedCount: ws.achievedCount,
      achievedRate: ws.achievedRate,
      totalTargetAmount: ws.totalTargetAmount,
      totalCurrentAmount: ws.totalCurrentAmount,
      overallProgress: ws.overallProgress,
      wishes: store.wishes.map((w) => ({
        name: w.name,
        targetAmount: w.targetAmount,
        currentAmount: w.currentAmount,
        progress: w.targetAmount > 0 ? (w.currentAmount / w.targetAmount) * 100 : 0,
        achieved: w.currentAmount >= w.targetAmount,
      })),
    },
    store.reportPeriodLabel
  )
  showExportMenu.value = false
}

function handleExportWishes() {
  exportWishesToCsv(store.wishes)
  showExportMenu.value = false
}

function handleExportBackup() {
  exportToJson(store.getExportState())
  showExportMenu.value = false
}

function getWishProgressColor(wish: { currentAmount: number; targetAmount: number }): string {
  const percent = wish.targetAmount > 0 ? (wish.currentAmount / wish.targetAmount) * 100 : 0
  if (percent >= 100) return '#10B981'
  if (percent >= 70) return '#F59E0B'
  if (percent >= 30) return '#F97316'
  return '#EF4444'
}
</script>

<template>
  <div class="px-4 pb-[100px]">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-gray-700 flex items-center gap-2">
        <BarChart3 :size="22" class="text-lavender-500" />
        储蓄报表
      </h2>
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-3.5 py-2 bg-lavender-500/15 text-lavender-600 rounded-xl text-xs font-semibold transition-all duration-200 hover:bg-lavender-500/25"
          @click="showExportMenu = !showExportMenu"
        >
          <Download :size="16" />
          <span>导出</span>
          <ChevronDown v-if="!showExportMenu" :size="14" />
          <ChevronUp v-else :size="14" />
        </button>
        <transition name="fade">
          <div
            v-if="showExportMenu"
            class="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 min-w-[160px] border border-gray-100"
          >
            <button
              class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              @click="handleExportMonthlyReport"
            >
              <BarChart3 :size="16" class="text-lavender-500" />
              月度报表 CSV
            </button>
            <button
              class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-50"
              @click="handleExportTransactions"
            >
              <TrendingUp :size="16" class="text-mint-500" />
              交易记录 CSV
            </button>
            <button
              class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-50"
              @click="handleExportWishes"
            >
              <Target :size="16" class="text-amber-500" />
              愿望清单 CSV
            </button>
            <button
              class="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 border-t border-gray-50"
              @click="handleExportBackup"
            >
              <Download :size="16" class="text-warm-500" />
              完整备份 JSON
            </button>
          </div>
        </transition>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-4 mb-4 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 bg-lavender-50 rounded-lg flex items-center justify-center">
          <TrendingUp :size="18" class="text-lavender-500" />
        </div>
        <span class="text-sm font-bold text-gray-700">月度收支趋势</span>
        <span class="text-[10px] px-2 py-0.5 bg-lavender-100 text-lavender-600 rounded-full font-medium">{{ store.reportPeriodLabel }}</span>
      </div>

      <div class="space-y-3">
        <div
          v-for="month in store.monthlyTrend"
          :key="month.month"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-gray-600 w-10">{{ month.monthLabel }}</span>
            <div class="flex-1 mx-3 flex gap-1 h-6 items-end">
              <div
                class="flex-1 bg-mint-400/80 rounded-t transition-all duration-500 ease-out"
                :style="{ height: `${(month.income / maxTrendValue) * 100}%`, minHeight: month.income > 0 ? '4px' : '0' }"
                :title="`收入: ¥${month.income.toFixed(0)}`"
              ></div>
              <div
                class="flex-1 bg-warm-400/80 rounded-t transition-all duration-500 ease-out"
                :style="{ height: `${(month.expense / maxTrendValue) * 100}%`, minHeight: month.expense > 0 ? '4px' : '0' }"
                :title="`支出: ¥${month.expense.toFixed(0)}`"
              ></div>
            </div>
            <span
              class="w-16 text-right text-xs font-bold"
              :class="month.balance >= 0 ? 'text-mint-600' : 'text-red-500'"
            >
              {{ month.balance >= 0 ? '+' : '' }}¥{{ month.balance.toFixed(0) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center gap-5 mt-4 pt-3 border-t border-gray-100">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-mint-400 rounded-sm"></span>
          <span class="text-xs text-gray-500 font-medium">收入</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-warm-400 rounded-sm"></span>
          <span class="text-xs text-gray-500 font-medium">支出</span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-4 mb-4 shadow-softer">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-butter-50 rounded-lg flex items-center justify-center">
            <PieChart :size="18" class="text-butter-500" />
          </div>
          <span class="text-sm font-bold text-gray-700">分类占比</span>
          <span class="text-[10px] px-2 py-0.5 bg-butter-100 text-butter-600 rounded-full font-medium">{{ store.reportPeriodLabel }}</span>
        </div>
        <div class="flex bg-gray-100 rounded-lg p-0.5">
          <button
            class="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200"
            :class="activeCategoryType === 'expense' ? 'bg-white text-warm-500 shadow-sm' : 'text-gray-500'"
            @click="activeCategoryType = 'expense'"
          >
            支出
          </button>
          <button
            class="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200"
            :class="activeCategoryType === 'income' ? 'bg-white text-mint-500 shadow-sm' : 'text-gray-500'"
            @click="activeCategoryType = 'income'"
          >
            收入
          </button>
        </div>
      </div>

      <div v-if="activeStats.length === 0" class="text-center py-8 px-4">
        <div class="text-4xl mb-2">📊</div>
        <div class="text-sm text-gray-400">暂无{{ activeCategoryType === 'expense' ? '支出' : '收入' }}记录</div>
      </div>

      <div v-else class="space-y-3.5">
        <div
          v-for="stat in activeStats"
          :key="stat.categoryId"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                :style="{ backgroundColor: stat.categoryColor + '20', color: stat.categoryColor }"
              >
                <component v-if="getIconComponent(stat.categoryIcon)" :is="getIconComponent(stat.categoryIcon)" :size="14" />
                <span v-else class="text-xs">📌</span>
              </div>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-700 truncate">{{ stat.categoryName }}</div>
                <div class="text-[10px] text-gray-400">{{ stat.count }} 笔</div>
              </div>
            </div>
            <div class="text-right flex-shrink-0 ml-2">
              <div
                class="text-sm font-bold"
                :class="activeCategoryType === 'income' ? 'text-mint-500' : 'text-warm-500'"
              >
                ¥{{ stat.amount.toFixed(0) }}
              </div>
              <div class="text-[10px] font-semibold text-gray-400">{{ stat.percent.toFixed(1) }}%</div>
            </div>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden pl-9">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :style="{ width: stat.percent + '%', backgroundColor: stat.categoryColor }"
            ></div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 mt-2 border-t border-gray-100">
          <span class="text-xs font-semibold text-gray-500">
            {{ activeCategoryType === 'expense' ? '总支出' : '总收入' }}
          </span>
          <span
            class="text-base font-bold"
            :class="activeCategoryType === 'income' ? 'text-mint-500' : 'text-warm-500'"
          >
            ¥{{ (activeCategoryType === 'expense' ? totalExpense : totalIncome).toFixed(0) }}
          </span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl p-4 shadow-softer">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Target :size="18" class="text-amber-500" />
          </div>
          <span class="text-sm font-bold text-gray-700">愿望达成率</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full font-medium">
            {{ store.wishStats.achievedCount }}/{{ store.wishStats.totalCount }} 已达成
          </span>
          <span class="text-sm font-bold text-amber-500">
            {{ store.wishStats.achievedRate.toFixed(0) }}%
          </span>
        </div>
      </div>

      <div v-if="store.wishes.length === 0" class="text-center py-8 px-4">
        <div class="text-4xl mb-2">🌟</div>
        <div class="text-sm text-gray-400">还没有愿望，添加一个开始储蓄吧</div>
      </div>

      <div v-else class="space-y-3">
        <div class="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-amber-700">整体进度</span>
            <span class="text-xs font-bold text-amber-600">
              ¥{{ store.wishStats.totalCurrentAmount.toFixed(0) }} / ¥{{ store.wishStats.totalTargetAmount.toFixed(0) }}
            </span>
          </div>
          <div class="h-3 bg-white rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700 ease-out"
              :style="{ width: store.wishStats.overallProgress + '%' }"
            ></div>
          </div>
          <div class="text-right text-[10px] font-semibold text-amber-600 mt-1">
            {{ store.wishStats.overallProgress.toFixed(1) }}%
          </div>
        </div>

        <div class="space-y-2.5">
          <div
            v-for="wish in store.wishes"
            :key="wish.id"
            class="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl"
          >
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              :style="{ backgroundColor: (wish.category === 'jewelry' ? '#FF6B9D' : wish.category === 'travel' ? '#60A5FA' : '#FBBF24') + '20' }"
            >
              <span class="text-lg">{{ wish.icon }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold text-gray-700 truncate">{{ wish.name }}</span>
                <span
                  class="text-xs font-bold flex-shrink-0 ml-2"
                  :style="{ color: getWishProgressColor(wish) }"
                >
                  {{ Math.min(100, Math.round((wish.currentAmount / wish.targetAmount) * 100)) }}%
                </span>
              </div>
              <div class="h-2 bg-white rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500 ease-out"
                  :style="{
                    width: Math.min(100, (wish.currentAmount / wish.targetAmount) * 100) + '%',
                    backgroundColor: getWishProgressColor(wish),
                  }"
                ></div>
              </div>
              <div class="text-[10px] text-gray-400 mt-0.5">
                ¥{{ wish.currentAmount.toFixed(0) }} / ¥{{ wish.targetAmount.toFixed(0) }}
                <span v-if="wish.currentAmount >= wish.targetAmount" class="text-mint-500 font-semibold ml-1">✓ 已达成</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
