import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'

// 診断結果のフォールバック送信。
// LIFFのsendMessages（chat_message.writeスコープ）が使えず顧客トークに残せなかった
// 場合のみ needsPush:true になる。そのとき conversations に type:'admin' で追加し、
// 既存の onNewMessage が LINE へプッシュ送信して顧客トークに残す。
export const onDiagnosisResult = functions
  .region('asia-northeast1')
  .firestore.document('diagnosis_results/{resultId}')
  .onCreate(async (snap) => {
    const data = snap.data()
    if (!data.needsPush) return
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
      console.error(`Error pushing diagnosis result for ${userId}:`, err)
    }
  })
