/**
 * 現在LINEに登録されているリッチメニューの内容を確認するスクリプト（読み取りのみ）
 *
 * 使い方:
 *   LINE_CHANNEL_ACCESS_TOKEN=<トークン> node scripts/checkRichMenu.mjs
 *   または
 *   node scripts/checkRichMenu.mjs <トークン>
 *
 * 各ボタン（エリア）の位置・種類・遷移先（LIFF URL等）を一覧表示します。
 * 「どのボタンがどのURLを開くか」を確認して設定ミスを切り分けるのに使います。
 */

import https from 'https'

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.argv[2]
if (!TOKEN) {
  console.error('Usage: LINE_CHANNEL_ACCESS_TOKEN=<token> node scripts/checkRichMenu.mjs')
  process.exit(1)
}

function api(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: 'api.line.me', path, method, headers: { Authorization: `Bearer ${TOKEN}` } },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }) }
          catch { resolve({ status: res.statusCode, body: d }) }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

// 位置を人間向けラベルに変換（3×2グリッド前提）
function posLabel(b) {
  const col = b.x < 800 ? '左' : b.x < 1600 ? '中' : '右'
  const row = b.y < 800 ? '上段' : '下段'
  return `${row}${col}`
}

const main = async () => {
  const list = await api('GET', '/v2/bot/richmenu/list')
  if (list.status !== 200) {
    console.error(`❌ 取得失敗 (HTTP ${list.status}):`, JSON.stringify(list.body))
    process.exit(1)
  }
  const menus = list.body.richmenus || []
  if (menus.length === 0) {
    console.log('リッチメニューが1つも登録されていません。')
    return
  }

  // デフォルト（全ユーザー適用中）のメニューID
  const def = await api('GET', '/v2/bot/user/all/richmenu')
  const defaultId = def.status === 200 ? def.body.richMenuId : null

  for (const m of menus) {
    const isDefault = m.richMenuId === defaultId
    console.log(`\n=== ${m.name} ${isDefault ? '★現在適用中' : ''}`)
    console.log(`    ID: ${m.richMenuId}  サイズ: ${m.size.width}x${m.size.height}`)
    const areas = [...m.areas].sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x)
    for (const a of areas) {
      const dest = a.action.uri || a.action.data || a.action.text || ''
      console.log(`    [${posLabel(a.bounds)}] ${a.action.label || a.action.type} → ${dest}`)
    }
  }
}

main().catch(console.error)
