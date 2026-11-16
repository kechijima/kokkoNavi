import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'

const RESULT_TYPE_LABEL: Record<string, string> = {
  content: 'コンテンツ情報のご案内',
  chat: 'チャット相談のご案内',
  online: 'オンライン相談のご案内',
}

// 診断結果のフォールバック送信。
// LIFFのsendMessages（chat_message.writeスコープ）が使えず顧客トークに残せなかった
// 場合のみ needsPush:true になる。そのとき conversations に type:'admin' で追加し、
// 既存の onNewMessage が LINE へプッシュ送信して顧客トークに残す。
//
// diagnosis_results は未認証のLIFFクライアントから作成できる(firestore.rules で
// allow create: if true)ため、送信するメッセージ本文はクライアントが書き込んだ
// 自由文(pushMessage)をそのまま信用せず、ここで診断結果種別(result)と
// 管理者が設定したdiagnosis_flowsの案内文から組み立て直す。
// そうしないと、任意のuserId宛てに攻撃者が自由な文面（フィッシングリンク等）を
// 公式Bot名義で送りつけられてしまう。
export const onDiagnosisResult = functions
  .region('asia-northeast1')
  .firestore.document('diagnosis_results/{resultId}')
  .onCreate(async (snap) => {
    const data = snap.data()
    if (!data.needsPush) return
    const userId = data.userId as string | undefined
    const diagnosisId = data.diagnosisId as string | undefined
    const resultType = data.result as string | undefined
    const score = typeof data.score === 'number' ? data.score : null
    if (!userId || !diagnosisId || !resultType || !(resultType in RESULT_TYPE_LABEL)) return

    try {
      const flowSnap = await db.collection('diagnosis_flows').doc(diagnosisId).get()
      if (!flowSnap.exists) return
      const resultInfo = (flowSnap.data() as any)?.results?.[resultType]
      const message = resultInfo?.message
      if (typeof message !== 'string' || !message) return

      const scoreText = score != null ? `\n重要度スコア: ${score}点` : ''
      const text = `【診断結果】\nおすすめ: ${RESULT_TYPE_LABEL[resultType]}${scoreText}\n\n${message}`

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
