<template>
  <div class="max-w-3xl mx-auto space-y-5">
    <div class="card bg-peach-50 border border-peach-200">
      <div class="flex items-start gap-3">
        <span class="text-2xl">🧭</span>
        <div>
          <p class="font-semibold text-peach-800">おすすめ診断について</p>
          <p class="text-sm text-peach-700 mt-1">
            「今の状況がわからない」「何を相談すればいいかわからない」方向けに、いくつかの質問に答えてもらい、
            回答の点数を集計して重要度に応じて<br>
            ① コンテンツ情報の案内　② チャット相談　③ オンライン相談　へ誘導します。
            点数が高いほど緊急度・重要度が高いと判定されます。
          </p>
        </div>
      </div>
    </div>

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
    <div class="card bg-blue-50 border border-blue-100">
      <p class="text-sm font-medium text-blue-800 mb-1">📱 診断ページのLIFF URL</p>
      <p class="text-xs text-blue-600 break-all">https://liff.line.me/&lt;LIFF_ID&gt;/liff/diagnosis</p>
      <p class="text-xs text-blue-500 mt-1">リッチメニューやLINEトークの「おすすめ診断」ボタンから開きます。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'

const { db } = useFirebase()
const saving = ref(false)
let flowId = ''

interface Option { label: string; points: number }
interface Question { id: string; question: string; options: Option[] }

const flow = ref<{
  isActive: boolean
  title: string
  questions: Question[]
  thresholds: { contentMax: number; chatMax: number }
  results: {
    content: { title: string; message: string }
    chat: { title: string; message: string }
    online: { title: string; message: string }
  }
}>({
  isActive: true,
  title: 'あなたに合った支援を診断します',
  questions: [
    {
      id: crypto.randomUUID(),
      question: '今の生活で、特に困っていることはありますか？',
      options: [
        { label: '特に困っていない・情報を見たいだけ', points: 0 },
        { label: '少し気になることがある', points: 2 },
        { label: '困っていて相談したい', points: 4 },
        { label: 'とても困っていて今すぐ助けが必要', points: 6 },
      ],
    },
    {
      id: crypto.randomUUID(),
      question: '経済的な不安はありますか？',
      options: [
        { label: 'ない', points: 0 },
        { label: '少しある', points: 2 },
        { label: '生活が苦しい', points: 4 },
        { label: '今月の生活も厳しい', points: 6 },
      ],
    },
    {
      id: crypto.randomUUID(),
      question: '気持ちの面ではいかがですか？',
      options: [
        { label: '元気・前向き', points: 0 },
        { label: 'たまに疲れる', points: 2 },
        { label: '不安や孤独を感じる', points: 4 },
        { label: 'とてもつらい・誰かに話したい', points: 6 },
      ],
    },
  ],
  thresholds: { contentMax: 4, chatMax: 10 },
  results: {
    content: {
      title: 'まずは情報をチェックしてみましょう😊',
      message: 'あなたに役立ちそうな支援情報をご用意しています。気になるテーマから探してみてください。',
    },
    chat: {
      title: 'よかったらお話を聞かせてください💬',
      message: '担当者にチャットで相談できます。お困りごとを送っていただければ、一緒に考えます。',
    },
    online: {
      title: '一度ゆっくりお話ししませんか？📞',
      message: 'オンラインで相談員と直接お話しできます。一人で抱え込まず、ぜひご相談ください。',
    },
  },
})

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
  saving.value = true
  try {
    const data = {
      isActive: flow.value.isActive,
      title: flow.value.title,
      questions: flow.value.questions,
      thresholds: flow.value.thresholds,
      results: flow.value.results,
      updatedAt: serverTimestamp(),
    }
    if (flowId) {
      await updateDoc(doc(db, 'diagnosis_flows', flowId), data)
    } else {
      const ref = await addDoc(collection(db, 'diagnosis_flows'), { ...data, createdAt: serverTimestamp() })
      flowId = ref.id
    }
    alert('保存しました！')
  } catch (e: any) {
    alert('保存に失敗しました: ' + (e?.message ?? String(e)))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const snap = await getDocs(query(collection(db, 'diagnosis_flows'), where('isActive', '==', true)))
  if (!snap.empty) {
    const d = snap.docs[0]
    flowId = d.id
    const data = d.data() as any
    flow.value.isActive = data.isActive ?? true
    if (data.title) flow.value.title = data.title
    if (data.questions?.length) flow.value.questions = data.questions
    if (data.thresholds) flow.value.thresholds = data.thresholds
    if (data.results) flow.value.results = data.results
  }
})
</script>
