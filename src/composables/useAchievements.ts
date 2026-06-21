import { ref, computed, onMounted } from 'vue'
import type { Achievement, UnlockedAchievement, AchievementState, AchievementConditionType } from '@/types'

const allAchievements = ref<Achievement[]>([])
const loaded = ref(false)
const unlockedAchievements = ref<UnlockedAchievement[]>([])
const newlyUnlocked = ref<Achievement | null>(null)
const showUnlockModal = ref(false)

const achievementStats = ref<AchievementState['stats']>({
  totalIncome: 0,
  totalTransactions: 0,
  consecutiveDays: 0,
  lastActiveDate: '',
  wishesAchieved: 0,
  decorationsOwned: 0,
  monthsWithSurplus: 0,
  consecutiveNoOverspend: 0,
})

export function useAchievements() {
  async function loadAchievements() {
    if (loaded.value) return

    try {
      const res = await fetch('/mock/achievements.json')
      const data = await res.json()
      allAchievements.value = data.achievements || []
      loaded.value = true
    } catch (e) {
      console.error('Failed to load achievements:', e)
    }
  }

  function getAchievementById(id: string): Achievement | undefined {
    return allAchievements.value.find((a) => a.id === id)
  }

  function isUnlocked(achievementId: string): boolean {
    return unlockedAchievements.value.some((ua) => ua.achievementId === achievementId)
  }

  const unlockedAchievementDetails = computed(() => {
    return unlockedAchievements.value
      .map((ua) => {
        const achievement = getAchievementById(ua.achievementId)
        return achievement ? { ...achievement, unlockedAt: ua.unlockedAt, displayed: ua.displayed } : null
      })
      .filter(Boolean) as Array<Achievement & { unlockedAt: string; displayed: boolean }>
  })

  const pendingDisplayAchievements = computed(() => {
    return unlockedAchievements.value
      .filter((ua) => !ua.displayed)
      .map((ua) => getAchievementById(ua.achievementId))
      .filter(Boolean) as Achievement[]
  })

  const achievementProgress = computed(() => {
    return allAchievements.value.map((achievement) => {
      const current = getCurrentProgress(achievement.condition.type)
      const target = achievement.condition.target
      const progress = Math.min(100, (current / target) * 100)
      return {
        achievement,
        current,
        target,
        progress,
        isUnlocked: isUnlocked(achievement.id),
      }
    })
  })

  function getCurrentProgress(conditionType: AchievementConditionType): number {
    switch (conditionType) {
      case 'first_income':
        return achievementStats.value.totalIncome > 0 ? 1 : 0
      case 'total_savings':
        return achievementStats.value.totalIncome
      case 'milestone_reached':
        return achievementStats.value.totalIncome
      case 'consecutive_days':
        return achievementStats.value.consecutiveDays
      case 'wish_achieved':
        return achievementStats.value.wishesAchieved
      case 'wish_count':
        return achievementStats.value.wishesAchieved
      case 'decoration_count':
        return achievementStats.value.decorationsOwned
      case 'transaction_count':
        return achievementStats.value.totalTransactions
      case 'monthly_surplus':
        return achievementStats.value.monthsWithSurplus
      case 'no_overspend':
        return achievementStats.value.consecutiveNoOverspend
      case 'recurring_bill':
        return achievementStats.value.totalTransactions > 0 ? 1 : 0
      case 'budget_strict':
        return achievementStats.value.consecutiveNoOverspend
      default:
        return 0
    }
  }

  function checkAchievements(stats: Partial<AchievementState['stats']>): Achievement[] {
    const newlyUnlockedList: Achievement[] = []

    Object.assign(achievementStats.value, stats)
    updateConsecutiveDays()

    for (const achievement of allAchievements.value) {
      if (isUnlocked(achievement.id)) continue

      const current = getCurrentProgress(achievement.condition.type)
      if (current >= achievement.condition.target) {
        unlockedAchievements.value.push({
          achievementId: achievement.id,
          unlockedAt: new Date().toISOString(),
          displayed: false,
        })
        newlyUnlockedList.push(achievement)
      }
    }

    return newlyUnlockedList
  }

  function updateConsecutiveDays() {
    const today = new Date().toISOString().split('T')[0]
    const lastDate = achievementStats.value.lastActiveDate

    if (!lastDate) {
      achievementStats.value.consecutiveDays = 1
    } else {
      const last = new Date(lastDate)
      const current = new Date(today)
      const diffTime = current.getTime() - last.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
      } else if (diffDays === 1) {
        achievementStats.value.consecutiveDays += 1
      } else {
        achievementStats.value.consecutiveDays = 1
      }
    }

    achievementStats.value.lastActiveDate = today
  }

  function markAsDisplayed(achievementId: string) {
    const ua = unlockedAchievements.value.find((u) => u.achievementId === achievementId)
    if (ua) {
      ua.displayed = true
    }
  }

  function showUnlockNotification(achievement: Achievement) {
    newlyUnlocked.value = achievement
    showUnlockModal.value = true
  }

  function closeUnlockModal() {
    if (newlyUnlocked.value) {
      markAsDisplayed(newlyUnlocked.value.id)
    }
    showUnlockModal.value = false
    newlyUnlocked.value = null
  }

  function loadAchievementState(state: Partial<AchievementState>) {
    if (state.unlockedAchievements) {
      unlockedAchievements.value = state.unlockedAchievements
    }
    if (state.stats) {
      Object.assign(achievementStats.value, state.stats)
    }
  }

  function getAchievementState(): AchievementState {
    return {
      unlockedAchievements: unlockedAchievements.value,
      stats: { ...achievementStats.value },
    }
  }

  function getRarityColor(rarity: Achievement['rarity']): string {
    const colors: Record<Achievement['rarity'], string> = {
      common: '#9CA3AF',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#F59E0B',
    }
    return colors[rarity]
  }

  function getRarityLabel(rarity: Achievement['rarity']): string {
    const labels: Record<Achievement['rarity'], string> = {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    }
    return labels[rarity]
  }

  function getRarityBgClass(rarity: Achievement['rarity']): string {
    const classes: Record<Achievement['rarity'], string> = {
      common: 'bg-gray-100 border-gray-300',
      rare: 'bg-blue-50 border-blue-300',
      epic: 'bg-purple-50 border-purple-300',
      legendary: 'bg-amber-50 border-amber-400',
    }
    return classes[rarity]
  }

  onMounted(() => {
    loadAchievements()
  })

  return {
    allAchievements,
    loaded,
    unlockedAchievements,
    achievementStats,
    newlyUnlocked,
    showUnlockModal,
    unlockedAchievementDetails,
    pendingDisplayAchievements,
    achievementProgress,
    loadAchievements,
    getAchievementById,
    isUnlocked,
    checkAchievements,
    markAsDisplayed,
    showUnlockNotification,
    closeUnlockModal,
    loadAchievementState,
    getAchievementState,
    getRarityColor,
    getRarityLabel,
    getRarityBgClass,
    getCurrentProgress,
  }
}
