<script setup lang="ts">
import { computed } from 'vue'
import type { Achievement } from '@/types'
import { useAchievements } from '@/composables/useAchievements'
import { useSavingStore } from '@/stores/saving'

const store = useSavingStore()
const { getRarityColor, getRarityLabel, getRarityBgClass } = useAchievements()

const achievement = computed(() => store.currentNotificationAchievement)
const show = computed(() => store.showAchievementNotification)

const rarityColor = computed(() => achievement.value ? getRarityColor(achievement.value.rarity) : '#9CA3AF')
const rarityLabel = computed(() => achievement.value ? getRarityLabel(achievement.value.rarity) : '')
const rarityBgClass = computed(() => achievement.value ? getRarityBgClass(achievement.value.rarity) : '')

function handleClose() {
  store.dismissAchievementNotification()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show && achievement"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        <div class="relative w-full max-w-sm animate-[achievementBounceIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)]">
          <div class="absolute inset-0 rounded-3xl animate-[achievementGlow_2s_ease-in-out_infinite]"
            :style="{ background: `radial-gradient(circle, ${rarityColor}40 0%, transparent 70%)` }"
          />

          <div class="relative bg-white rounded-3xl p-8 shadow-2xl text-center overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-2"
              :style="{ background: `linear-gradient(90deg, ${rarityColor}, ${rarityColor}80, ${rarityColor})` }"
            />

            <div class="absolute -top-4 -left-4 text-3xl animate-[sparkleFloat_1.5s_ease-in-out_infinite]">✨</div>
            <div class="absolute -top-2 -right-6 text-2xl animate-[sparkleFloat_1.5s_ease-in-out_infinite_0.2s]">⭐</div>
            <div class="absolute -bottom-2 -left-6 text-2xl animate-[sparkleFloat_1.5s_ease-in-out_infinite_0.4s]">🌟</div>
            <div class="absolute -bottom-4 -right-4 text-3xl animate-[sparkleFloat_1.5s_ease-in-out_infinite_0.6s]">✨</div>

            <div class="mb-4 text-sm text-warm-500 font-medium animate-[fadeInUp_0.5s_ease-out]">
              🎉 恭喜解锁新成就！
            </div>

            <div
              class="w-24 h-24 mx-auto mb-4 flex items-center justify-center rounded-full border-4 text-5xl animate-[achievementPopIn_0.8s_cubic-bezier(0.34,1.56,0.64,1)]"
              :class="rarityBgClass"
              :style="{ boxShadow: `0 0 40px ${rarityColor}60, inset 0 0 20px ${rarityColor}20` }"
            >
              {{ achievement.icon }}
            </div>

            <h2 class="text-2xl font-bold text-gray-800 mb-2 animate-[fadeInUp_0.6s_ease-out]">
              {{ achievement.name }}
            </h2>

            <div class="mb-4 animate-[fadeInUp_0.7s_ease-out]">
              <span
                class="inline-block px-3 py-1 rounded-full text-white text-sm font-medium"
                :style="{ backgroundColor: rarityColor }"
              >
                {{ rarityLabel }}
              </span>
            </div>

            <p class="text-gray-600 mb-6 animate-[fadeInUp_0.8s_ease-out]">
              {{ achievement.description }}
            </p>

            <div class="bg-warm-50 rounded-2xl p-4 mb-6 animate-[fadeInUp_0.9s_ease-out]">
              <div class="text-sm text-gray-500 mb-1">奖励</div>
              <div class="flex items-center justify-center gap-2">
                <span class="text-2xl">💰</span>
                <span class="text-2xl font-bold text-warm-500">+{{ achievement.pointsReward }}</span>
                <span class="text-gray-500">积分</span>
              </div>
            </div>

            <button
              class="w-full btn-primary text-lg py-3 animate-[fadeInUp_1s_ease-out]"
              @click="handleClose"
            >
              太棒了！
            </button>

            <div class="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              <div
                v-for="i in 20"
                :key="i"
                class="absolute w-2 h-2 rounded-full animate-[confetti_1.5s_ease-out_forwards]"
                :style="{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#FF9B7B', '#FFCB42', '#7CC49A', '#9C7DD4', '#FF6B6B'][i % 5],
                  animationDelay: `${Math.random() * 0.5}s`,
                  transform: `translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px)`,
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
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

@keyframes achievementPopIn {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  60% {
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes achievementGlow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sparkleFloat {
  0%, 100% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateY(-10px) scale(1.2);
  }
}

@keyframes confetti {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(var(--tx, 50px), var(--ty, 100px)) rotate(720deg);
  }
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
