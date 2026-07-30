import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'
import { messagingApi } from '@line/bot-sdk'

const getLineClient = () => {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
  return new messagingApi.MessagingApiClient({ channelAccessToken })
}

function matchSegment(userData: any, conditions: any): boolean {
  // 回答中を含まない場合は完了済みのみ対象（セグメント管理画面の判定と統一）
  if (!conditions.includeOnboarding && userData.onboardingStatus !== 'completed') return false

  if (conditions.tags?.length) {
    const userTags: string[] = userData.tags ?? []
    const hasAll = conditions.tags.every((t: string) => userTags.includes(t))
    if (!hasAll) return false
  }

  if (conditions.anyTags?.length) {
    const userTags: string[] = userData.tags ?? []
    const hasAny = conditions.anyTags.some((t: string) => userTags.includes(t))
    if (!hasAny) return false
  }

  if (conditions.region) {
    const userRegion = userData.attributes?.region
    if (!userRegion || !userRegion.includes(conditions.region)) return false
  }

  return true
}

async function getUsersBySegment(segmentId: string): Promise<string[]> {
  const segSnap = await db.collection('segments').doc(segmentId).get()
  if (!segSnap.exists) return []

  const segment = segSnap.data()!
  const conditions = segment.conditions ?? {}

  const snap = await db.collection('users').get()

  const userIds: string[] = []
  snap.docs.forEach(d => {
    if (matchSegment(d.data(), conditions)) {
      userIds.push(d.id)
    }
  })

  return userIds
}

// 全員配信（登録ユーザー全員。作成画面の人数表示(users全件)と対象を一致させる）
async function getAllUserIds(): Promise<string[]> {
  const snap = await db.collection('users').get()
  return snap.docs.map(d => d.id)
}

export const broadcastScheduler = functions
  .region('asia-northeast1')
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now()
    const client = getLineClient()

    const snap = await db.collection('broadcasts')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .get()

    for (const docSnap of snap.docs) {
      const broadcast = docSnap.data()
      await docSnap.ref.update({ status: 'sending' })

      try {
        // 配信対象ユーザー: 全員 or セグメント
        const userIds = broadcast.targetAll
          ? await getAllUserIds()
          : await getUsersBySegment(broadcast.segmentId)

        const messages: any[] = []
        if (broadcast.message) {
          messages.push({ type: 'text', text: broadcast.message })
        }

        // コンテンツ配信の場合のみFlexカードを追加。カスタムメッセージのみの配信はテキストのみ
        if (broadcast.messageType !== 'custom' && broadcast.contentId) {
          const contentSnap = await db.collection('contents').doc(broadcast.contentId).get()
          if (!contentSnap.exists) {
            await docSnap.ref.update({ status: 'failed', error: 'コンテンツが見つかりません' })
            continue
          }
          const content = contentSnap.data()!

          const flexBody: any = {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: content.title,
                weight: 'bold',
                size: 'md',
                wrap: true,
              },
              {
                type: 'text',
                text: String(content.body ?? '').replace(/<[^>]*>/g, '').substring(0, 120) + '...',
                size: 'sm',
                color: '#666666',
                wrap: true,
                margin: 'md',
              },
            ],
          }

          const flexBubble: any = {
            type: 'bubble',
            body: flexBody,
          }

          if (content.imageUrl) {
            flexBubble.hero = {
              type: 'image',
              url: content.imageUrl,
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover',
            }
          }

          if (content.linkUrl) {
            flexBubble.footer = {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '詳しく見る',
                    uri: content.linkUrl,
                  },
                  style: 'primary',
                  color: '#FF8C61',
                },
              ],
            }
          }

          messages.push({
            type: 'flex',
            altText: content.title,
            contents: flexBubble,
          })
        }

        if (messages.length === 0) {
          await docSnap.ref.update({ status: 'failed', error: '送信するメッセージがありません' })
          continue
        }

        const batchSize = 500
        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize)
          await client.multicast({ to: batch, messages })
        }

        await docSnap.ref.update({
          status: 'done',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          'stats.sent': userIds.length,
        })
      } catch (err: any) {
        console.error(`Broadcast ${docSnap.id} failed:`, err)
        await docSnap.ref.update({ status: 'failed', error: err?.message ?? String(err) })
      }
    }
  })
