<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <NuxtLink to="/settings/diagnosis" class="btn-ghost px-3 py-2">← 戻る</NuxtLink>
      <h2 class="text-lg font-semibold text-gray-800">{{ isNew ? '診断を追加' : '診断を編集' }}</h2>
    </div>

    <div v-if="loading" class="card text-center py-16 text-gray-400">読み込み中...</div>

    <template v-else>
      <!-- 基本設定 -->
      <div class="card">
        <div class="flex items-center justify-between mb-5">
          <h2 class="section-title mb-0">診断フロー</h2>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <div
                class="relative w-10 h-6 rounded-full transition-colors duration-200"
                :class="flow.isActive ? 'bg-peach-500' : 'bg-gray-200'"
                @click="flow.isActive = !flow.isActive"
              >
                <div
                  class="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                  :class="flow.isActive ? 'left-5' : 'left-1'"
                />
              </div>
              <span class="text-sm text-gray-600">{{ flow.isActive ? '有効' : '無効' }}</span>
            </label>
            <button @click="saveFlow" class="btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存する' }}
            </button>
          </div>
        </div>

        <div class="mb-5">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">診断タイトル</label>
          <input v-model="flow.title" type="text" class="input" placeholder="例: あなたに合った支援を診断します" />
        </div>

        <div class="mb-5">
          <label class="block text-sm font-medium text-gray-700 mb-1.5">診断の説明（LINEの一覧に表示されます）</label>
          <textarea v-model="flow.description" class="input text-sm resize-none" rows="2" placeholder="例: 子育てに関するお悩みから、あなたに合った支援をご案内します" />
        </div>

        <!-- 質問リスト -->
        <div class="space-y-4">
          <div
            v-for="(q, index) in flow.questions"
            :key="q.id"
            class="border border-gray-200 rounded-xl p-4 bg-warm-50"
          >
            <div class="flex items-center gap-2 mb-3">
              <div class="flex flex-col flex-shrink-0">
                <button @click="moveQuestion(index, -1)" :disabled="index === 0" class="text-[10px] leading-none px-1 py-0.5 rounded text-gray-400 hover:text-peach-600 hover:bg-peach-50 disabled:opacity-25" title="上へ">▲</button>
                <button @click="moveQuestion(index, 1)" :disabled="index === flow.questions.length - 1" class="text-[10px] leading-none px-1 py-0.5 rounded text-gray-400 hover:text-peach-600 hover:bg-peach-50 disabled:opacity-25" title="下へ">▼</button>
              </div>
              <span class="w-6 h-6 bg-peach-100 text-peach-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{{ index + 1 }}</span>
              <span class="text-xs text-gray-500">単一選択</span>
              <button @click="removeQuestion(index)" class="text-gray-400 hover:text-red-400 transition-colors ml-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <input v-model="q.question" type="text" class="input mb-3" placeholder="質問文を入力..." />

            <p class="text-xs font-medium text-gray-500 mb-2">選択肢と点数（点数が高いほど緊急度・重要度が高い）</p>
            <div class="space-y-2">
              <div v-for="(opt, oi) in q.options" :key="oi" class="flex items-center gap-2">
                <input v-model="opt.label" type="text" class="input text-sm py-1.5 flex-1" placeholder="選択肢テキスト..." />
                <div class="flex items-center gap-1 flex-shrink-0">
                  <input v-model.number="opt.points" type="number" min="0" class="input text-sm py-1.5 w-16 text-center" />
                  <span class="text-xs text-gray-400">点</span>
                </div>
                <button @click="q.options.splice(oi, 1)" class="text-gray-400 hover:text-red-400 flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <button @click="q.options.push({ label: '', points: 0 })" class="btn-ghost text-xs px-3 py-1.5">+ 選択肢を追加</button>
            </div>
          </div>

          <button @click="addQuestion" class="btn-secondary text-sm">＋ 質問を追加</button>
        </div>
      </div>

      <!-- 判定の閾値 -->
      <div class="card">
        <h2 class="section-title">誘導の判定設定</h2>
        <p class="text-sm text-gray-500 mb-4">合計点数によって誘導先が決まります（最大合計点：{{ maxScore }}点）</p>

        <div class="space-y-4">
          <!-- コンテンツ -->
          <div class="border border-gray-100 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">📄</span>
              <span class="font-medium text-gray-800 text-sm">① コンテンツ情報を案内</span>
              <span class="text-xs text-gray-500 ml-auto">合計 {{ 0 }} 〜 {{ flow.thresholds.contentMax }} 点</span>
            </div>
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs text-gray-500">この点数以下：</span>
              <input v-model.number="flow.thresholds.contentMax" type="number" min="0" class="input text-sm py-1 w-20 text-center" />
              <span class="text-xs text-gray-400">点まで</span>
            </div>
            <input v-model="flow.results.content.title" type="text" class="input text-sm mb-2" placeholder="結果タイトル" />
            <textarea v-model="flow.results.content.message" class="input text-sm resize-none" rows="2" placeholder="表示するメッセージ" />
          </div>

          <!-- チャット -->
          <div class="border border-gray-100 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">💬</span>
              <span class="font-medium text-gray-800 text-sm">② チャット相談に誘導</span>
              <span class="text-xs text-gray-500 ml-auto">合計 {{ flow.thresholds.contentMax + 1 }} 〜 {{ flow.thresholds.chatMax }} 点</span>
            </div>
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs text-gray-500">この点数以下：</span>
              <input v-model.number="flow.thresholds.chatMax" type="number" min="0" class="input text-sm py-1 w-20 text-center" />
              <span class="text-xs text-gray-400">点まで</span>
            </div>
            <input v-model="flow.results.chat.title" type="text" class="input text-sm mb-2" placeholder="結果タイトル" />
            <textarea v-model="flow.results.chat.message" class="input text-sm resize-none" rows="2" placeholder="表示するメッセージ" />
          </div>

          <!-- オンライン -->
          <div class="border border-gray-100 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">📞</span>
              <span class="font-medium text-gray-800 text-sm">③ オンライン相談に誘導</span>
              <span class="text-xs text-gray-500 ml-auto">合計 {{ flow.thresholds.chatMax + 1 }} 点以上</span>
            </div>
            <input v-model="flow.results.online.title" type="text" class="input text-sm mb-2" placeholder="結果タイトル" />
            <textarea v-model="flow.results.online.message" class="input text-sm resize-none" rows="2" placeholder="表示するメッセージ" />
          </div>
        </div>
      </div>

      <!-- 公開URL -->
      <div v-if="!isNew" class="card bg-blue-50 border border-blue-100">
        <p class="text-sm font-medium text-blue-800 mb-1">📱 この診断のLIFF URL</p>
        <p class="text-xs text-blue-600 break-all">{{ liffUrl }}</p>
        <p class="text-xs text-blue-500 mt-1">LINEの「診断」メニューから、有効な診断の一覧が表示され、この診断もそこに含まれます。</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'

const route = useRoute()
const router = useRouter()
const { db } = useFirebase()

const id = route.params.id as string
const isNew = id === 'new'
const saving = ref(false)
const loading = ref(!isNew)

interface Option { label: string; points: number }
interface Question { id: string; question: string; options: Option[] }

const flow = ref<{
  isActive: boolean
  title: string
  description: string
  order: number
  questions: Question[]
  thresholds: { contentMax: number; chatMax: number }
  results: {
    content: { title: string; message: string }
    chat: { title: string; message: string }
    online: { title: string; message: string }
  }
}>({
  isActive: true,
  title: isNew ? '' : '',
  description: '',
  order: 0,
  questions: isNew ? [
    {
      id: crypto.randomUUID(),
      question: '',
      options: [
        { label: '', points: 0 },
        { label: '', points: 2 },
        { label: '', points: 4 },
        { label: '', points: 6 },
      ],
    },
  ] : [],
  thresholds: { contentMax: 4, chatMax: 10 },
  results: {
    content: { title: '', message: '' },
    chat: { title: '', message: '' },
    online: { title: '', message: '' },
  },
})

const liffDiagnosisId = ref('')
const liffUrl = computed(() => liffDiagnosisId.value
  ? `https://liff.line.me/${liffDiagnosisId.value}?flowId=${id}`
  : `https://liff.line.me/<診断LIFF ID>?flowId=${id}`)

const maxScore = computed(() =>
  flow.value.questions.reduce((sum, q) => sum + Math.max(0, ...q.options.map(o => o.points || 0)), 0)
)

const addQuestion = () => {
  flow.value.questions.push({
    id: crypto.randomUUID(),
    question: '',
    options: [{ label: '', points: 0 }],
  })
}
const removeQuestion = (index: number) => flow.value.questions.splice(index, 1)
const moveQuestion = (index: number, dir: -1 | 1) => {
  const t = index + dir
  if (t < 0 || t >= flow.value.questions.length) return
  const q = flow.value.questions
  ;[q[index], q[t]] = [q[t], q[index]]
}

const saveFlow = async () => {
  if (!flow.value.title.trim()) {
    alert('診断タイトルを入力してください')
    return
  }
  saving.value = true
  try {
    const data = {
      isActive: flow.value.isActive,
      title: flow.value.title.trim(),
      description: flow.value.description.trim(),
      order: flow.value.order,
      questions: flow.value.questions,
      thresholds: flow.value.thresholds,
      results: flow.value.results,
      updatedAt: serverTimestamp(),
    }
    if (isNew) {
      await addDoc(collection(db, 'diagnosis_flows'), { ...data, createdAt: serverTimestamp() })
    } else {
      await updateDoc(doc(db, 'diagnosis_flows', id), data)
    }
    router.push('/settings/diagnosis')
  } catch (e: any) {
    alert('保存に失敗しました: ' + (e?.message ?? String(e)))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const richmenuSnap = await getDoc(doc(db, 'settings', 'richmenu'))
  if (richmenuSnap.exists()) liffDiagnosisId.value = (richmenuSnap.data() as any)?.liffDiagnosisId ?? ''

  if (isNew) {
    // 新規作成時は既存の診断数を取得してorderを末尾に
    const snap = await getDocs(collection(db, 'diagnosis_flows'))
    flow.value.order = snap.size
    return
  }
  const snap = await getDoc(doc(db, 'diagnosis_flows', id))
  if (snap.exists()) {
    const data = snap.data() as any
    flow.value.isActive = data.isActive ?? true
    flow.value.title = data.title ?? ''
    flow.value.description = data.description ?? ''
    flow.value.order = data.order ?? 0
    if (data.questions?.length) flow.value.questions = data.questions
    if (data.thresholds) flow.value.thresholds = data.thresholds
    if (data.results) flow.value.results = data.results
  }
  loading.value = false
})
</script>
