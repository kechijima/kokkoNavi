/**
 * タブ切替対応リッチメニュー 登録スクリプト（メインメニュー / 子育てサポートメニュー）
 *
 * LINE公式の「リッチメニュー切替（richmenuswitch）」機能を使い、
 * 画像上部のタブ部分をタップすると2つのリッチメニューを行き来できるようにします。
 *
 * 使い方:
 *   node scripts/setupTabbedRichMenu.mjs <メイン画像パス> <子育てサポート画像パス> [liff_profile_id] [website_url] [liff_diagnosis_id] [tab_height_px]
 *
 * 例:
 *   node scripts/setupTabbedRichMenu.mjs kokkoNavi-1.jpg kokkoNavi-2.jpg
 *   node scripts/setupTabbedRichMenu.mjs kokkoNavi-1.jpg kokkoNavi-2.jpg 2005378903-LXWyy1H1 https://www.coccopeer.com/ 2005378903-AQ6v2XZx 300
 *
 * 画像は2500×1686px。上部にタブ帯（高さ tab_height_px、既定300px）、
 * その下に3列×2行の6ボタングリッドがある前提です。
 * タブ部分の座標がずれる場合は、最後の引数 tab_height_px を調整してください。
 *
 * ── メインメニュー ────────────────────────────
 *  上段: 子育てサポート(→子育てサポートメニュータブへ切替) / 診断 / 公式Webサイト
 *  下段: 質問・相談 / プロフィール変更 / よくある質問
 *
 * ── 子育てサポートメニュー（新規） ──────────────
 *  上段: 子育て全般 / ひとり親 / 医療  → いずれも紐づく種別のタグ選択メニュー
 *  下段: プレひとり親 / 離婚について    → 同上
 *        イベント → 公開中のイベント一覧
 *
 * 「子育て全般」「ひとり親」「医療」「プレひとり親」「離婚について」の各ボタンは、
 * 管理画面（リッチメニュー設定）で種別（カテゴリ）と紐づけると、
 * その種別に登録したタグの選択メニューが表示され、選んだタグのコンテンツが届きます。
 * 種別に紐づいていない独立タグ（例: 杉並区など）も選択肢に含まれます。
 * 未設定の場合は「準備中」の案内が表示されます。
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'BrFVg6Mnm5iqKVw1Ui9cQW89mzILB/dlYXnu8ClaZRoDEo1EawW5+MimR/l7SVKybQFyG2EI/mnB9sZXvRo7qfNeE7GMA2ICmHSNg7AIvjLbLgDllYjQFKxjzCGJ5u5P92xe/Fh/24Kk1naS9h1dVgdB04t89/1O/w1cDnyilFU='

const MAIN_IMAGE_PATH = process.argv[2]
const KOSODATE_IMAGE_PATH = process.argv[3]
const LIFF_ID = process.argv[4] || '2005378903-LXWyy1H1'
const WEBSITE_URL = process.argv[5] || 'https://www.coccopeer.com/'
const LIFF_DIAGNOSIS_ID = process.argv[6] || '2005378903-AQ6v2XZx'
const TAB_H = Number(process.argv[7]) || 300

if (!MAIN_IMAGE_PATH || !KOSODATE_IMAGE_PATH) {
  console.error('Usage: node scripts/setupTabbedRichMenu.mjs <メイン画像パス> <子育てサポート画像パス> [liff_profile_id] [website_url] [liff_diagnosis_id] [tab_height_px]')
  process.exit(1)
}

for (const p of [MAIN_IMAGE_PATH, KOSODATE_IMAGE_PATH]) {
  if (!fs.existsSync(path.resolve(p))) {
    console.error(`❌ 画像ファイルが見つかりません: ${path.resolve(p)}`)
    process.exit(1)
  }
}

// ─── API ヘルパー ─────────────────────────────────

function lineApi(method, endpoint, body, contentType = 'application/json', hostname = 'api.line.me') {
  return new Promise((resolve, reject) => {
    const isJson = contentType === 'application/json'
    const bodyBuf = isJson ? Buffer.from(JSON.stringify(body)) : body
    const options = {
      hostname,
      path: endpoint,
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': contentType,
        'Content-Length': bodyBuf.length,
      },
    }
    const req = https.request(options, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString()
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }) }
        catch { resolve({ status: res.statusCode, body: raw }) }
      })
    })
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}

async function createRichMenu(body) {
  const res = await lineApi('POST', '/v2/bot/richmenu', body)
  if (res.status !== 200) {
    console.error(`❌ 作成失敗 (HTTP ${res.status}):`, JSON.stringify(res.body))
    process.exit(1)
  }
  return res.body.richMenuId
}

async function uploadImage(richMenuId, imagePath) {
  const absPath = path.resolve(imagePath)
  const ext = path.extname(absPath).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
  const imageData = fs.readFileSync(absPath)
  console.log(`🖼️  画像アップロード中: ${absPath} (${(imageData.length / 1024).toFixed(0)} KB)`)
  const res = await lineApi('POST', `/v2/bot/richmenu/${richMenuId}/content`, imageData, contentType, 'api-data.line.me')
  if (res.status !== 200) {
    console.error(`❌ 画像アップロード失敗 (HTTP ${res.status}):`, JSON.stringify(res.body))
    process.exit(1)
  }
}

async function upsertAlias(aliasId, richMenuId) {
  // 既存エイリアスがあれば更新、なければ作成
  const updateRes = await lineApi('POST', `/v2/bot/richmenu/alias/${aliasId}`, { richMenuId })
  if (updateRes.status === 200) return
  const createRes = await lineApi('POST', '/v2/bot/richmenu/alias', { richMenuId, richMenuAliasId: aliasId })
  if (createRes.status !== 200) {
    console.error(`❌ エイリアス作成失敗 (HTTP ${createRes.status}):`, JSON.stringify(createRes.body))
    process.exit(1)
  }
}

// ─── レイアウト共通定義 ───────────────────────────

const W = 2500
const H = 1686
const GRID_H = H - TAB_H
const ROW_H = Math.round(GRID_H / 2)
const C0 = 0
const C1 = Math.round(W / 3)
const C2 = Math.round(W * 2 / 3)
const COL_W = C1
const COL_W_LAST = W - C2
const TAB_LEFT_W = Math.round(W / 2)
const TAB_RIGHT_W = W - TAB_LEFT_W

// タブ帯: 左半分=メインメニューへ切替、右半分=子育てサポートメニューへ切替
// （自分自身のタブ領域はタップしても何も起きないよう領域を設けない）
function tabAreaToKosodate() {
  return {
    bounds: { x: TAB_LEFT_W, y: 0, width: TAB_RIGHT_W, height: TAB_H },
    action: { type: 'richmenuswitch', richMenuAliasId: 'kokkonavi-kosodate', data: 'action=tab_switch&to=kosodate' },
  }
}
function tabAreaToMain() {
  return {
    bounds: { x: 0, y: 0, width: TAB_LEFT_W, height: TAB_H },
    action: { type: 'richmenuswitch', richMenuAliasId: 'kokkonavi-main', data: 'action=tab_switch&to=main' },
  }
}

// ─── メインメニュー（既存構成を維持） ─────────────

const mainRichMenuBody = {
  size: { width: W, height: H },
  selected: true,
  name: 'こっこナビ メインメニュー',
  chatBarText: 'メニュー',
  areas: [
    tabAreaToKosodate(),
    // 上段左: 子育てサポート → 子育てサポートメニュータブへ切替
    { bounds: { x: C0, y: TAB_H, width: COL_W, height: ROW_H }, action: { type: 'richmenuswitch', label: '子育てサポート', richMenuAliasId: 'kokkonavi-kosodate', data: 'action=tab_switch&to=kosodate' } },
    // 上段中: 診断
    { bounds: { x: C1, y: TAB_H, width: COL_W, height: ROW_H }, action: { type: 'uri', label: '診断', uri: `https://liff.line.me/${LIFF_DIAGNOSIS_ID}` } },
    // 上段右: 公式Webサイト
    { bounds: { x: C2, y: TAB_H, width: COL_W_LAST, height: ROW_H }, action: { type: 'uri', label: '公式Webサイト', uri: WEBSITE_URL } },
    // 下段左: 質問・相談
    { bounds: { x: C0, y: TAB_H + ROW_H, width: COL_W, height: ROW_H }, action: { type: 'postback', label: '質問・相談', data: 'action=consult', displayText: '質問・相談' } },
    // 下段中: プロフィール変更
    { bounds: { x: C1, y: TAB_H + ROW_H, width: COL_W, height: ROW_H }, action: { type: 'uri', label: 'プロフィール変更', uri: `https://liff.line.me/${LIFF_ID}` } },
    // 下段右: よくある質問
    { bounds: { x: C2, y: TAB_H + ROW_H, width: COL_W_LAST, height: ROW_H }, action: { type: 'postback', label: 'よくある質問', data: 'action=faq', displayText: 'よくある質問' } },
  ],
}

// ─── 子育てサポートメニュー（新規） ───────────────
// 「子育て全般/ひとり親/医療/プレひとり親/離婚について」は種別に紐づくタグ選択メニューを開く。
// 種別との紐づけは管理画面（リッチメニュー設定）で行う。イベントは公開中イベント一覧。

const kosodateRichMenuBody = {
  size: { width: W, height: H },
  selected: false,
  name: 'こっこナビ 子育てサポートメニュー',
  chatBarText: 'メニュー',
  areas: [
    tabAreaToMain(),
    // 上段左: 子育て全般 → 紐づく種別のタグ選択
    { bounds: { x: C0, y: TAB_H, width: COL_W, height: ROW_H }, action: { type: 'postback', label: '子育て全般', data: 'action=kosodate_tag_menu&key=child_general', displayText: '子育て全般' } },
    // 上段中: ひとり親 → 紐づく種別のタグ選択
    { bounds: { x: C1, y: TAB_H, width: COL_W, height: ROW_H }, action: { type: 'postback', label: 'ひとり親', data: 'action=kosodate_tag_menu&key=single_parent', displayText: 'ひとり親' } },
    // 上段右: 医療 → 紐づく種別のタグ選択
    { bounds: { x: C2, y: TAB_H, width: COL_W_LAST, height: ROW_H }, action: { type: 'postback', label: '医療', data: 'action=kosodate_tag_menu&key=medical', displayText: '医療' } },
    // 下段左: プレひとり親 → 紐づく種別のタグ選択
    { bounds: { x: C0, y: TAB_H + ROW_H, width: COL_W, height: ROW_H }, action: { type: 'postback', label: 'プレひとり親', data: 'action=kosodate_tag_menu&key=pre_single_parent', displayText: 'プレひとり親' } },
    // 下段中: 離婚について → 紐づく種別のタグ選択
    { bounds: { x: C1, y: TAB_H + ROW_H, width: COL_W, height: ROW_H }, action: { type: 'postback', label: '離婚について', data: 'action=kosodate_tag_menu&key=divorce', displayText: '離婚について' } },
    // 下段右: イベント → 公開中のイベント一覧
    { bounds: { x: C2, y: TAB_H + ROW_H, width: COL_W_LAST, height: ROW_H }, action: { type: 'postback', label: 'イベント', data: 'action=events', displayText: 'イベント' } },
  ],
}

// ─── メイン処理 ───────────────────────────────────

async function main() {
  // 1. 既存のリッチメニューを削除（エイリアスも道連れに削除される）
  console.log('🗑  既存リッチメニューを確認中...')
  const listRes = await lineApi('GET', '/v2/bot/richmenu/list', {})
  if (listRes.status === 200 && Array.isArray(listRes.body.richmenus)) {
    for (const menu of listRes.body.richmenus) {
      await lineApi('DELETE', `/v2/bot/richmenu/${menu.richMenuId}`, {})
      console.log(`   削除: ${menu.richMenuId}`)
    }
  }

  // 2. 2つのリッチメニューを作成
  console.log('📋 メインメニューを作成中...')
  const mainId = await createRichMenu(mainRichMenuBody)
  console.log(`✅ メインメニュー作成完了: ${mainId}`)

  console.log('📋 子育てサポートメニューを作成中...')
  const kosodateId = await createRichMenu(kosodateRichMenuBody)
  console.log(`✅ 子育てサポートメニュー作成完了: ${kosodateId}`)

  // 3. 画像アップロード
  await uploadImage(mainId, MAIN_IMAGE_PATH)
  console.log('✅ メインメニュー画像アップロード完了')
  await uploadImage(kosodateId, KOSODATE_IMAGE_PATH)
  console.log('✅ 子育てサポートメニュー画像アップロード完了')

  // 4. エイリアス登録（タブ切替に必須）
  console.log('🔗 エイリアスを登録中...')
  await upsertAlias('kokkonavi-main', mainId)
  await upsertAlias('kokkonavi-kosodate', kosodateId)
  console.log('✅ エイリアス登録完了')

  // 5. デフォルト（全ユーザー適用）はメインメニュー
  console.log('🔗 メインメニューを全ユーザーに適用中...')
  const applyRes = await lineApi('POST', `/v2/bot/user/all/richmenu/${mainId}`, {})
  if (applyRes.status !== 200) {
    console.error(`❌ 適用失敗 (HTTP ${applyRes.status}):`, JSON.stringify(applyRes.body))
    process.exit(1)
  }

  console.log('✅ タブ切替対応リッチメニューを設定しました！')
  console.log()
  console.log('─'.repeat(50))
  console.log(`メインメニューID: ${mainId}`)
  console.log(`子育てサポートメニューID: ${kosodateId}`)
  console.log(`タブ帯の高さ: ${TAB_H}px（画像とタップ位置がずれる場合は最後の引数で調整してください）`)
}

main().catch(console.error)
