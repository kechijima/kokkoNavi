<template>
  <div class="min-h-screen bg-gradient-to-br from-peach-50 to-warm-100">
    <!-- ヘッダー -->
    <div class="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
      <div class="flex items-center gap-3 max-w-xl mx-auto">
        <div class="w-8 h-8 bg-gradient-to-br from-peach-400 to-peach-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span class="text-white text-sm font-bold">こ</span>
        </div>
        <div class="flex-1">
          <p class="font-bold text-gray-800 text-sm">こっこナビ</p>
          <p class="text-xs text-gray-400">支援情報を探す</p>
        </div>
      </div>
    </div>

    <div class="max-w-xl mx-auto px-4 py-5 space-y-4">
      <!-- 検索フォーム -->
      <div class="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <!-- キーワード -->
        <div class="flex gap-2">
          <input
            v-model="keyword"
            type="search"
            placeholder="キーワードで検索（例：保育、養育費…）"
            class="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-peach-300 transition-colors"
            @keydown.enter="doSearch"
          />
          <button
            @click="doSearch"
            class="bg-peach-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-peach-600 transition-colors"
          >
            検索
          </button>
        </div>

        <!-- 種別フィルタ -->
        <div>
          <p class="text-xs text-gray-500 mb-1.5">種別で絞り込む</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              @click="selectedCategory = ''"
              :class="['text-xs px-3 py-1.5 rounded-full border transition-colors', selectedCategory === '' ? 'bg-peach-500 text-white border-peach-500' : 'border-gray-200 text-gray-600 hover:border-peach-300']"
            >すべて</button>
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = selectedCategory === cat ? '' : cat"
              :class="['text-xs px-3 py-1.5 rounded-full border transition-colors', selectedCategory === cat ? 'bg-peach-500 text-white border-peach-500' : 'border-gray-200 text-gray-600 hover:border-peach-300']"
            >{{ cat }}</button>
          </div>
        </div>
      </div>

      <!-- 読み込み中 -->
      <div v-if="initialLoading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-28 bg-white rounded-2xl animate-pulse" />
      </div>

      <div v-else-if="!initialLoading && searched && results.length === 0" class="bg-white rounded-2xl p-8 text-center text-gray-400">
        <p class="text-3xl mb-2">🔍</p>
        <p class="text-sm">「{{ displayQuery }}」に一致するコンテンツが見つかりませんでした</p>
        <p class="text-xs mt-1">別のキーワードでお試しください</p>
      </div>

      <div v-else-if="!initialLoading && searched && results.length > 0" class="space-y-3">
        <p class="text-xs text-gray-500 px-1">
          <span v-if="displayQuery">「{{ displayQuery }}」の検索結果</span>
          <span v-else>{{ selectedCategory || 'すべての' }}コンテンツ</span>
          ：{{ results.length }}件
        </p>
        <NuxtLink
          v-for="item in results"
          :key="item.id"
          :to="`/p/${item.id}`"
          class="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <img
            v-if="item.imageUrl"
            :src="item.imageUrl"
            class="w-full h-32 object-cover"
            alt=""
          />
          <div class="p-4">
            <p class="text-xs text-peach-500 mb-1">📂 {{ item.category }}</p>
            <p class="text-sm font-bold text-gray-800 leading-snug">{{ item.title }}</p>
            <p class="text-xs text-gray-500 mt-1.5 line-clamp-2">{{ stripHtml(item.body) }}</p>
            <div v-if="item.tags?.length" class="flex flex-wrap gap-1 mt-2">
              <span v-for="tag in item.tags" :key="tag" class="text-xs bg-peach-50 text-peach-600 px-2 py-0.5 rounded-full">#{{ tag }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- デフォルト表示：閲覧数の多い順 -->
      <div v-else-if="!initialLoading && !searched" class="space-y-3">
        <p class="text-xs text-gray-500 px-1">👁 よく読まれているコンテンツ（{{ allContents.length }}件）</p>
        <NuxtLink
          v-for="item in popularContents"
          :key="item.id"
          :to="`/p/${item.id}`"
          class="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <img v-if="item.imageUrl" :src="item.imageUrl" class="w-full h-32 object-cover" alt="" />
          <div class="p-4">
            <div class="flex items-center justify-between mb-1">
              <p class="text-xs text-peach-500">📂 {{ item.category }}</p>
              <p v-if="item.views" class="text-xs text-gray-400">👁 {{ item.views }}回</p>
            </div>
            <p class="text-sm font-bold text-gray-800 leading-snug">{{ item.title }}</p>
            <p class="text-xs text-gray-500 mt-1.5 line-clamp-2">{{ stripHtml(item.body) }}</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'

definePageMeta({ layout: false, middleware: [] })

const route = useRoute()
const { db } = useFirebase()

const keyword = ref((route.query.q as string) ?? '')
const selectedCategory = ref((route.query.cat as string) ?? '')
const initialLoading = ref(true)
const searchLoading = ref(false)
const searched = ref(false)
const results = ref<any[]>([])
const allContents = ref<any[]>([])
const categories = ref<string[]>([])

// デフォルト表示：閲覧数の多い順
const popularContents = computed(() =>
  [...allContents.value].sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0))
)

const displayQuery = computed(() => {
  const parts = []
  if (keyword.value.trim()) parts.push(keyword.value.trim())
  if (selectedCategory.value) parts.push(selectedCategory.value)
  return parts.join(' × ')
})

const stripHtml = (html: string) => String(html ?? '').replace(/<[^>]*>/g, '')

const doSearch = () => {
  const kw = keyword.value.trim().toLowerCase()
  const cat = selectedCategory.value
  searched.value = true
  results.value = allContents.value.filter((item: any) => {
    if (cat && item.category !== cat) return false
    if (!kw) return true
    const title = String(item.title ?? '').toLowerCase()
    const body = stripHtml(item.body ?? '').toLowerCase()
    const category = String(item.category ?? '').toLowerCase()
    const tags: string[] = (item.tags ?? []).map((t: string) => t.toLowerCase())
    return title.includes(kw) || body.includes(kw) || category.includes(kw) || tags.some(t => t.includes(kw))
  })
}

// 種別変更で自動的に絞り込み
watch(selectedCategory, () => doSearch())

onMounted(async () => {
  try {
    // orderByなし（複合インデックス不要）で全公開コンテンツを取得
    const contentsSnap = await getDocs(
      query(collection(db, 'contents'), where('status', '==', 'published'))
    )
    allContents.value = contentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    // 種別一覧: categoriesコレクション → 失敗したらコンテンツから抽出
    try {
      const catSnap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')))
      if (!catSnap.empty) {
        categories.value = catSnap.docs.map(d => (d.data() as any).name as string)
      }
    } catch {}

    if (categories.value.length === 0) {
      const seen = new Set<string>()
      for (const item of allContents.value as any[]) {
        if (item.category && !seen.has(item.category)) {
          seen.add(item.category)
          categories.value.push(item.category as string)
        }
      }
    }

    // URLパラメータに検索語・種別があれば自動実行
    if (keyword.value || selectedCategory.value) doSearch()
  } finally {
    initialLoading.value = false
  }
})
</script>
