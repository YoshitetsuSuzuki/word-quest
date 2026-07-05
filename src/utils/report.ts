import type { Question } from '../types'
import { wordFromPrompt } from './speech'

/** 誤り報告の送信先(GitHub Issues)。無料・修正履歴が公開で残る */
const REPO_URL = 'https://github.com/YoshitetsuSuzuki/word-quest'

/** 単語の誤り報告用のIssue作成URL(単語情報をプリフィル) */
export function wordErrorReportUrl(q: Question): string {
  const word = wordFromPrompt(q.prompt)
  const title = `[誤り報告] ${word}`
  const body = [
    '## 誤りの内容',
    '(どこが間違っているか、正しくは何か、わかる範囲でご記入ください)',
    '',
    '',
    '---',
    '### 対象の単語(自動入力)',
    `- 単語: ${word}`,
    `- 表示中の訳: ${q.answer}`,
    q.pronunciation ? `- 発音表記: ${q.pronunciation}` : null,
    `- ID: ${q.id}`,
    `- 難易度: ${'★'.repeat(q.difficulty)}`,
  ]
    .filter((l): l is string => l !== null)
    .join('\n')
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

/** 一般的な報告・要望用のURL */
export function generalReportUrl(): string {
  return `${REPO_URL}/issues/new`
}
