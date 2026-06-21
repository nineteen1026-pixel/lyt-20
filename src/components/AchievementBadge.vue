<script setup lang="ts">
import { computed } from 'vue'
import type { Achievement } from '@/types'
import { useAchievements } from '@/composables/useAchievements'

const props = defineProps<{
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}>()

const emit = defineEmits<{
  click: [achievement: Achievement]
}>()

const { getRarityColor, getRarityLabel, getRarityBgClass, isUnlocked, getCurrentProgress } = useAchievements()

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  }
  return sizes[props.size || 'md']
})

const unlocked = computed(() => isUnlocked(props.achievement.id))
const progress = computed(() => getCurrentProgress(props.achievement.condition.type))
const progressPercent = computed(() => 
  Math.min(100, (progress.value / props.achievement.condition.target) * 100)
)

const rarityColor = computed(() => getRarityColor(props.achievement.rarity))
const rarityLabel = computed(() => getRarityLabel(props.achievement.rarity))
const rarityBgClass = computed(() => getRarityBgClass(props.achievement.rarity))

function handleClick() {
  emit('click', props.achievement)
}
</script>

<template>
  <div
    class="relative cursor-pointer group"
    @click="handleClick"
  >
    <div
      class="flex items-center justify-center rounded-full border-2 transition-all duration-300"
      :class="[
        sizeClasses,
        unlocked ? rarityBgClass : 'bg-gray-100 border-gray-300',
        unlocked ? 'hover:scale-110 hover:shadow-lg' : 'opacity-50 grayscale'
      ]"
      :style="unlocked ? { boxShadow: `0 0 20px ${rarityColor}40` } : {}"
    >
      <span class="select-none">{{ achievement.icon }}</span>
    </div>

    <div
      v-if="!unlocked && size !== 'sm'"
      class="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-full overflow-hidden"
    >
      <div
        class="h-full bg-warm-400 transition-all duration-500"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <div
      v-if="unlocked && size !== 'sm'"
      class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-xs"
    >
      ✓
    </div>

    <div
      v-if="showTooltip && size !== 'sm'"
      class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50"
    >
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xl">{{ achievement.icon }}</span>
        <span class="font-bold text-gray-800">{{ achievement.name }}</span>
      </div>
      <div class="text-xs mb-2">
        <span
          class="inline-block px-2 py-0.5 rounded-full text-white text-xs"
          :style="{ backgroundColor: rarityColor }"
        >
          {{ rarityLabel }}
        </span>
      </div>
      <p class="text-xs text-gray-600 mb-2">{{ achievement.description }}</p>
      <div v-if="!unlocked" class="text-xs">
        <div class="flex justify-between text-gray-500 mb-1">
          <span>进度</span>
          <span>{{ progress }} / {{ achievement.condition.target }}</span>
        </div>
        <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-warm-400 rounded-full"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
      <div v-else class="text-xs text-green-600 font-medium">
        🎉 已解锁
      </div>
    </div>
  </div>
</template>
