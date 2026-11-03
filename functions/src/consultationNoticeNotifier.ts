import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'

// チャット相談・オンライン相談の申し込み直後に、現在対応体制を準備中であることを
// 伝えるBotメッセージを送信する。オンライン相談の場合は日程調整ツール（TimeRex）の
// URLも案内する。クライアント（LIFF）からはBot発信のメッセージを直接送れないため、
// conversations に type:'admin' で追加し、既存の onNewMessage がLINEへプッシュする。
export const onConsultationNotice = functions
  .region('asia-northeast1')
  .firestore.document('consultation_notices/{noticeId}')
  .onCreate(async (snap) => {
    const data = snap.data()
    const userId = data.userId as string | undefined
    const kind = data.kind as string | undefined
    if (!userId || !kind) return

    const text = kind === 'オンライン相談'
      ? `オンライン相談のお申し込みを受け付けました😊\n現在、ご案内できる体制を準備中です。準備が整いましたら、こちらのトークより日程調整のご案内をお送りいたします。今しばらくお待ちください🙏\n\n【日程調整ツール（準備中）】\n${data.url ?? ''}`
      : 'チャット相談のお申し込みを受け付けました😊\n現在、担当者が対応できる体制を準備中です。準備が整いましたら、こちらのトークよりご連絡いたします。今しばらくお待ちください🙏'

    try {
      await db.collection('conversations').doc(userId)
        .collection('messages').add({
          text,
          type: 'admin',
          source: 'diagnosis',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })
    } catch (err: any) {
      console.error(`Error sending consultation notice for ${userId}:`, err)
    }
  })
