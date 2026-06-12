<template>
  <div class="space-y-6">
    <!-- KPIカード -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="kpi in kpiCards" :key="kpi.label" class="card">
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">{{ kpi.icon }}</span>
        </div>
        <p class="text-2xl font-bold text-gray-800">{{ kpi.value.toLocaleString() }}</p>
        <p class="text-sm text-gray-500 mt-1">{{ kpi.label }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 最近のユーザー -->
      <div class="lg:col-span-2 card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title mb-0">最近の登録ユーザー</h2>
          <NuxtLink to="/users" class="text-sm text-peach-500 hover:text-peach-600 font-medium">
            すべて見る →
          </NuxtLink>
        </div>
        <div v-if="loadingUsers" class="space-y-3">
          <div v-for="i in 5" :key="i" class="h-12 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div v-else-if="recentUsers.length === 0" class="text-center py-8 text-gray-400">
          <p class="text-3xl mb-2">👥</p>
          <p class="text-sm">まだユーザーがいません</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="user in recentUsers"
            :key="user.id"
            class="flex items-center gap-3 p-3 hover:bg-peach-50 rounded-xl transition-colors cursor-pointer"
            @click="$router.push(`/users/${user.id}`)"
          >
            <img
              v-if="user.pictureUrl"
              :src="user.pictureUrl"
              class="w-9 h-9 rounded-full object-cover"
              alt=""
            />
            <div v-else class="w-9 h-9 bg-peach-100 rounded-full flex items-center justify-center">
              <span class="text-peach-600 text-sm font-medium">{{ user.displayName?.charAt(0) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 truncate">{{ user.displayName }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(user.createdAt) }}</p>
            </div>
            <span :class="['badge', user.onboardingStatus === 'completed' ? 'badge-green' : 'badge-peach']">
              {{ user.onboardingStatus === 'completed' ? '登録完了' : '回答中' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 最近の配信 -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title mb-0">最近の配信</h2>
          <NuxtLink to="/broadcasts" class="text-sm text-peach-500 hover:text-peach-600 font-medium">
            すべて見る →
          </NuxtLink>
        </div>
        <div v-if="recentBroadcasts.length === 0" class="text-center py-8 text-gray-400">
          <p class="text-3xl mb-2">📢</p>
          <p class="text-sm">まだ配信がありません</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="broadcast in recentBroadcasts"
            :key="broadcast.id"
            class="p-3 bg-warm-50 rounded-xl"
          >
            <div class="flex items-center gap-2 mb-1">
              <span :class="statusBadgeClass(broadcast.status)">
                {{ statusLabel(broadcast.status) }}
              </span>
            </div>
            <p class="text-sm font-medium text-gray-800 truncate">{{ broadcast.title }}</p>
            <p class="text-xs text-gray-400 mt-1">
              {{ broadcast.stats?.sent ?? 0 }}人に配信 · {{ formatDate(broadcast.sentAt ?? broadcast.scheduledAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- クイックアクション -->
    <div class="card">
      <h2 class="section-title">クイックアクション</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.path"
          :to="action.path"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-peach-200 hover:bg-peach-50 transition-all"
        >
          <span class="text-3xl">{{ action.icon }}</span>
          <span class="text-sm font-medium text-gray-700">{{ action.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import dayjs from 'dayjs'
import 'dayjs/locale/ja'
dayjs.locale('ja')

const { db } = useFirebase()

const loadingUsers = ref(true)
const recentUsers = ref<any[]>([])
const recentBroadcasts = ref<any[]>([])
const kpiCards = ref([
  { label: '登録ユーザー数', value: 0, icon: '👥' },
  { label: '今月の配信数', value: 0, icon: '📢' },
  { label: 'オンボーディング完了', value: 0, icon: '✅' },
  { label: '今日のメッセージ', value: 0, icon: '💬' },
])

const quickActions = [
  { path: '/broadcasts/new', label: '配信を作成', icon: '📢' },
  { path: '/contents/new', label: 'コンテンツ追加', icon: '📝' },
  { path: '/segments', label: 'セグメント管理', icon: '🎯' },
  { path: '/settings/onboarding', label: 'オンボーディング設定', icon: '🔧' },
]

const formatDate = (ts: any) => {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return dayjs(date).format('M/D HH:mm')
}

const statusLabel = (status: string) => ({
  scheduled: '予定',
  sending: '送信中',
  done: '完了',
  failed: 'エラー',
}[status] ?? status)

const statusBadgeClass = (status: string) => ({
  scheduled: 'badge badge-blue',
  sending: 'badge badge-peach',
  done: 'badge badge-green',
  failed: 'badge bg-red-100 text-red-600',
}[status] ?? 'badge badge-gray')

onMounted(async () => {
  // 最近のユーザー
  const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(6))
  onSnapshot(usersQ, (snap) => {
    recentUsers.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loadingUsers.value = false
  })

  // 最近の配信
  const broadcastsQ = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(4))
  const broadcastsSnap = await getDocs(broadcastsQ)
  recentBroadcasts.value = broadcastsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  // KPI集計
  const monthStart = Timestamp.fromDate(dayjs().startOf('month').toDate())
  const todayStart = Timestamp.fromDate(dayjs().startOf('day').toDate())

  const results = await Promise.allSettled([
    // 登録ユーザー数
    getCountFromServer(collection(db, 'users')),
    // 今月の配信数（今月作成された配信のうち送信完了したもの）
    getDocs(query(collection(db, 'broadcasts'), where('createdAt', '>=', monthStart))),
    // オンボーディング完了
    getCountFromServer(query(collection(db, 'users'), where('onboardingStatus', '==', 'completed'))),
    // 今日のメッセージ（全会話の合計）
    getCountFromServer(query(collectionGroup(db, 'messages'), where('timestamp', '>=', todayStart))),
  ])

  if (results[0].status === 'fulfilled') kpiCards.value[0].value = results[0].value.data().count
  if (results[1].status === 'fulfilled') {
    kpiCards.value[1].value = results[1].value.docs.filter(d => d.data().status === 'done').length
  }
  if (results[2].status === 'fulfilled') kpiCards.value[2].value = results[2].value.data().count
  if (results[3].status === 'fulfilled') kpiCards.value[3].value = results[3].value.data().count
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`KPI集計失敗 [${i}]:`, r.reason)
  })
})
</script>
