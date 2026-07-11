import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'

// 診断結果が保存されたら、管理画面のチャットにBot発信メッセージとして追加する。
// conversations に type:'admin' で書くと、既存の onNewMessage トリガーが
// LINEへプッシュ送信するため、顧客のトークにも確実に結果が残る。
// （LIFFのsendMessages＝chat_message.writeスコープに依存しない方式）
export const onDiagnosisResult = functions
  .region('asia-northeast1')
  .firestore.document('diagnosis_results/{resultId}')
  .onCreate(async (snap) => {
    const data = snap.data()
    const userId = data.userId as string | undefined
    const text = data.pushMessage as string | undefined
    if (!userId || !text) return

    try {
      await db.collection('conversations').doc(userId)
        .collection('messages').add({
          text,
          type: 'admin',
          source: 'diagnosis',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })
    } catch (err: any) {
      console.error(`Error creating diagnosis message for ${userId}:`, err)
    }
  })
