/**
 * 表示名の下ごしらえ。自由入力はこの1か所しかないので、ここで抑えれば
 * UGC のリスクはほぼ塞げる（つつきは定型文で自由入力を持たない）。
 * App Store のガイドライン1.2（ユーザー生成コンテンツ）対応。
 */

/** 露骨・攻撃的な語。完全な網羅は不可能なので、明らかなものだけを弾く */
const BLOCKED = /(fuck|shit|cunt|bitch|nigg|faggot|rape|kill\s*you|死ね|殺す|しね|ころす|まんこ|ちんこ|ちんぽ|レイプ)/i

/** 表示名の最大長。長すぎるとランキングの行が崩れる */
export const NAME_MAX = 12

/** 既定の表示名（未設定・不適切だった場合） */
export const DEFAULT_NAME = 'ななしさん'

/**
 * 表示名を安全な形に整える。
 * - 制御文字を落とし、前後の空白を詰める
 * - 長すぎれば切る
 * - 露骨な語を含む・空になった場合は既定名に置き換える
 */
export function sanitizeName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX)
  if (!cleaned) return DEFAULT_NAME
  if (BLOCKED.test(cleaned)) return DEFAULT_NAME
  return cleaned
}

/** 通報メールの下書き。運用中の窓口へ送る */
export function reportMailUrl(targetName: string, targetId: string): string {
  const to = 'yoshitetsugames21+chiritsumo@gmail.com'
  const subject = encodeURIComponent('[ちりつも単語] ユーザーの通報')
  const body = encodeURIComponent(
    `通報するユーザー: ${targetName}\nID: ${targetId}\n\n理由をご記入ください:\n`,
  )
  return `mailto:${to}?subject=${subject}&body=${body}`
}

/** 非表示にしたユーザー（端末内のみ） */
const HIDDEN_KEY = 'wordquest.friends.hidden'

export function hiddenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function toggleHidden(id: string): Set<string> {
  const s = hiddenIds()
  if (s.has(id)) s.delete(id)
  else s.add(id)
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s]))
  } catch {
    // 容量超過などは無視（非表示が効かなくなるだけ）
  }
  return s
}
