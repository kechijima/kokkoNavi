<template>
  <div class="min-h-screen bg-gradient-to-br from-peach-50 to-warm-100">
    <!-- ローディング -->
    <div v-if="status === 'loading'" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-peach-300 border-t-peach-500 rounded-full animate-spin mx-auto mb-4" />
        <p class="text-peach-600 font-medium">読み込み中...</p>
      </div>
    </div>

    <!-- エラー -->
    <div v-else-if="status === 'error'" class="flex items-center justify-center min-h-screen p-6">
      <div class="text-center">
        <p class="text-4xl mb-4">😕</p>
        <p class="text-gray-600">{{ errorMessage }}</p>
      </div>
    </div>

    <!-- イントロ -->
    <div v-else-if="status === 'intro'" class="flex items-center justify-center min-h-screen p-6">
      <div class="text-center max-w-sm">
        <div class="w-24 h-24 bg-gradient-to-br from-peach-400 to-peach-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-peach">
          <span class="text-4xl">🧭</span>
        </div>
        <h1 class="text-xl font-bold text-gray-800 mb-3">{{ flow.title }}</h1>
        <p class="text-gray-600 text-sm leading-relaxed mb-6">
          かんたんな{{ flow.questions.length }}つの質問に答えるだけ。<br>
          あなたに合った支援の受け方をご案内します🌸
        </p>
        <button @click="status = 'active'" class="btn-primary w-full">診断をはじめる →</button>
      </div>
    </div>

    <!-- 質問 -->
    <div v-else-if="status === 'active' && currentQuestion" class="flex flex-col min-h-screen">
      <div class="bg-white border-b border-gray-100 px-5 py-4 flex-shrink-0">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-gradient-to-br from-peach-400 to-peach-600 rounded-lg flex items-center justify-center">
            <span class="text-white text-sm font-bold">こ</span>
          </div>
          <div>
            <p class="font-bold text-gray-800 text-sm">こっこナビ</p>
            <p class="text-xs text-gray-400">おすすめ診断</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-gray-100 rounded-full h-1.5">
            <div class="bg-peach-500 h-1.5 rounded-full transition-all duration-500" :style="{ width: `${(currentIndex / flow.questions.length) * 100}%` }" />
          </div>
          <span class="text-xs text-gray-500 flex-shrink-0">{{ currentIndex + 1 }}/{{ flow.questions.length }}</span>
        </div>
      </div>

      <div class="flex-1 px-5 py-6 overflow-y-auto">
        <div class="max-w-sm mx-auto">
          <div class="flex items-start gap-3 mb-6">
            <div class="w-10 h-10 bg-peach-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-xl">🐣</span>
            </div>
            <div class="bg-white rounded-2xl rounded-tl-none p-4 shadow-soft flex-1">
              <p class="text-gray-800 text-sm leading-relaxed">{{ currentQuestion.question }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <button
              v-for="(opt, oi) in currentQuestion.options"
              :key="oi"
              @click="selectOption(opt)"
              class="w-full px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 text-left border-gray-200 bg-white text-gray-700 hover:border-peach-300 hover:bg-peach-50"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="currentIndex > 0" class="bg-white border-t border-gray-100 px-5 py-3 flex-shrink-0">
        <div class="max-w-sm mx-auto">
          <button @click="goBack" class="btn-secondary px-4 text-sm">← 戻る</button>
        </div>
      </div>
    </div>

    <!-- 結果 -->
    <div v-else-if="status === 'result'" class="flex items-center justify-center min-h-screen p-6">
      <div class="text-center max-w-sm w-full">
        <div class="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-peach"
          :class="result.type === 'online' ? 'bg-gradient-to-br from-rose-400 to-rose-600' : result.type === 'chat' ? 'bg-gradient-to-br from-peach-400 to-peach-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-500'">
          <span class="text-4xl">{{ result.type === 'online' ? '📞' : result.type === 'chat' ? '💬' : '📄' }}</span>
        </div>
        <h1 class="text-xl font-bold text-gray-800 mb-3">{{ result.title }}</h1>
        <p class="text-gray-600 text-sm leading-relaxed mb-6 whitespace-pre-line">{{ result.message }}</p>

        <!-- コンテンツ案内 -->
        <button v-if="result.type === 'content'" @click="openSearch" class="btn-primary w-full mb-3">
          支援情報を見る 🔍
        </button>

        <!-- チャット相談 -->
        <button v-else-if="result.type === 'chat'" @click="requestConsultation('チャット相談')" class="btn-primary w-full mb-3" :disabled="sending">
          {{ sending ? '送信中...' : 'チャットで相談する 💬' }}
        </button>

        <!-- オンライン相談 -->
        <button v-else @click="requestConsultation('オンライン相談')" class="btn-primary w-full mb-3" :disabled="sending">
          {{ sending ? '送信中...' : 'オンライン相談を申し込む 📞' }}
        </button>

        <button @click="closeLiff" class="btn-secondary w-full">LINEに戻る</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'

definePageMeta({ layout: false, middleware: [] })

const { db } = useFirebase()
const config = useRuntimeConfig()

interface Option { label: string; points: number }
interface Question { id: string; question: string; options: Option[] }

const status = ref<'loading' | 'intro' | 'active' | 'result' | 'error'>('loading')
const errorMessage = ref('')
const sending = ref(false)
const lineUserId = ref('')
const displayName = ref('')
const pictureUrl = ref('')

const flow = ref<{
  title: string
  questions: Question[]
  thresholds: { contentMax: number; chatMax: number }
  results: Record<'content' | 'chat' | 'online', { title: string; message: string }>
}>({
  title: '', questions: [],
  thresholds: { contentMax: 4, chatMax: 10 },
  results: { content: { title: '', message: '' }, chat: { title: '', message: '' }, online: { title: '', message: '' } },
})

const currentIndex = ref(0)
const scores = ref<number[]>([])
const currentQuestion = computed<Question | null>(() => flow.value.questions[currentIndex.value] ?? null)

const totalScore = computed(() => scores.value.reduce((a, b) => a + b, 0))

const result = computed(() => {
  const total = totalScore.value
  let type: 'content' | 'chat' | 'online'
  if (total <= flow.value.thresholds.contentMax) type = 'content'
  else if (total <= flow.value.thresholds.chatMax) type = 'chat'
  else type = 'online'
  return { type, ...flow.value.results[type] }
})

const selectOption = (opt: Option) => {
  scores.value[currentIndex.value] = opt.points || 0
  if (currentIndex.value < flow.value.questions.length - 1) {
    currentIndex.value++
  } else {
    finish()
  }
}

const goBack = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

const resultTypeLabel: Record<string, string> = {
  content: 'コンテンツ情報のご案内',
  chat: 'チャット相談のご案内',
  online: 'オンライン相談のご案内',
}

const finish = async () => {
  status.value = 'result'
  const at = new Date().toISOString()
  // 診断結果をユーザーに記録
  try {
    const userRef = doc(db, 'users', lineUserId.value)
    const snap = await getDoc(userRef)
    const data = {
      lastDiagnosis: { score: totalScore.value, result: result.value.type, at },
      updatedAt: serverTimestamp(),
    }
    if (snap.exists()) await updateDoc(userRef, data)
    else await setDoc(userRef, { displayName: displayName.value, pictureUrl: pictureUrl.value, ...data, createdAt: serverTimestamp() })
  } catch (e) {
    console.warn('診断結果の保存に失敗:', e)
  }

  const summary = `【診断結果】\nおすすめ: ${resultTypeLabel[result.value.type]}\n重要度スコア: ${totalScore.value}点\n\n${result.value.message}`

  // ① ユーザー本人の発言としてトークに送信（isApiAvailableは環境により例外を
  //    投げるため判定に使わず、直接呼んで成否をtry/catchで判断する）
  let sentByUser = false
  try {
    const liff = (window as any).liff
    await liff.sendMessages([{ type: 'text', text: summary }])
    sentByUser = true
  } catch (e) {
    console.warn('sendMessages失敗（Botプッシュにフォールバック）:', e)
  }

  // ② 診断履歴を記録。sendMessagesが使えなかった場合は needsPush:true にして
  //    Cloud Function(onDiagnosisResult)がBotプッシュでフォールバック送信する
  try {
    await addDoc(collection(db, 'diagnosis_results'), {
      userId: lineUserId.value,
      displayName: displayName.value,
      pictureUrl: pictureUrl.value,
      score: totalScore.value,
      maxScore: flow.value.questions.reduce((s, q) => s + Math.max(0, ...q.options.map(o => o.points || 0)), 0),
      result: result.value.type,
      resultLabel: resultTypeLabel[result.value.type] ?? '',
      questionCount: flow.value.questions.length,
      pushMessage: summary,
      needsPush: !sentByUser,
      createdAt: serverTimestamp(),
    })
  } catch (e) {
    console.warn('診断履歴の保存に失敗:', e)
  }
}

const openSearch = () => {
  const url = 'https://kokkonavi.web.app/search'
  const liff = (window as any).liff
  if (liff?.openWindow) liff.openWindow({ url, external: false })
  else window.open(url, '_blank')
}

// チャット相談・オンライン相談 → LINEトークにメッセージを送信して誘導
const requestConsultation = async (kind: string) => {
  sending.value = true
  try {
    const liff = (window as any).liff
    const text = `【${kind}を希望します】\n（おすすめ診断より・重要度スコア: ${totalScore.value}点）`
    // isApiAvailableは例外を投げる環境があるため判定に使わず直接送信を試す
    try {
      await liff.sendMessages([{ type: 'text', text }])
    } catch (e) {
      console.warn('sendMessages失敗、Firestoreに記録:', e)
      await recordRequestFallback(kind)
    }
    closeLiff()
  } finally {
    sending.value = false
  }
}

const recordRequestFallback = async (kind: string) => {
  try {
    await updateDoc(doc(db, 'users', lineUserId.value), {
      pendingConsultation: { kind, score: totalScore.value, at: new Date().toISOString() },
      updatedAt: serverTimestamp(),
    })
  } catch {}
}

const closeLiff = () => {
  const liff = (window as any).liff
  if (liff?.closeWindow) liff.closeWindow()
}

onMounted(async () => {
  try {
    const flowSnap = await getDocs(query(collection(db, 'diagnosis_flows'), where('isActive', '==', true)))
    if (flowSnap.empty) {
      errorMessage.value = '診断が設定されていません'
      status.value = 'error'
      return
    }
    const data = flowSnap.docs[0].data() as any
    flow.value.title = data.title ?? 'おすすめ診断'
    flow.value.questions = data.questions ?? []
    flow.value.thresholds = data.thresholds ?? { contentMax: 4, chatMax: 10 }
    flow.value.results = data.results ?? flow.value.results

    if (flow.value.questions.length === 0) {
      errorMessage.value = '診断の質問が設定されていません'
      status.value = 'error'
      return
    }

    // 診断ページ専用のLIFF IDで初期化する（URLがこのLIFFで開かれるため）
    const liffId = (config.public.liffDiagnosisId as string) || '2005378903-AQ6v2XZx'
    if (!liffId) {
      errorMessage.value = 'LIFF IDが設定されていません'
      status.value = 'error'
      return
    }

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('LIFF SDK load failed'))
      document.head.appendChild(script)
    })

    const liff = (window as any).liff
    await liff.init({ liffId })
    if (!liff.isLoggedIn()) {
      liff.login()
      return
    }

    const profile = await liff.getProfile()
    lineUserId.value = profile.userId
    displayName.value = profile.displayName
    pictureUrl.value = profile.pictureImageUrl ?? ''

    status.value = 'intro'
  } catch (e: any) {
    console.error(e)
    errorMessage.value = '初期化に失敗しました: ' + e.message
    status.value = 'error'
  }
})
</script>
