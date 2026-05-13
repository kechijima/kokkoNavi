import * as functions from 'firebase-functions/v1'

import { Client } from '@line/bot-sdk'

const getLineClient = () => new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
})

// 管理者がFirestoreにメッセージを書き込んだらLINE Push APIで送信
export const onNewAdminMessage = functions
  .region('asia-northeast1')
  .firestore.document('conversations/{userId}/messages/{msgId}')
  .onCreate(async (snap, context) => {
    const msg = snap.data()
    if (msg.type !== 'admin') return

    const { userId } = context.params
    const client = getLineClient()

    try {
      await client.pushMessage(userId, { type: 'text', text: msg.text })
      await snap.ref.update({ sent: true, sentAt: new Date() })
    } catch (err: any) {
      console.error(`LINE push failed for ${userId}:`, err)
      await snap.ref.update({ sent: false, error: err.message ?? String(err) })
    }
  })
