/**
 * リッチメニュー登録・画像アップロード・全ユーザー適用 一括スクリプト
 *
 * 使い方:
 *   node scripts/uploadRichMenuImage.mjs <画像ファイルパス> [liff_profile_id] [website_url] [liff_diagnosis_id]
 *
 * 例:
 *   node scripts/uploadRichMenuImage.mjs C:\Users\allja\Downloads\rich_menu.png
 *   node scripts/uploadRichMenuImage.mjs C:\Users\allja\Downloads\rich_menu.png 2005378903-LXWyy1H1 https://www.coccopeer.com/ 2005378903-AQ6v2XZx
 *
 * ボタン配置（3×2の6ボタン・画像と一致）:
 *   上段: 支援情報を探す / 診断 / 公式Webサイト
 *   下段: 質問・相談 / プロフィール変更 / よくある質問
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

const TOKEN = 'BrFVg6Mnm5iqKVw1Ui9cQW89mzILB/dlYXnu8ClaZRoDEo1EawW5+MimR/l7SVKybQFyG2EI/mnB9sZXvRo7qfNeE7GMA2ICmHSNg7AIvjLbLgDllYjQFKxjzCGJ5u5P92xe/Fh/24Kk1naS9h1dVgdB04t89/1O/w1cDnyilFU='
const LIFF_ID = process.argv[3] || '2005378903-vm7jt4ke'
const WEBSITE_URL = process.argv[4] || 'https://www.coccopeer.com/'
const LIFF_DIAGNOSIS_ID = process.argv[5] || '2005378903-AQ6v2XZx'
const IMAGE_PATH = process.argv[2]

if (!IMAGE_PATH) {
  console.error('Usage: node scripts/uploadRichMenuImage.mjs <画像ファイルパス> [liff_profile_id]')
  process.exit(1)
}

const absPath = path.resolve(IMAGE_PATH)
if (!fs.existsSync(absPath)) {
  console.error(`❌ 画像ファイルが見つかりません: ${absPath}`)
  process.exit(1)
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

// ─── リッチメニュー定義 ───────────────────────────

// 3列×2行の6ボタン（画像と一致）
//  上段: [支援情報を探す] [診断] [公式Webサイト]
//  下段: [質問・相談] [プロフィール変更] [よくある質問]
const W = 2500
const H = 1686
const ROW_H = Math.round(H / 2)   // 843
const C0 = 0
const C1 = Math.round(W / 3)      // 833
const C2 = Math.round(W * 2 / 3)  // 1667
const COL_W = C1                  // 833
const COL_W_LAST = W - C2         // 833

const richMenuBody = {
  size: { width: W, height: H },
  selected: true,
  name: 'こっこナビ メインメニュー',
  chatBarText: 'メニュー',
  areas: [
    // 上段左: 支援情報を探す
    {
      bounds: { x: C0, y: 0, width: COL_W, height: ROW_H },
      action: { type: 'postback', label: '支援情報を探す', data: 'action=search', displayText: '支援情報を探す' },
    },
    // 上段中: 診断（診断LIFFを開く）
    {
      bounds: { x: C1, y: 0, width: COL_W, height: ROW_H },
      action: { type: 'uri', label: '診断', uri: `https://liff.line.me/${LIFF_DIAGNOSIS_ID}` },
    },
    // 上段右: 公式Webサイト
    {
      bounds: { x: C2, y: 0, width: COL_W_LAST, height: ROW_H },
      action: { type: 'uri', label: '公式Webサイト', uri: WEBSITE_URL },
    },
    // 下段左: 質問・相談
    {
      bounds: { x: C0, y: ROW_H, width: COL_W, height: ROW_H },
      action: { type: 'postback', label: '質問・相談', data: 'action=consult', displayText: '質問・相談' },
    },
    // 下段中: プロフィール変更
    {
      bounds: { x: C1, y: ROW_H, width: COL_W, height: ROW_H },
      action: { type: 'uri', label: 'プロフィール変更', uri: `https://liff.line.me/${LIFF_ID}` },
    },
    // 下段右: よくある質問
    {
      bounds: { x: C2, y: ROW_H, width: COL_W_LAST, height: ROW_H },
      action: { type: 'postback', label: 'よくある質問', data: 'action=faq', displayText: 'よくある質問' },
    },
  ],
}

// ─── メイン ──────────────────────────────────────

async function main() {
  // 1. 既存のリッチメニューを削除
  console.log('🗑  既存リッチメニューを確認中...')
  const listRes = await lineApi('GET', '/v2/bot/richmenu/list', {})
  if (listRes.status === 200 && Array.isArray(listRes.body.richmenus)) {
    for (const menu of listRes.body.richmenus) {
      await lineApi('DELETE', `/v2/bot/richmenu/${menu.richMenuId}`, {})
      console.log(`   削除: ${menu.richMenuId}`)
    }
  }

  // 2. 新規作成
  console.log('📋 リッチメニューを作成中...')
  const createRes = await lineApi('POST', '/v2/bot/richmenu', richMenuBody)
  if (createRes.status !== 200) {
    console.error(`❌ 作成失敗 (HTTP ${createRes.status}):`, JSON.stringify(createRes.body))
    process.exit(1)
  }
  const richMenuId = createRes.body.richMenuId
  console.log(`✅ 作成完了: ${richMenuId}`)

  // 3. 画像アップロード
  const ext = path.extname(absPath).toLowerCase()
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
  const imageData = fs.readFileSync(absPath)
  console.log(`🖼️  画像アップロード中: ${absPath} (${(imageData.length / 1024).toFixed(0)} KB)`)
  // 画像アップロードは api-data.line.me を使う
  const imgRes = await lineApi('POST', `/v2/bot/richmenu/${richMenuId}/content`, imageData, contentType, 'api-data.line.me')
  if (imgRes.status !== 200) {
    console.error(`❌ 画像アップロード失敗 (HTTP ${imgRes.status}):`, JSON.stringify(imgRes.body))
    process.exit(1)
  }
  console.log('✅ 画像アップロード完了')

  // 4. 全ユーザーに適用
  console.log('🔗 全ユーザーに適用中...')
  const applyRes = await lineApi('POST', `/v2/bot/user/all/richmenu/${richMenuId}`, {})
  if (applyRes.status !== 200) {
    console.error(`❌ 適用失敗 (HTTP ${applyRes.status}):`, JSON.stringify(applyRes.body))
    process.exit(1)
  }

  console.log('✅ リッチメニューを全ユーザーに適用しました！')
  console.log(`   リッチメニューID: ${richMenuId}`)
  console.log(`   診断LIFF: https://liff.line.me/${LIFF_DIAGNOSIS_ID}`)
  console.log(`   プロフィール変更LIFF: https://liff.line.me/${LIFF_ID}`)
  console.log(`   公式Webサイト: ${WEBSITE_URL}`)
}

main().catch(console.error)
