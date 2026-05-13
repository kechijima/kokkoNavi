<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="flex items-center gap-3">
      <NuxtLink to="/contents" class="btn-ghost px-3 py-2">← 戻る</NuxtLink>
      <h2 class="text-lg font-semibold text-gray-800">コンテンツを追加</h2>
    </div>

    <div class="card space-y-5">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タイトル <span class="text-red-400">*</span></label>
        <input v-model="form.title" type="text" class="input" placeholder="タイトルを入力..." />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">カテゴリ</label>
          <select v-model="form.category" class="input">
            <option value="">カテゴリを選択</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">ステータス</label>
          <select v-model="form.status" class="input">
            <option value="draft">下書き</option>
            <option value="published">公開</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">本文 <span class="text-red-400">*</span></label>
        <textarea v-model="form.body" class="input resize-none" rows="6" placeholder="内容を入力..." />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">リンクURL</label>
        <input v-model="form.linkUrl" type="url" class="input" placeholder="https://..." />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">画像URL</label>
        <input v-model="form.imageUrl" type="url" class="input" placeholder="https://..." />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1.5">タグ</label>
        <div class="flex flex-wrap gap-2 mb-2">
          <span v-for="tag in form.tags" :key="tag" class="badge badge-peach cursor-pointer" @click="removeTag(tag)">
            {{ tag }} ×
          </span>
        </div>
        <div class="flex gap-2">
          <input v-model="newTag" type="text" class="input text-sm" placeholder="タグを追加..." @keydown.enter="addTag" />
          <button @click="addTag" class="btn-secondary text-sm px-3 py-2">追加</button>
        </div>
      </div>

      <div class="flex gap-3 pt-2 border-t border-gray-100">
        <button @click="save" class="btn-primary" :disabled="saving">
          {{ saving ? '保存中...' : '追加する' }}
        </button>
        <NuxtLink to="/contents" class="btn-secondary">キャンセル</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

const router = useRouter()
const { db } = useFirebase()

const saving = ref(false)
const newTag = ref('')
const categories = ['子育て支援', '住居支援', '就労支援', '経済支援', '法律・権利', 'その他']

const form = ref({
  title: '',
  body: '',
  category: '',
  status: 'draft',
  linkUrl: '',
  imageUrl: '',
  tags: [] as string[],
})

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) form.value.tags.push(tag)
  newTag.value = ''
}

const removeTag = (tag: string) => {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

const save = async () => {
  if (!form.value.title.trim() || !form.value.body.trim()) {
    alert('タイトルと本文は必須です')
    return
  }
  saving.value = true
  try {
    await addDoc(collection(db, 'contents'), {
      ...form.value,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    router.push('/contents')
  } finally {
    saving.value = false
  }
}
</script>
