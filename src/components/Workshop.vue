<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Sparkles, Check, Download, Upload, Settings } from 'lucide-vue-next'
import { useSavingStore } from '@/stores/saving'
import { useDecorations } from '@/composables/useDecorations'
import { exportToJson, importFromJson } from '@/utils/export'
import type { DecorationType, Decoration } from '@/types'

const store = useSavingStore()
const { allDecorations, loadDecorations, getDecorationById } = useDecorations()

const activeCategory = ref<DecorationType>('wallpaper')
const showSettings = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const categories = [
  { key: 'wallpaper' as DecorationType, label: '墙纸', emoji: '🎨' },
  { key: 'floor' as DecorationType, label: '地板', emoji: '🪵' },
  { key: 'item' as DecorationType, label: '摆件', emoji: '🪴' },
]

const filteredDecorations = computed(() => {
  return allDecorations.value.filter(d => d.type === activeCategory.value)
})

const isOwned = (id: string) => store.ownedDecorations.includes(id)

const isActiveItem = (id: string) => {
  const active = store.activeDecorations
  if (active.wallpaper === id) return true
  if (active.floor === id) return true
  if (active.items.includes(id)) return true
  return false
}

function handleBuy(decoration: Decoration) {
  if (isOwned(decoration.id)) {
    applyDecoration(decoration)
    return
  }
  if (store.points < decoration.price) {
    alert('积分不足，再多存一点吧～')
    return
  }
  if (confirm(`确定花费 ${decoration.price} 积分购买「${decoration.name}」吗？`)) {
    store.buyDecoration(decoration)
  }
}

function applyDecoration(decoration: Decoration) {
  if (decoration.type === 'wallpaper') {
    store.setActiveWallpaper(decoration.id)
  } else if (decoration.type === 'floor') {
    store.setActiveFloor(decoration.id)
  } else if (decoration.type === 'item') {
    store.toggleDecorationItem(decoration.id)
  }
}

function handleExport() {
  exportToJson(store.getExportState())
}

function handleImportClick() {
  fileInputRef.value?.click()
}

async function handleImportFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const data = await importFromJson(file)
    const success = store.importData(data)
    if (success) {
      alert('数据导入成功！')
    } else {
      alert('数据格式不正确，请检查文件。')
    }
  } catch (err) {
    alert('导入失败：' + (err as Error).message)
  }

  target.value = ''
}

onMounted(() => {
  loadDecorations()
})
</script>

<template>
  <div class="px-4 pb-[100px]">
    <div class="flex items-center gap-2 mb-3 px-1">
      <div class="bg-warm-50 rounded-xl px-3 py-1.5 text-xs font-semibold text-warm-600 flex items-center gap-1.5">
        <span>{{ store.currentRoom.emoji }}</span>
        <span>{{ store.currentRoom.name }}</span>
        <span class="text-warm-400">·</span>
        <span class="text-warm-400">当前房间</span>
      </div>
    </div>

    <div class="flex items-stretch gap-3 mb-4">
      <div class="flex-1 bg-gradient-to-br from-warm-500 to-warm-600 rounded-[20px] p-4.5 text-white relative overflow-hidden">
        <div class="absolute -top-5 -right-5 w-20 h-20 bg-white/15 rounded-full"></div>
        <div class="absolute -bottom-7.5 left-[30%] w-15 h-15 bg-white/10 rounded-full"></div>
        <div class="text-sm opacity-90 mb-1 font-medium">我的积分</div>
        <div class="flex items-center gap-1.5 text-[28px] font-extrabold leading-tight">
          <Sparkles class="opacity-90" :size="20" />
          {{ store.points.toFixed(0) }}
        </div>
        <div class="text-xs opacity-80 mt-1">储蓄积分 = 累计收入</div>
      </div>

      <button
        class="w-12 h-12 bg-white rounded-2xl text-gray-500 flex items-center justify-center shadow-softer transition-all duration-200 hover:text-warm-500 hover:rotate-[15deg]"
        @click="showSettings = !showSettings"
      >
        <Settings :size="20" />
      </button>
    </div>

    <div
      v-if="showSettings"
      class="bg-white rounded-2xl p-4 mb-4 shadow-softer animate-[slideDown_0.3s_ease]"
    >
      <h4 class="text-sm font-bold text-gray-700 mb-3">数据管理</h4>
      <div class="flex gap-2.5">
        <button
          class="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-mint-500/12 text-mint-500 hover:bg-mint-500/20"
          @click="handleExport"
        >
          <Download :size="18" />
          <span>导出备份</span>
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 bg-lavender-500/12 text-lavender-500 hover:bg-lavender-500/20"
          @click="handleImportClick"
        >
          <Upload :size="18" />
          <span>导入备份</span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleImportFile"
        />
      </div>
      <p class="text-xs text-gray-400 mt-2.5 text-center">
        导出 JSON 文件保存到本地，换设备也能继续使用～
      </p>
    </div>

    <div class="flex gap-2 mb-4 bg-white p-1 rounded-xl shadow-softer">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold text-gray-500 transition-all duration-200"
        :class="{ 'bg-warm-50 text-warm-500 shadow-sm': activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        <span class="text-base">{{ cat.emoji }}</span>
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2.5 mb-4">
      <div
        v-for="item in filteredDecorations"
        :key="item.id"
        class="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-250 shadow-softer border-2 border-transparent hover:translate-y-[-2px] hover:shadow-soft"
        :class="{
          'border-mint-500/30': isOwned(item.id),
          'border-warm-500 shadow-pop': isActiveItem(item.id),
          'animate-[decoUnlock_0.8s_ease-out]': store.recentlyUpdatedDecoration === item.id,
        }"
        @click="handleBuy(item)"
      >
        <div class="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
          <template v-if="item.type === 'wallpaper'">
            <div
              class="w-full h-full"
              :style="{ background: item.style.gradient || item.style.backgroundColor }"
            ></div>
          </template>
          <template v-else-if="item.type === 'floor'">
            <div
              class="w-full h-full"
              :style="{ backgroundColor: item.style.backgroundColor }"
            ></div>
          </template>
          <template v-else>
            <div
              class="text-4xl"
              :class="{ 'animate-[decoPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)]': store.recentlyUpdatedDecoration === item.id }"
              style="filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));"
            >{{ item.emoji }}</div>
          </template>
          <div
            v-if="store.recentlyUpdatedDecoration === item.id"
            class="absolute inset-0 pointer-events-none"
          >
            <div class="absolute top-2 left-2 text-xl animate-[sparkle_0.8s_ease-out]">✨</div>
            <div class="absolute top-3 right-2 text-lg animate-[sparkle_0.8s_ease-out_0.1s]">✨</div>
            <div class="absolute bottom-2 left-3 text-xl animate-[sparkle_0.8s_ease-out_0.2s]">✨</div>
          </div>
        </div>

        <div class="p-2.5 text-center">
          <div class="text-xs font-semibold text-gray-700 mb-1 truncate">{{ item.name }}</div>
          <div class="text-xs">
            <template v-if="isOwned(item.id)">
              <span v-if="isActiveItem(item.id)" class="inline-flex items-center gap-0.5 text-warm-500 font-semibold">
                <Check :size="12" />
                使用中
              </span>
              <span v-else class="text-mint-500 font-semibold">已拥有</span>
            </template>
            <template v-else>
              <span class="inline-flex items-center gap-0.5 text-warm-500 font-bold">
                <Sparkles :size="12" />
                {{ item.price }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center text-xs text-gray-400 px-4 py-2 bg-warm-500/8 rounded-xl">
      💡 提示：装饰将添加到当前房间「{{ store.currentRoom.emoji }} {{ store.currentRoom.name }}」，记录收入可获得等额积分～
    </div>
  </div>
</template>

<style>
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sparkle {
  0% {
    opacity: 0;
    transform: translateY(5px) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translateY(-5px) scale(1.3);
  }
  100% {
    opacity: 0;
    transform: translateY(-15px) scale(0.8);
  }
}

@keyframes decoUnlock {
  0% {
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
  50% {
    transform: scale(1.08);
    box-shadow: 0 0 30px rgba(255, 155, 123, 0.5);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(255, 155, 123, 0.2);
  }
}

@keyframes decoPop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
