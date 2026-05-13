import * as functions from 'firebase-functions/v1'
import { admin, db } from './firebaseAdmin'
import {
  Client,
  WebhookEvent,
  TextMessage,
  FollowEvent,
  MessageEvent,
  PostbackEvent,
} from '@line/bot-sdk'
import type { Request, Response } from 'firebase-functions/v1'

const getLineClient = () => new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
})

// ─── オンボーディング ────────────────────────────

async function getActiveOnboardingFlow() {
  const snap = await db.collection('onboarding_flows')
    .where('isActive', '==', true).limit(1).get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as any
}

async function sendNextOnboardingQuestion(client: Client, lineUserId: string, flow: any, stepIndex: number) {
  if (stepIndex >= flow.steps.length) {
    await db.collection('users').doc(lineUserId).update({
      onboardingStatus: 'completed',
      onboardingStep: stepIndex,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '✅ ご回答ありがとうございます！\nあなたに合った情報をお届けします🌸\n\nこれからもよろしくお願いします！',
    })
    return
  }

  const step = flow.steps[stepIndex]
  if (step.type === 'single' || step.type === 'multi') {
    const quickReplyItems = (step.options ?? []).map((opt: string) => ({
      type: 'action' as const,
      action: { type: 'message' as const, label: opt.length > 20 ? opt.substring(0, 20) : opt, text: opt },
    }))
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: step.question + (step.type === 'multi' ? '\n（複数選んで送信できます）' : ''),
      quickReply: { items: quickReplyItems.slice(0, 13) },
    } as TextMessage)
  } else {
    await client.pushMessage(lineUserId, { type: 'text', text: step.question })
  }
}

// ─── 支援情報カテゴリ検索 ────────────────────────

async function handleCategorySearch(event: PostbackEvent, client: Client, category: string) {
  const snap = await db.collection('contents')
    .where('category', '==', category)
    .where('status', '==', 'published')
    .limit(5).get()

  if (snap.empty) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `「${category}」の情報はまだ準備中です🙇\nほかのカテゴリもぜひご覧ください！`,
    })
    return
  }

  const BASE_URL = 'https://kokkonavi.web.app'

  const bubbles: any[] = snap.docs.map(d => {
    const c = d.data()
    // linkUrl未設定または暫定値の場合は公開ページURLを自動生成
    const linkUrl = (c.linkUrl && c.linkUrl !== '__pending__')
      ? c.linkUrl
      : `${BASE_URL}/p/${d.id}`

    return {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'xl',
        contents: [
          { type: 'text', text: `📂 ${c.category}`, size: 'xs', color: '#FF8C61' },
          { type: 'text', text: c.title, weight: 'bold', size: 'sm', wrap: true, color: '#333333', margin: 'sm' },
          { type: 'text', text: (c.body ?? '').substring(0, 60) + '…', size: 'xs', wrap: true, color: '#666666', margin: 'sm' },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: 'lg',
        contents: [{
          type: 'button', height: 'sm', style: 'primary', color: '#FF8C61',
          action: { type: 'uri', label: '全文を読む 📖', uri: linkUrl },
        }],
      },
    }
  })

  await client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: `${category}の支援情報`,
    contents: { type: 'carousel', contents: bubbles },
  })
}

// ─── FAQ ────────────────────────────────────────

async function handleFaq(event: PostbackEvent | MessageEvent, client: Client) {
  const snap = await db.collection('faqs')
    .where('isActive', '==', true)
    .orderBy('order', 'asc')
    .limit(8).get()

  if (snap.empty) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'よくある質問は準備中です。\nお気軽にメッセージでご相談ください😊',
    })
    return
  }

  const contents: any[] = snap.docs.map(d => {
    const f = d.data()
    return {
      type: 'box', layout: 'vertical', paddingAll: 'lg',
      borderWidth: '1px', borderColor: '#FFE4D6', cornerRadius: 'xl', margin: 'md',
      contents: [
        { type: 'text', text: `❓ ${f.question}`, weight: 'bold', size: 'sm', wrap: true, color: '#333333' },
        { type: 'text', text: f.answer, size: 'xs', wrap: true, color: '#555555', margin: 'sm' },
      ],
    }
  })

  await client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: 'よくある質問',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', paddingAll: 'xl', backgroundColor: '#FFF8F5',
        contents: [{ type: 'text', text: '❓ よくある質問', weight: 'bold', size: 'md', color: '#FF8C61' }],
      },
      body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents },
    },
  })
}

// ─── Postback（リッチメニューボタン） ───────────

async function handlePostback(event: PostbackEvent, client: Client) {
  const lineUserId = event.source.userId!
  const params = new URLSearchParams(event.postback.data)
  const action = params.get('action')

  switch (action) {
    // 支援情報を探す → カテゴリ選択
    case 'search':
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🔍 どのカテゴリの情報をお探しですか？\n以下から選んでください👇',
        quickReply: {
          items: [
            '子育て支援', '住居支援', '就労支援', '経済支援', '法律・権利', 'その他',
          ].map(cat => ({
            type: 'action' as const,
            action: { type: 'postback' as const, label: cat, data: `action=search_cat&cat=${cat}`, displayText: cat },
          })),
        },
      } as TextMessage)
      break

    // カテゴリ確定 → 記事一覧
    case 'search_cat':
      await handleCategorySearch(event, client, params.get('cat') ?? '')
      break

    // ウェブサイト
    case 'website':
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🌐 ウェブサイトは絶賛制作中です！\nもうしばらくお待ちください🔨✨',
      })
      break

    // 質問・相談
    case 'consult':
      await db.collection('conversations').doc(lineUserId)
        .collection('messages').add({
          text: '【質問・相談を希望しています】',
          type: 'user',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        })
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '💬 ご相談を承りました！\nメッセージをお送りいただくと担当者が確認してご回答いたします😊\n\n少々お時間をいただく場合がありますが、お気軽にどうぞ！',
      })
      break

    // よくある質問
    case 'faq':
      await handleFaq(event, client)
      break
  }
}

// ─── フォロー ────────────────────────────────────

async function handleFollow(event: FollowEvent, client: Client) {
  const lineUserId = event.source.userId!
  const profile = await client.getProfile(lineUserId)

  await db.collection('users').doc(lineUserId).set({
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl ?? '',
    tags: [],
    attributes: {},
    onboardingStatus: 'in_progress',
    onboardingStep: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  const liffId = process.env.LIFF_ID ?? ''
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : ''

  if (liffUrl) {
    await client.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `こんにちは、${profile.displayName}さん！🌸\nこっこナビへようこそ！\n\nひとりで頑張らなくていいよ。\nあなたに寄り添う情報をお届けします💕`,
      },
      {
        type: 'flex',
        altText: 'プロフィールを設定してください',
        contents: {
          type: 'bubble',
          body: {
            type: 'box', layout: 'vertical',
            contents: [
              { type: 'text', text: '🐣 プロフィール設定', weight: 'bold', size: 'md', color: '#FF8C61' },
              { type: 'text', text: 'あなたに合った情報をお届けするために、いくつか教えてください（1分で完了）', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
            ],
          },
          footer: {
            type: 'box', layout: 'vertical',
            contents: [{
              type: 'button',
              action: { type: 'uri', label: 'プロフィールを設定する →', uri: liffUrl },
              style: 'primary', color: '#FF8C61',
            }],
          },
        },
      },
    ])
  } else {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `こんにちは、${profile.displayName}さん！🌸\nこっこナビへようこそ！`,
    })
  }
}

// ─── メッセージ ──────────────────────────────────

async function handleMessage(event: MessageEvent, client: Client) {
  if (event.message.type !== 'text') return
  const lineUserId = event.source.userId!
  const text = event.message.text

  await db.collection('conversations').doc(lineUserId)
    .collection('messages').add({
      text,
      type: 'user',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })

  const userSnap = await db.collection('users').doc(lineUserId).get()
  if (!userSnap.exists) return
  const userData = userSnap.data()!

  // オンボーディング中
  if (userData.onboardingStatus === 'in_progress') {
    const flow = await getActiveOnboardingFlow()
    if (!flow) return
    const stepIndex = userData.onboardingStep ?? 0
    if (stepIndex >= flow.steps.length) return

    const step = flow.steps[stepIndex]
    const updates: Record<string, any> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() }

    if (step.attributeKey) {
      if (step.type === 'multi') {
        const current = userData.attributes?.[step.attributeKey] ?? []
        updates[`attributes.${step.attributeKey}`] = [...new Set([...current, text])]
      } else {
        updates[`attributes.${step.attributeKey}`] = text
      }
    }
    if (step.tagMapping?.[text]) {
      updates.tags = admin.firestore.FieldValue.arrayUnion(step.tagMapping[text])
    }
    updates.onboardingStep = stepIndex + 1

    await db.collection('users').doc(lineUserId).update(updates)
    await sendNextOnboardingQuestion(client, lineUserId, flow, stepIndex + 1)
    return
  }

  // キーワード対応
  const keywords: Record<string, () => Promise<void>> = {
    'よくある質問': () => handleFaq(event, client),
  }
  for (const [kw, handler] of Object.entries(keywords)) {
    if (text.includes(kw)) { await handler(); return }
  }

  // その他は管理者への転送として無視（管理画面から返信）
}

// ─── Webhook エントリーポイント ──────────────────

export const lineWebhook = functions
  .region('asia-northeast1')
  .https.onRequest(async (req: Request, res: Response) => {
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return }

    const client = getLineClient()
    const events: WebhookEvent[] = req.body.events ?? []

    try {
      await Promise.all(events.map(async (event) => {
        switch (event.type) {
          case 'follow':
            await handleFollow(event, client); break
          case 'message':
            await handleMessage(event as MessageEvent, client); break
          case 'postback':
            await handlePostback(event as PostbackEvent, client); break
          case 'unfollow':
            await db.collection('users').doc(event.source.userId!).update({
              blocked: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }); break
        }
      }))
      res.status(200).send('OK')
    } catch (err) {
      console.error('Webhook error:', err)
      res.status(500).send('Internal Server Error')
    }
  })
