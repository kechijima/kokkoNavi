// 使い方FAQ登録スクリプト（既存FAQを全削除して、アプリの使い方FAQに入れ替え）
// 実行方法: node scripts/seedFaqs.mjs <admin_email> <admin_password>
//   例: node scripts/seedFaqs.mjs alljapanekiden@gmail.com <パスワード>

import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp,
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

// アプリ・LINEの使い方FAQ
const faqs = [
  {
    question: 'こっこナビとは、どんなサービスですか？',
    answer: 'ひとり親家庭の方に向けて、子育て・住居・就労・経済・法律などの支援情報をLINEでお届けするサービスです。あなたの状況に合った情報を探したり、担当者に相談したりできます。ひとりで抱え込まず、気軽にご利用ください🌸',
  },
  {
    question: 'メニューの使い方を教えてください',
    answer: 'LINE画面下のメニューから次のことができます。\n・支援情報を探す：種別ごとに支援情報を見られます\n・診断：かんたんな質問であなたに合った支援の受け方を提案\n・公式Webサイト：こっこピアの公式サイトを開きます\n・質問・相談：担当者にチャットで相談できます\n・プロフィール変更：登録情報を変更できます\n・よくある質問：このページです',
  },
  {
    question: '「支援情報を探す」はどう使いますか？',
    answer: 'メニューの「支援情報を探す」を押すと、種別（子育て支援・住居支援など）が表示されます。気になる種別を選ぶと、あなたのタグに合った支援情報が届きます。「すべて見る」を選ぶと、キーワードや種別で全ての情報を検索できるページが開きます🔍',
  },
  {
    question: '「診断」では何ができますか？',
    answer: 'いくつかの質問に答えるだけで、今のあなたに合った支援の受け方（情報の案内／チャット相談／オンライン相談）をご提案します。「何を相談したらいいか分からない」というときにおすすめです🧭',
  },
  {
    question: '相談したいときはどうすればいいですか？',
    answer: 'メニューの「質問・相談」を押して、相談したい内容（アプリの使い方／相談について／配信コンテンツ／その他）を選んでください。そのあと、具体的に知りたいことをメッセージで送っていただくと、担当者が確認してご回答します😊',
  },
  {
    question: 'プロフィールを変更したいです',
    answer: 'メニューの「プロフィール変更」から、いつでも登録情報を変更できます。お子さんの年齢やお住まいの地域などを更新すると、より合った情報が届くようになります。',
  },
  {
    question: 'どんな情報が届きますか？頻度は？',
    answer: 'あなたが設定したタグ（関心のある分野）に合わせて、支援情報やイベント情報をお届けします。配信の頻度は内容によって異なりますが、大切なお知らせを中心にお送りします。不要な場合はいつでもご相談ください。',
  },
  {
    question: '情報が自分に合っていない気がします',
    answer: 'プロフィールやタグの設定を見直すと、より合った情報が届きやすくなります。メニューの「プロフィール変更」から更新してください。うまくいかないときは「質問・相談」からお気軽にご連絡ください🍀',
  },
]

async function main() {
  const email = process.argv[2] || 'alljapanekiden@gmail.com'
  const password = process.argv[3]
  if (!password) {
    console.error('使い方: node scripts/seedFaqs.mjs <admin_email> <admin_password>')
    process.exit(1)
  }

  console.log(`🔐 ${email} でログイン中...`)
  await signInWithEmailAndPassword(auth, email, password)

  console.log('🗑  既存FAQを削除中...')
  const existing = await getDocs(collection(db, 'faqs'))
  for (const d of existing.docs) {
    await deleteDoc(doc(db, 'faqs', d.id))
    console.log(`   削除: ${d.data().question ?? d.id}`)
  }

  console.log('📖 使い方FAQを登録中...')
  for (let i = 0; i < faqs.length; i++) {
    await addDoc(collection(db, 'faqs'), {
      question: faqs[i].question,
      answer: faqs[i].answer,
      order: i + 1,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log(`   [${i + 1}] ${faqs[i].question}`)
  }

  console.log('✅ 使い方FAQの登録が完了しました！')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ エラー:', err)
  process.exit(1)
})
