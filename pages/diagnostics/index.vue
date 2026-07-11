<template>
  <div class="space-y-5">
    <p class="text-sm text-gray-500">おすすめ診断の実施履歴と利用状況を確認できます。</p>

    <!-- サマリー -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card">
        <p class="text-2xl font-bold text-gray-800">{{ results.length.toLocaleString() }}</p>
        <p class="text-sm text-gray-500 mt-1">総診断回数</p>
      </div>
      <div class="card">
        <p class="text-2xl font-bold text-emerald-500">{{ countByType.content }}</p>
        <p class="text-sm text-gray-500 mt-1">📄 情報案内</p>
      </div>
      <div class="card">
        <p class="text-2xl font-bold text-peach-500">{{ countByType.chat }}</p>
        <p class="text-sm text-gray-500 mt-1">💬 チャット相談</p>
      </div>
      <div class="card">
        <p class="text-2xl font-bold text-rose-500">{{ countByType.online }}</p>
        <p class="text-sm text-gray-500 mt-1">📞 オンライン相談</p>
      </div>
    </div>

    <!-- 履歴一覧 -->
    <div class="card p-0 overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="section-title mb-0">診断履歴</h2>
        <span class="text-xs text-gray-400">{{ results.length }}件</span>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-400 text-sm">読み込み中...</div>
      <div v-else-if="results.length === 0" class="p-10 text-center text-gray-400">
        <p class="text-3xl mb-2">🧭</p>
        <p class="text-sm">まだ診断の実施履歴がありません</p>
      </div>

      <div v-else class="divide-y divide-gray-50">
        <NuxtLink
          v-for="r in results"
          :key="r.id"
          :to="`/users/${r.userId}`"
          class="flex items-center gap-3 px-5 py-3 hover:bg-peach-50 transition-colors"
        >
          <img v-if="r.pictureUrl" :src="r.pictureUrl" class="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
          <div v-else class="w-9 h-9 bg-peach-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-peach-600 text-sm font-medium">{{ r.displayName?.charAt(0) ?? '?' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ r.displayName || '（名称未取得）' }}</p>
            <p class="text-xs text-gray-400">{{ formatDate(r.createdAt) }}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <span :class="['badge', typeBadge(r.result)]">{{ typeLabel(r.result) }}</span>
            <p class="text-xs text-gray-400 mt-1">スコア {{ r.score }}<span v-if="r.maxScore">/{{ r.maxScore }}</span></p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'
dayjs.locale('ja')

const { db } = useFirebase()
const loading = ref(true)
const results = ref<any[]>([])

const countByType = computed(() => ({
  content: results.value.filter(r => r.result === 'content').length,
  chat: results.value.filter(r => r.result === 'chat').length,
  online: results.value.filter(r => r.result === 'online').length,
}))

const typeLabel = (t: string) => ({
  content: '📄 情報案内',
  chat: '💬 チャット相談',
  online: '📞 オンライン相談',
}[t] ?? t)

const typeBadge = (t: string) => ({
  content: 'badge-green',
  chat: 'badge-peach',
  online: 'bg-rose-100 text-rose-600',
}[t] ?? 'badge-gray')

const formatDate = (ts: any) => {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return dayjs(date).format('YYYY/M/D HH:mm')
}

onMounted(() => {
  const q = query(collection(db, 'diagnosis_results'), orderBy('createdAt', 'desc'))
  onSnapshot(q, (snap) => {
    results.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  }, (err) => {
    console.error('診断履歴の取得に失敗:', err)
    loading.value = false
  })
})
</script>
