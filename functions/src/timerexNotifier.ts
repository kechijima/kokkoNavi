import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'

// オンライン相談申し込み時、日程調整ツール（TimeRex）のURLをBotメッセージとして送信する。
// クライアント（LIFF）からはBot発信のメッセージを直接送れないため、
// conversations に type:'admin' で追加し、既存の onNewMessage がLINEへプッシュする。
export const onTimerexLinkRequest = functions
  .region('asia-northeast1')
  .firestore.document('timerex_link_requests/{requestId}')
  .onCreate(async (snap) => {
    const data = snap.data()
    const userId = data.userId as string | undefined
    const url = data.url as string | undefined
    if (!userId || !url) return

    const text = `オンライン相談の日程調整はこちらからお願いします🌸\n${url}`

    try {
      await db.collection('conversations').doc(userId)
        .collection('messages').add({
          text,
          type: 'admin',
          source: 'diagnosis',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })
    } catch (err: any) {
      console.error(`Error sending TimeRex link for ${userId}:`, err)
    }
  })
