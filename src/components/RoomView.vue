<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useSavingStore } from '@/stores/saving'
import { useDecorations } from '@/composables/useDecorations'
import { useAchievements } from '@/composables/useAchievements'
import AchievementBadge from './AchievementBadge.vue'
import AchievementUnlockModal from './AchievementUnlockModal.vue'
import type { Achievement } from '@/types'

const store = useSavingStore()
const { getDecorationById } = useDecorations()
const achievements = useAchievements()

const showAchievementPanel = ref(false)
const selectedAchievement = ref<Achievement | null>(null)

onMounted(async () => {
  await achievements.loadAchievements()
  store.checkAndTriggerAchievements()
})

const recentUnlockedAchievements = computed(() => {
  return achievements.unlockedAchievementDetails.value
    .slice(-5)
    .reverse()
})

const sortedAchievements = computed(() => {
  return achievements.achievementProgress.value
    .slice()
    .sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1
      if (!a.isUnlocked && b.isUnlocked) return 1
      if (a.isUnlocked && b.isUnlocked) return 0
      return b.progress - a.progress
    })
})

const totalAchievements = computed(() => achievements.allAchievements.value.length)
const unlockedCount = computed(() => achievements.unlockedAchievements.value.length)

function toggleAchievementPanel() {
  showAchievementPanel.value = !showAchievementPanel.value
}

function handleBadgeClick(achievement: Achievement) {
  selectedAchievement.value = achievement
}

function closeAchievementDetail() {
  selectedAchievement.value = null
}

const activeWallpaper = computed(() => {
  const id = store.activeDecorations.wallpaper
  return id ? getDecorationById(id) : null
})

const activeFloor = computed(() => {
  const id = store.activeDecorations.floor
  return id ? getDecorationById(id) : null
})

const activeItems = computed(() => {
  return store.activeDecorations.items
    .map((id) => getDecorationById(id))
    .filter((d) => d && d.type === 'item')
})

const wallpaperStyle = computed(() => {
  const wp = activeWallpaper.value
  if (!wp) return { backgroundColor: '#FFF8F0' }

  const style: Record<string, string> = {}
  if (wp.style.gradient) {
    style.background = wp.style.gradient
  } else if (wp.style.backgroundColor) {
    style.backgroundColor = wp.style.backgroundColor
  }
  if (wp.style.pattern) {
    style.backgroundImage = getPatternImage(wp.style.pattern)
    style.backgroundSize = getPatternSize(wp.style.pattern)
  }
  return style
})

const floorStyle = computed(() => {
  const fl = activeFloor.value
  if (!fl) return { backgroundColor: '#E8D5B7' }

  const style: Record<string, string> = {}
  if (fl.style.backgroundColor) {
    style.backgroundColor = fl.style.backgroundColor
  }
  if (fl.style.pattern) {
    style.backgroundImage = getPatternImage(fl.style.pattern)
    style.backgroundSize = getPatternSize(fl.style.pattern)
  }
  return style
})

function isRecentlyUpdated(id: string): boolean {
  return store.recentlyUpdatedDecoration === id
}

function getPatternImage(pattern: string): string {
  const patterns: Record<string, string> = {
    'stripe-pink': 'repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(255,155,123,0.15) 28px, rgba(255,155,123,0.15) 30px)',
    'dots-mint': 'radial-gradient(circle, rgba(124,196,154,0.3) 3px, transparent 3px)',
    'flower-soft': 'radial-gradient(circle at 20% 30%, rgba(255,182,193,0.4) 8px, transparent 8px), radial-gradient(circle at 70% 60%, rgba(255,218,185,0.4) 6px, transparent 6px), radial-gradient(circle at 40% 80%, rgba(221,208,239,0.4) 7px, transparent 7px)',
    'cloud-sky': 'radial-gradient(ellipse 40px 20px at 20% 25%, rgba(255,255,255,0.8) 0%, transparent 70%), radial-gradient(ellipse 50px 25px at 70% 45%, rgba(255,255,255,0.7) 0%, transparent 70%), radial-gradient(ellipse 35px 18px at 50% 70%, rgba(255,255,255,0.6) 0%, transparent 70%)',
    'wood-light': 'repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(139,119,101,0.15) 48px, rgba(139,119,101,0.15) 50px), linear-gradient(180deg, rgba(0,0,0,0.03) 0%, transparent 10%)',
    'wood-warm': 'repeating-linear-gradient(90deg, transparent, transparent 45px, rgba(100,70,40,0.2) 45px, rgba(100,70,40,0.2) 47px), linear-gradient(180deg, rgba(0,0,0,0.04) 0%, transparent 8%)',
    'tile-white': 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
    'rug-cozy': 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%), repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 16px)',
    'marble': 'linear-gradient(135deg, rgba(200,200,200,0.1) 25%, transparent 25%), linear-gradient(225deg, rgba(200,200,200,0.1) 25%, transparent 25%), linear-gradient(45deg, rgba(200,200,200,0.08) 25%, transparent 25%), linear-gradient(315deg, rgba(200,200,200,0.08) 25%, transparent 25%)',
  }
  return patterns[pattern] || ''
}

function getPatternSize(pattern: string): string {
  const sizes: Record<string, string> = {
    'stripe-pink': 'auto',
    'dots-mint': '20px 20px',
    'flower-soft': '120px 120px',
    'cloud-sky': '180px 180px',
    'wood-light': 'auto',
    'wood-warm': 'auto',
    'tile-white': '40px 40px',
    'rug-cozy': 'auto',
    'marble': '30px 30px',
  }
  return sizes[pattern] || 'auto'
}
</script>

<template>
  <div class="w-full flex justify-center p-4">
    <div class="w-full max-w-[380px]">
      <div
        class="aspect-[4/3] rounded-[24px] overflow-hidden flex flex-col relative transition-all duration-500"
        :class="{ 'animate-[roomGlow_2s_ease-in-out_infinite]': store.recentlyUpdatedDecoration }"
        style="box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5);"
      >
      <div
        class="flex-[0_0_65%] relative overflow-hidden transition-all duration-700 ease-out"
        :class="{ 'animate-[wallChange_1s_ease-out]': store.recentlyUpdatedDecoration === activeWallpaper?.id }"
        :style="wallpaperStyle"
      >
        <div class="absolute bottom-0 left-0 right-0 h-[30px] bg-gradient-to-b from-transparent to-black/[0.06] pointer-events-none"></div>
        <div
          v-for="item in activeItems.filter(i => (i?.position?.y ?? 100) < 55)"
          :key="item!.id"
          class="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center leading-none transition-all duration-500"
          :class="{
            'animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]': true,
            'animate-[itemHighlight_1.5s_ease-in-out_infinite]': isRecentlyUpdated(item!.id),
          }"
          :style="{
            left: `${item?.position?.x}%`,
            top: `${item?.position?.y}%`,
            width: `${item?.size?.width}px`,
            height: `${item?.size?.height}px`,
            fontSize: `${Math.min(item?.size?.width || 40, item?.size?.height || 40) * 0.85}px`,
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
          }"
        >
          {{ item?.emoji }}
        </div>
      </div>

      <div
        class="flex-1 relative overflow-hidden transition-all duration-700 ease-out"
        :class="{ 'animate-[floorChange_1s_ease-out]': store.recentlyUpdatedDecoration === activeFloor?.id }"
        :style="floorStyle"
      >
        <div class="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-black/[0.08] to-transparent pointer-events-none"></div>
        <div
          v-for="item in activeItems.filter(i => (i?.position?.y ?? 0) >= 55)"
          :key="item!.id"
          class="absolute transform -translate-x-1/2 flex items-center justify-center leading-none transition-all duration-500"
          :class="{
            'animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)]': true,
            'animate-[itemHighlight_1.5s_ease-in-out_infinite]': isRecentlyUpdated(item!.id),
          }"
          :style="{
            left: `${item?.position?.x}%`,
            top: `${((item?.position?.y ?? 55) - 55) * 2.2}%`,
            width: `${item?.size?.width}px`,
            height: `${item?.size?.height}px`,
            fontSize: `${Math.min(item?.size?.width || 40, item?.size?.height || 40) * 0.85}px`,
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))',
          }"
        >
          {{ item?.emoji }}
        </div>
      </div>

      <div v-if="store.recentlyUpdatedDecoration" class="absolute inset-0 pointer-events-none animate-[sparkle_1s_ease-out]">
        <div class="absolute top-1/4 left-1/4 text-2xl animate-[sparkleFloat_1s_ease-out_forwards]">✨</div>
        <div class="absolute top-1/3 right-1/3 text-xl animate-[sparkleFloat_1s_ease-out_0.1s_forwards]">✨</div>
        <div class="absolute bottom-1/3 left-1/3 text-2xl animate-[sparkleFloat_1s_ease-out_0.2s_forwards]">✨</div>
        <div class="absolute top-1/2 right-1/4 text-xl animate-[sparkleFloat_1s_ease-out_0.15s_forwards]">✨</div>
      </div>
    </div>

    <div class="mt-4">
      <div
        class="bg-white rounded-2xl shadow-soft p-4 cursor-pointer hover:shadow-md transition-all duration-300"
        @click="toggleAchievementPanel"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">🏆</span>
            <span class="font-bold text-gray-800">成就勋章</span>
            <span class="text-sm text-gray-500">{{ unlockedCount }}/{{ totalAchievements }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="text-sm transition-transform duration-300"
              :class="{ 'rotate-180': showAchievementPanel }"
            >
              ▼
            </span>
          </div>
        </div>

        <div class="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div
            class="h-full bg-gradient-to-r from-warm-400 to-warm-500 rounded-full transition-all duration-700 ease-out"
            :style="{ width: `${totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0}%` }"
          />
        </div>

        <div v-if="recentUnlockedAchievements.length > 0" class="flex gap-2">
          <div
            v-for="item in recentUnlockedAchievements"
            :key="item.id"
            class="relative animate-[badgeFloat_2s_ease-in-out_infinite]"
            :style="{ animationDelay: `${Math.random() * 0.5}s` }"
          >
            <AchievementBadge
              :achievement="item"
              size="sm"
              @click.stop="handleBadgeClick(item)"
            />
          </div>
          <div
            v-if="recentUnlockedAchievements.length > 0"
            class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm"
          >
            +{{ unlockedCount - recentUnlockedAchievements.length }}
          </div>
        </div>
        <div v-else class="text-center text-gray-400 text-sm py-2">
          开始记账，解锁你的第一枚勋章吧！
        </div>
      </div>

      <Transition name="slide">
        <div v-if="showAchievementPanel" class="mt-4 bg-white rounded-2xl shadow-soft p-4">
          <div class="grid grid-cols-5 gap-3">
            <div
              v-for="item in sortedAchievements"
              :key="item.achievement.id"
              class="relative"
            >
              <AchievementBadge
                :achievement="item.achievement"
                size="md"
                :show-tooltip="true"
                @click="handleBadgeClick(item.achievement)"
              />
              <div
                v-if="item.isUnlocked"
                class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-xs"
              >
                ✓
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <AchievementUnlockModal />

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedAchievement"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closeAchievementDetail"
        >
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div class="relative bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-[achievementBounceIn_0.4s_ease-out]">
            <button
              class="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              @click="closeAchievementDetail"
            >
              ✕
            </button>

            <div class="text-center">
              <div
                class="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full border-4 text-4xl"
                :class="achievements.getRarityBgClass(selectedAchievement.rarity)"
                :style="{ boxShadow: `0 0 30px ${achievements.getRarityColor(selectedAchievement.rarity)}40` }"
              >
                {{ selectedAchievement.icon }}
              </div>

              <h3 class="text-xl font-bold text-gray-800 mb-2">{{ selectedAchievement.name }}</h3>
              <div class="mb-3">
                <span
                  class="inline-block px-3 py-1 rounded-full text-white text-sm"
                  :style="{ backgroundColor: achievements.getRarityColor(selectedAchievement.rarity) }"
                >
                  {{ achievements.getRarityLabel(selectedAchievement.rarity) }}
                </span>
              </div>
              <p class="text-gray-600 mb-4">{{ selectedAchievement.description }}</p>

              <div
                v-if="achievements.isUnlocked(selectedAchievement.id)"
                class="bg-green-50 rounded-xl p-3 mb-4"
              >
                <div class="text-green-600 font-medium">🎉 已解锁</div>
                <div class="text-sm text-green-500">奖励 +{{ selectedAchievement.pointsReward }} 积分</div>
              </div>

              <div v-else class="bg-warm-50 rounded-xl p-3 mb-4">
                <div class="flex justify-between text-sm mb-2">
                  <span class="text-gray-600">完成进度</span>
                  <span class="text-warm-600 font-medium">
                    {{ achievements.getCurrentProgress(selectedAchievement.condition.type) }} / {{ selectedAchievement.condition.target }}
                  </span>
                </div>
                <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-warm-400 rounded-full transition-all duration-500"
                    :style="{ width: `${Math.min(100, (achievements.getCurrentProgress(selectedAchievement.condition.type) / selectedAchievement.condition.target) * 100)}%` }"
                  />
                </div>
              </div>

              <button
                class="w-full btn-primary"
                @click="closeAchievementDetail"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    </div>
  </div>
</template>

<style>
@keyframes popIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-50%) scale(0.5);
  }
  60% {
    transform: translateX(-50%) translateY(-50%) scale(1.15);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(-50%) scale(1);
  }
}

@keyframes itemHighlight {
  0%, 100% {
    transform: translateX(-50%) translateY(-50%) scale(1);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }
  50% {
    transform: translateX(-50%) translateY(-50%) scale(1.15);
    filter: drop-shadow(0 4px 12px rgba(255, 155, 123, 0.5));
  }
}

@keyframes roomGlow {
  0%, 100% {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }
  50% {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 155, 123, 0.3);
  }
}

@keyframes wallChange {
  0% {
    opacity: 0.3;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes floorChange {
  0% {
    opacity: 0.3;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes sparkle {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes sparkleFloat {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }
}

@keyframes badgeFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes achievementBounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.8);
}
</style>
