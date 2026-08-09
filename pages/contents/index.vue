<template>
  <div class="space-y-5">
    <!-- ヘッダーアクション -->
    <div class="flex items-center justify-between">
      <div class="flex gap-2">
        <button
          v-for="cat in ['すべて', ...categories]"
          :key="cat"
          @click="categoryFilter = cat === 'すべて' ? '' : cat"
          :class="[
            'px-4 py-2 rounded-xl text-sm font-medium transition-all',
            (cat === 'すべて' && !categoryFilter) || categoryFilter === cat
              ? 'bg-peach-500 text-white shadow-peach'
              : 'bg-white text-gray-600 hover:bg-peach-50 border border-gray-200'
          ]"
        >
          {{ cat }}
        </button>
      </div>
      <div class="flex gap-2">
        <button @click="showImport = true" class="btn-secondary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16V4m0 12l-4-4m4 4l4-4M4 20h16" />
          </svg>
          CSVインポート
        </button>
        <NuxtLink to="/contents/new" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          コンテンツを追加
        </NuxtLink>
      </div>
    </div>

    <!-- コンテンツグリッド -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-48 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <div v-else-if="filteredContents.length === 0" class="card text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">📝</p>
      <p class="text-sm">コンテンツがありません</p>
      <NuxtLink to="/contents/new" class="btn-primary mt-4 inline-flex">追加する</NuxtLink>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="content in filteredContents"
        :key="content.id"
        class="card-hover group"
        @click="$router.push(`/contents/${content.id}`)"
      >
        <!-- サムネイル -->
        <div class="h-32 bg-gradient-to-br from-peach-100 to-warm-100 rounded-xl mb-4 overflow-hidden">
          <img v-if="content.imageUrl" :src="content.imageUrl" class="w-full h-full object-cover" alt="" />
          <div v-else class="w-full h-full flex items-center justify-center text-4xl">
            {{ categoryIcon(content.category) }}
          </div>
        </div>

        <div class="flex items-center gap-2 mb-2">
          <span class="badge badge-peach">{{ content.category }}</span>
          <span :class="content.status === 'published' ? 'badge-green' : 'badge-gray'" class="badge">
            {{ content.status === 'published' ? '公開中' : '下書き' }}
          </span>
        </div>

        <h3 class="font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-peach-600 transition-colors">
          {{ content.title }}
        </h3>
        <p class="text-sm text-gray-500 line-clamp-2">{{ stripHtml(content.body) }}</p>

        <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <p class="text-xs text-gray-400">{{ formatDate(content.updatedAt) }}</p>
          <div class="flex gap-1" @click.stop>
            <NuxtLink :to="`/contents/${content.id}`" class="btn-ghost text-xs px-2 py-1">編集</NuxtLink>
            <button @click="deleteContent(content.id)" class="btn-ghost text-xs px-2 py-1 text-red-400 hover:text-red-500 hover:bg-red-50">
              削除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CSVインポートモーダル -->
    <div v-if="showImport" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" @click.self="closeImport">
      <div class="card w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h3 class="section-title">CSVからコンテンツをインポート</h3>

        <div v-if="!importResult" class="space-y-4">
          <p class="text-sm text-gray-500">
            列: タイトル, カテゴリ, 企業名, 所在地, URL, 支援内容, 備考 のCSVファイルを選択してください。
            本文は「企業名・所在地・URL・支援内容」の形式で自動生成されます。
          </p>

          <div>
            <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="onFileSelected" />
            <button type="button" @click="fileInput?.click()" class="btn-secondary w-full">
              📄 CSVファイルを選択
            </button>
            <p v-if="importFileName" class="text-xs text-gray-500 mt-2">選択中: {{ importFileName }}（{{ importRows.length }}件）</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">インポート先ステータス</label>
            <select v-model="importStatus" class="input">
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>

          <!-- プレビュー -->
          <div v-if="importRows.length" class="border border-gray-100 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-warm-50">
            <p class="text-xs font-medium text-gray-500 mb-1">プレビュー（先頭{{ Math.min(3, importRows.length) }}件）</p>
            <div v-for="(row, i) in importRows.slice(0, 3)" :key="i" class="text-xs bg-white rounded-lg p-2 border border-gray-100">
              <p class="font-medium text-gray-800">{{ row.タイトル }}</p>
              <p class="text-gray-500">{{ row.カテゴリ }}</p>
            </div>
          </div>

          <div class="flex gap-3 pt-2 border-t border-gray-100">
            <button @click="runImport" class="btn-primary" :disabled="!importRows.length || importing">
              {{ importing ? `インポート中... (${importProgress}/${importRows.length})` : `${importRows.length}件をインポート` }}
            </button>
            <button @click="closeImport" class="btn-secondary">キャンセル</button>
          </div>
        </div>

        <!-- 結果表示 -->
        <div v-else class="space-y-4 text-center py-6">
          <p class="text-4xl">✅</p>
          <p class="text-lg font-semibold text-gray-800">{{ importResult.success }}件のコンテンツを作成しました</p>
          <p v-if="importResult.failed > 0" class="text-sm text-red-500">{{ importResult.failed }}件の取り込みに失敗しました</p>
          <button @click="closeImport" class="btn-primary">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import dayjs from 'dayjs'

const { db } = useFirebase()

const loading = ref(true)
const contents = ref<any[]>([])
const categoryFilter = ref('')
const categories = ref<string[]>([])

const filteredContents = computed(() => {
  if (!categoryFilter.value) return contents.value
  return contents.value.filter(c => c.category === categoryFilter.value)
})

const categoryIcon = (cat: string) => ({
  '子育て支援': '👶',
  '住居支援': '🏠',
  '就労支援': '💼',
  '経済支援': '💰',
  '法律・権利': '⚖️',
  'その他': '📋',
}[cat] ?? '📝')

const stripHtml = (html: string) => String(html ?? '').replace(/<[^>]*>/g, '')

const formatDate = (ts: any) => {
  if (!ts) return '-'
  return dayjs(ts.toDate?.() ?? ts).format('YYYY/M/D')
}

const deleteContent = async (id: string) => {
  if (!confirm('このコンテンツを削除しますか？')) return
  await deleteDoc(doc(db, 'contents', id))
}

// ─── CSVインポート ────────────────────────────────

const showImport = ref(false)
const fileInput = ref<HTMLInputElement>()
const importFileName = ref('')
const importRows = ref<Record<string, string>[]>([])
const importStatus = ref<'draft' | 'published'>('draft')
const importing = ref(false)
const importProgress = ref(0)
const importResult = ref<{ success: number; failed: number } | null>(null)

// RFC4180準拠の簡易CSVパーサー（クォート内の改行・カンマ・""エスケープに対応）
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  const src = text.replace(/^﻿/, '') // 先頭のBOMを除去

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else { inQuotes = false }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += ch
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  const filtered = rows.filter(r => r.some(c => c.trim() !== ''))
  if (filtered.length === 0) return []
  const header = filtered[0].map(h => h.trim())
  return filtered.slice(1).map(r => {
    const obj: Record<string, string> = {}
    header.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
}

// CSVの1行から本文（企業名・所在地・URL・支援内容の形式）を生成
function buildBodyFromRow(row: Record<string, string>): string {
  const parts: string[] = []
  if (row['企業名']) parts.push(`〇企業名\n${row['企業名']}`)
  if (row['所在地']) parts.push(`〇所在地\n${row['所在地']}`)
  if (row['URL']) parts.push(`〇URL\n${row['URL']}`)
  if (row['支援内容']) parts.push(`〇支援内容\n${row['支援内容']}`)
  return parts.join('\n\n')
}

const onFileSelected = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importFileName.value = file.name
  const text = await file.text()
  importRows.value = parseCsv(text)
}

const runImport = async () => {
  if (!importRows.value.length) return
  importing.value = true
  importProgress.value = 0
  let success = 0
  let failed = 0

  for (const row of importRows.value) {
    try {
      const title = row['タイトル']?.trim()
      if (!title) { failed++; importProgress.value++; continue }

      const docRef = await addDoc(collection(db, 'contents'), {
        title,
        category: row['カテゴリ']?.trim() || 'その他',
        body: buildBodyFromRow(row),
        status: importStatus.value,
        linkUrl: '__pending__',
        imageUrl: '',
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      // 公開URLを自動生成して設定（コンテンツ編集画面の保存処理と同じ規則）
      await updateDoc(doc(db, 'contents', docRef.id), { linkUrl: `https://kokkonavi.web.app/p/${docRef.id}` })
      success++
    } catch (e) {
      console.error('インポート失敗:', e)
      failed++
    }
    importProgress.value++
  }

  importing.value = false
  importResult.value = { success, failed }
}

const closeImport = () => {
  showImport.value = false
  importFileName.value = ''
  importRows.value = []
  importResult.value = null
  importProgress.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

onMounted(() => {
  const q = query(collection(db, 'contents'), orderBy('updatedAt', 'desc'))
  onSnapshot(q, (snap) => {
    contents.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    loading.value = false
  })

  // 種別管理（categories）の内容をタブに反映（リアルタイム同期）
  const catQ = query(collection(db, 'categories'), orderBy('order', 'asc'))
  onSnapshot(catQ, (snap) => {
    categories.value = snap.empty
      ? ['子育て支援', '住居支援', '就労支援', '経済支援', '法律・権利', 'その他']
      : snap.docs.map(d => (d.data() as any).name as string)
  })
})
</script>
