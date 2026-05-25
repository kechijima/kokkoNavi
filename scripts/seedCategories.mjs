// カテゴリマスタ登録スクリプト
// 実行方法: node scripts/seedCategories.mjs

import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyBddCFGQhykWAM44j5OEL2fo44_NRK0lXA',
  authDomain: 'kokkonavi.firebaseapp.com',
  projectId: 'kokkonavi',
  storageBucket: 'kokkonavi.firebasestorage.app',
  messagingSenderId: '86085711327',
  appId: '1:86085711327:web:7c671cf487b0f33958006a',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

const categories = [
  '子育て支援',
  '住居支援',
  '就労支援',
  '経済支援',
  '法律・権利',
  'イベント',
  'その他',
]

async function main() {
  // 既存カテゴリを削除
  console.log('🗑  既存カテゴリを削除中...')
  const existing = await getDocs(collection(db, 'categories'))
  for (const d of existing.docs) {
    await deleteDoc(doc(db, 'categories', d.id))
    console.log(`   削除: ${d.data().name}`)
  }

  // 新規登録
  console.log('📂 カテゴリを登録中...')
  for (let i = 0; i < categories.length; i++) {
    await addDoc(collection(db, 'categories'), {
      name: categories[i],
      order: i,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log(`   [${i}] ${categories[i]}`)
  }

  console.log('✅ カテゴリ登録完了！')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ エラー:', err)
  process.exit(1)
})
