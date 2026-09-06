<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <h2 class="text-lg font-semibold text-gray-800">リッチメニュー管理</h2>

    <p class="text-sm text-gray-500">
      LINEのリッチメニュー（トーク画面下部のメニュー）の設定を管理します。
      設定を変更した後は「スクリプトを実行してメニューを更新」ボタンで表示されるコマンドを実行してください。
    </p>

    <!-- 現在の設定 -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-gray-700 text-sm">メニュー設定</h3>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">公式Webサイト URL</label>
        <input v-model="config.websiteUrl" type="url" class="input" placeholder="https://www.coccopeer.com/" />
        <p class="text-xs text-gray-400 mt-1">リッチメニュー右上「Webサイト」ボタンのリンク先</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">プロフィール変更 LIFF ID</label>
        <input v-model="config.liffProfileId" type="text" class="input" placeholder="例: 2005378903-XXXXXXXX" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">オンボーディング LIFF ID</label>
        <input v-model="config.liffOnboardingId" type="text" class="input" placeholder="例: 2005378903-XXXXXXXX" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">おすすめ診断 LIFF ID</label>
        <input v-model="config.liffDiagnosisId" type="text" class="input" placeholder="例: 2005378903-XXXXXXXX" />
        <p class="text-xs text-gray-400 mt-1">
          LINE Developersで <code class="bg-gray-100 px-1 rounded">https://kokkonavi.web.app/liff/diagnosis</code> をエンドポイントにしたLIFFアプリを作成し、そのLIFF IDを入力してください。
        </p>
      </div>

      <button @click="saveConfig" class="btn-primary" :disabled="saving">
        {{ saving ? '保存中...' : '設定を保存' }}
      </button>

      <div v-if="saved" class="text-sm text-green-600 flex items-center gap-1">
        ✅ 保存しました
      </div>
    </div>

    <!-- 子育てサポートメニュー ボタン設定 -->
    <div class="card space-y-4">
      <h3 class="font-semibold text-gray-700 text-sm">子育てサポートメニュー ボタン設定</h3>
      <p class="text-sm text-gray-500">
        各ボタンに種別（コンテンツ種別）を紐づけます。ボタンを押すと、その種別に紐づくタグの一覧が表示され、
        選んだタグに該当するコンテンツが届きます。種別に紐づくタグは
        <NuxtLink to="/settings/categories" class="text-peach-500 underline">種別管理</NuxtLink>
        で設定してください。
      </p>

      <div v-for="btn in kosodateButtons" :key="btn.key" class="flex items-center gap-3">
        <label class="w-28 shrink-0 text-sm font-medium text-gray-700">{{ btn.label }}</label>
        <select v-model="config.kosodateCategoryLinks[btn.key]" class="input">
          <option value="">未設定（準備中として案内）</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <button @click="saveConfig" class="btn-primary" :disabled="saving">
        {{ saving ? '保存中...' : '設定を保存' }}
      </button>
    </div>

    <!-- メニュー更新手順 -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-gray-700 text-sm">メニューの更新手順</h3>
      <p class="text-sm text-gray-500">
        設定を反映するには、ローカル環境で以下のコマンドを実行してリッチメニューを再登録してください。
      </p>

      <div class="bg-gray-900 rounded-xl p-4">
        <p class="text-xs text-gray-400 mb-2">PowerShell / ターミナル:</p>
        <code class="text-xs text-green-400 block whitespace-pre-wrap">{{ scriptCommand }}</code>
      </div>

      <button @click="copyCommand" class="btn-secondary text-xs">
        {{ copied ? '✅ コピーしました' : '📋 コマンドをコピー' }}
      </button>
    </div>

    <!-- ボタン構成 -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-gray-700 text-sm">メインメニュー（2500×1686px・3×2の6ボタン）</h3>
      <div class="grid grid-cols-1 gap-2 text-xs text-gray-600">
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">上段左</div>
          <div>子育てサポート → 子育てサポートメニュータブへ切替</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">上段中</div>
          <div class="break-all">診断 → 診断LIFF（{{ config.liffDiagnosisId || '未設定' }}）</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">上段右</div>
          <div class="break-all">公式Webサイト → {{ config.websiteUrl || 'URL未設定' }}</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">下段左</div>
          <div>質問・相談 → 管理者チャット</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">下段中</div>
          <div>プロフィール変更 → LIFF</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">下段右</div>
          <div>よくある質問 → FAQ一覧</div>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <p class="font-medium text-gray-600 mb-1">🧭 おすすめ診断について</p>
        <p>診断はリッチメニューのボタンに <code class="bg-gray-100 px-1 rounded">action=diagnosis</code> のポストバック、または上で設定した「おすすめ診断 LIFF ID」のLIFF URLを割り当てて開きます。「診断」とトークに送っても案内が表示されます。</p>
      </div>
    </div>

    <!-- 子育てサポートメニュー構成 -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-gray-700 text-sm">子育てサポートメニュー（タブ切替）</h3>
      <div class="grid grid-cols-1 gap-2 text-xs text-gray-600">
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">上段左</div>
          <div>子育て全般 → 紐づく種別のタグ選択</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">上段中</div>
          <div>ひとり親 → 紐づく種別のタグ選択</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">上段右</div>
          <div>医療 → 紐づく種別のタグ選択</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">下段左</div>
          <div>プレひとり親 → 紐づく種別のタグ選択</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">下段中</div>
          <div>離婚について → 紐づく種別のタグ選択</div>
        </div>
        <div class="flex gap-3">
          <div class="w-24 shrink-0 font-medium text-gray-500">下段右</div>
          <div>イベント → 公開中のイベント一覧</div>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <p class="font-medium text-gray-600 mb-1">🔗 タブ切替について</p>
        <p>画像上部のタブ帯をタップするとメインメニューと子育てサポートメニューを行き来できます（LINEの<code class="bg-gray-100 px-1 rounded">richmenuswitch</code>機能）。両メニューの画像・タブ切替・タグ紐づけを反映するには、下のコマンドを実行してください。</p>
      </div>
    </div>

    <!-- タブ切替メニューの更新コマンド -->
    <div class="card space-y-3">
      <h3 class="font-semibold text-gray-700 text-sm">タブ切替メニューの更新（推奨）</h3>
      <p class="text-sm text-gray-500">
        メインメニュー画像・子育てサポートメニュー画像の2枚を用意し、ローカル環境で実行してください。
      </p>
      <div class="bg-gray-900 rounded-xl p-4">
        <p class="text-xs text-gray-400 mb-2">PowerShell / ターミナル:</p>
        <code class="text-xs text-green-400 block whitespace-pre-wrap">{{ tabbedScriptCommand }}</code>
      </div>
      <button @click="copyTabbedCommand" class="btn-secondary text-xs">
        {{ copiedTabbed ? '✅ コピーしました' : '📋 コマンドをコピー' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, orderBy } from 'firebase/firestore'

const { db } = useFirebase()
const saving = ref(false)
const saved = ref(false)
const copied = ref(false)
const copiedTabbed = ref(false)
const categories = ref<{ id: string; name: string }[]>([])

const kosodateButtons = [
  { key: 'child_general', label: '子育て全般' },
  { key: 'single_parent', label: 'ひとり親' },
  { key: 'medical', label: '医療' },
  { key: 'pre_single_parent', label: 'プレひとり親' },
  { key: 'divorce', label: '離婚について' },
] as const

const config = ref({
  websiteUrl: 'https://www.coccopeer.com/',
  liffProfileId: '2005378903-LXWyy1H1',
  liffOnboardingId: '2005378903-vm7jt4ke',
  liffDiagnosisId: '2005378903-AQ6v2XZx',
  kosodateCategoryLinks: {} as Record<string, string>,
})

const scriptCommand = computed(() =>
  `node scripts/uploadRichMenuImage.mjs <画像ファイルパス> ${config.value.liffProfileId} ${config.value.websiteUrl} ${config.value.liffDiagnosisId}`
)

const tabbedScriptCommand = computed(() =>
  `node scripts/setupTabbedRichMenu.mjs <メイン画像パス> <子育てサポート画像パス> ${config.value.liffProfileId} ${config.value.websiteUrl} ${config.value.liffDiagnosisId}`
)

const saveConfig = async () => {
  saving.value = true
  saved.value = false
  try {
    await setDoc(doc(db, 'settings', 'richmenu'), {
      ...config.value,
      updatedAt: serverTimestamp(),
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } finally {
    saving.value = false
  }
}

const copyCommand = () => {
  navigator.clipboard.writeText(scriptCommand.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const copyTabbedCommand = () => {
  navigator.clipboard.writeText(tabbedScriptCommand.value)
  copiedTabbed.value = true
  setTimeout(() => { copiedTabbed.value = false }, 2000)
}

onMounted(async () => {
  const [snap, catSnap] = await Promise.all([
    getDoc(doc(db, 'settings', 'richmenu')),
    getDocs(query(collection(db, 'categories'), orderBy('order', 'asc'))),
  ])
  categories.value = catSnap.docs.map(d => ({ id: d.id, name: (d.data() as any).name }))

  if (snap.exists()) {
    const data = snap.data()
    config.value = {
      websiteUrl: data.websiteUrl ?? config.value.websiteUrl,
      liffProfileId: data.liffProfileId ?? config.value.liffProfileId,
      liffOnboardingId: data.liffOnboardingId ?? config.value.liffOnboardingId,
      liffDiagnosisId: data.liffDiagnosisId ?? config.value.liffDiagnosisId,
      kosodateCategoryLinks: data.kosodateCategoryLinks ?? {},
    }
  }
})
</script>
