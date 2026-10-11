<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <div class="card bg-peach-50 border border-peach-200">
      <div class="flex items-start gap-3">
        <span class="text-2xl">🧭</span>
        <div>
          <p class="font-semibold text-peach-800">おすすめ診断について</p>
          <p class="text-sm text-peach-700 mt-1">
            「今の状況がわからない」「何を相談すればいいかわからない」方向けに、いくつかの質問に答えてもらい、
            回答の点数を集計して重要度に応じて誘導する診断を複数登録できます。
            LINEで「診断」を選ぶと、ここで「有効」にした診断が一覧表示されます。
          </p>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800">診断一覧</h2>
      <NuxtLink to="/settings/diagnosis/new" class="btn-primary">＋ 診断を追加</NuxtLink>
    </div>

    <div v-if="loading" class="card text-center py-16 text-gray-400">読み込み中...</div>

    <div v-else-if="flows.length === 0" class="card text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">🧭</p>
      <p class="text-sm">診断がまだありません。「＋ 診断を追加」から作成してください。</p>
    </div>

    <div v-else class="card divide-y divide-gray-100">
      <div
        v-for="(f, index) in flows"
        :key="f.id"
        class="flex items-center gap-3 py-3"
      >
        <div class="flex flex-col flex-shrink-0">
          <button
            @click="move(index, -1)"
            :disabled="index === 0 || reordering"
            class="text-xs px-1.5 py-0.5 rounded text-gray-400 hover:text-peach-600 hover:bg-peach-50 disabled:opacity-25 disabled:hover:bg-transparent"
            title="上へ"
          >▲</button>
          <button
            @click="move(index, 1)"
            :disabled="index === flows.length - 1 || reordering"
            class="text-xs px-1.5 py-0.5 rounded text-gray-400 hover:text-peach-600 hover:bg-peach-50 disabled:opacity-25 disabled:hover:bg-transparent"
            title="下へ"
          >▼</button>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-gray-800 truncate">{{ f.title || '（タイトル未設定）' }}</p>
            <span :class="['badge text-xs flex-shrink-0', f.isActive ? 'badge-green' : 'badge-gray']">
              {{ f.isActive ? '有効' : '無効' }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5 truncate">{{ f.description || '説明未設定' }}</p>
          <p class="text-xs text-gray-400 mt-0.5">質問 {{ f.questions?.length ?? 0 }}問</p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <div
              class="relative w-9 h-5 rounded-full transition-colors duration-200"
              :class="f.isActive ? 'bg-peach-500' : 'bg-gray-200'"
              @click="toggleActive(f)"
            >
              <div
                class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                :class="f.isActive ? 'left-4' : 'left-0.5'"
              />
            </div>
          </label>
          <NuxtLink :to="`/settings/diagnosis/${f.id}`" class="btn-ghost text-xs px-2 py-1 text-gray-500 hover:text-gray-700">
            編集
          </NuxtLink>
          <button @click="deleteFlow(f.id)" class="btn-ghost text-xs px-2 py-1 text-red-400 hover:text-red-500 hover:bg-red-50">
            削除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, onSnapshot, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore'

const { db } = useFirebase()

const flows = ref<any[]>([])
const loading = ref(true)
const reordering = ref(false)

const toggleActive = async (f: any) => {
  await updateDoc(doc(db, 'diagnosis_flows', f.id), { isActive: !f.isActive, updatedAt: serverTimestamp() })
}

const deleteFlow = async (id: string) => {
  if (!confirm('この診断を削除しますか？\n（これまでの診断履歴は残ります）')) return
  await deleteDoc(doc(db, 'diagnosis_flows', id))
}

// 隣と入れ替えてorderを0,1,2...に振り直して保存
const move = async (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= flows.value.length) return
  reordering.value = true
  try {
    const reordered = [...flows.value]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    const batch = writeBatch(db)
    reordered.forEach((f, i) => {
      batch.update(doc(db, 'diagnosis_flows', f.id), { order: i, updatedAt: serverTimestamp() })
    })
    await batch.commit()
  } finally {
    reordering.value = false
  }
}

onMounted(() => {
  onSnapshot(collection(db, 'diagnosis_flows'), (snap) => {
    flows.value = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    loading.value = false
  }, (err) => {
    console.error('診断一覧の取得に失敗:', err)
    loading.value = false
  })
})
</script>
