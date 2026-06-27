import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'

// 診断LIFFから相談希望（pendingConsultation）が書き込まれたら、
// 管理画面のチャットに表示されるよう conversations にメッセージを追加する。
// LIFFユーザーは未認証で conversations に直接書けないため、ここで変換する。
export const onConsultationRequest = functions
  .region('asia-northeast1')
  .firestore.document('users/{userId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null
    const before = change.before.exists ? change.before.data() : null
    if (!after) return

    const pending = after.pendingConsultation
    if (!pending || !pending.kind) return

    // 同じリクエストの重複処理を防ぐ（at が前回と同じなら何もしない）
    const prevAt = before?.pendingConsultation?.at
    if (prevAt && prevAt === pending.at) return

    const { userId } = context.params
    const scoreText = pending.score != null ? `（重要度スコア: ${pending.score}点）` : ''
    const text = `【${pending.kind}を希望します】\nおすすめ診断より${scoreText}`

    try {
      // チャットにユーザーからのメッセージとして追加
      await db.collection('conversations').doc(userId)
        .collection('messages').add({
          text,
          type: 'user',
          source: 'diagnosis',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })

      // 一覧の最終メッセージを更新し、未対応フラグを立てる
      await db.collection('users').doc(userId).update({
        lastMessage: text,
        hasPendingConsultation: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // 処理済みなので pendingConsultation は削除（再トリガー防止）
        pendingConsultation: admin.firestore.FieldValue.delete(),
      })
    } catch (err: any) {
      console.error(`Error converting consultation request for ${userId}:`, err)
    }
  })
