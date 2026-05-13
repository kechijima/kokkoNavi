<template>
  <div class="max-w-2xl mx-auto space-y-5">
    <div class="card">
      <div class="flex items-center justify-between mb-5">
        <h2 class="section-title mb-0">管理者一覧</h2>
        <button @click="showForm = true" class="btn-primary text-sm">
          ＋ 管理者を追加
        </button>
      </div>

      <div class="divide-y divide-gray-50">
        <div v-for="admin in admins" :key="admin.id" class="flex items-center gap-4 py-3">
          <div class="w-10 h-10 bg-peach-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span class="text-peach-600 font-semibold">{{ admin.name?.charAt(0) ?? '管' }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-800">{{ admin.name }}</p>
            <p class="text-sm text-gray-400 truncate">{{ admin.email }}</p>
          </div>
          <span :class="admin.role === 'owner' ? 'badge-peach' : 'badge-gray'" class="badge">
            {{ admin.role === 'owner' ? 'オーナー' : 'スタッフ' }}
          </span>
        </div>
        <div v-if="admins.length === 0" class="py-8 text-center text-gray-400 text-sm">
          管理者がいません
        </div>
      </div>
    </div>

    <div class="card bg-warm-50 border border-gray-200">
      <h3 class="font-semibold text-gray-700 mb-3">管理者追加の手順</h3>
      <ol class="text-sm text-gray-600 space-y-2 list-decimal list-inside">
        <li>Firebaseコンソール → Authentication でメール/パスワードユーザーを作成</li>
        <li>作成したユーザーのUIDをコピー</li>
        <li>Firestore の <code class="bg-white px-1 rounded">/admins/{uid}</code> ドキュメントを作成</li>
        <li>フィールド: <code class="bg-white px-1 rounded">name, email, role: "staff"</code></li>
      </ol>
    </div>

    <!-- 追加フォームモーダル -->
    <div v-if="showForm" class="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-sm">
        <h3 class="section-title">管理者情報を入力</h3>
        <p class="text-sm text-gray-500 mb-4">
          ※ FirebaseコンソールでAuthユーザーを先に作成してから、そのUIDを入力してください
        </p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Firebase UID</label>
            <input v-model="newAdmin.uid" type="text" class="input" placeholder="UID..." />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">名前</label>
            <input v-model="newAdmin.name" type="text" class="input" placeholder="山田 花子" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
            <input v-model="newAdmin.email" type="email" class="input" placeholder="admin@example.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">ロール</label>
            <select v-model="newAdmin.role" class="input">
              <option value="staff">スタッフ</option>
              <option value="owner">オーナー</option>
            </select>
          </div>
        </div>
        <div class="flex gap-3 mt-5 pt-4 border-t border-gray-100">
          <button @click="addAdmin" class="btn-primary" :disabled="!newAdmin.uid || !newAdmin.name || saving">
            {{ saving ? '追加中...' : '追加する' }}
          </button>
          <button @click="showForm = false" class="btn-secondary">キャンセル</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const { db } = useFirebase()

const showForm = ref(false)
const saving = ref(false)
const admins = ref<any[]>([])
const newAdmin = ref({ uid: '', name: '', email: '', role: 'staff' })

const addAdmin = async () => {
  if (!newAdmin.value.uid || !newAdmin.value.name) return
  saving.value = true
  try {
    await setDoc(doc(db, 'admins', newAdmin.value.uid), {
      name: newAdmin.value.name,
      email: newAdmin.value.email,
      role: newAdmin.value.role,
      createdAt: serverTimestamp(),
    })
    newAdmin.value = { uid: '', name: '', email: '', role: 'staff' }
    showForm.value = false
    await loadAdmins()
  } finally {
    saving.value = false
  }
}

const loadAdmins = async () => {
  const snap = await getDocs(collection(db, 'admins'))
  admins.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

onMounted(loadAdmins)
</script>
