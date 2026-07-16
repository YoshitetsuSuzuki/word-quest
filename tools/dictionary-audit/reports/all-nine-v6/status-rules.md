# 判定ルール(status-rules) v6

適用: shared/local-engine.mjs / 更新 2026-07-16

## 品詞判定は「全ソースの品詞和集合」で行う
- 英語は OEWN ＋ Kaikki(英語subset) の2辞書。品詞は各ソースの和集合で評価。
- アプリタグが和集合に含まれる → exact/compatible（多品詞語でも妥当と認める）。
- 単一辞書の第一品詞だけで多品詞語を critical 化しない（v5→v6の主な誤検知除去）。

## critical(学習を誤らせる明確な問題)に限定
- 例文の安全性が unsafe
- **品詞和集合が単一品詞**かつアプリタグと不一致（pos = `different`）で、スキーマ内のもの

## critical にしない
- schema_gap / ambiguous(多品詞) / taxonomy_diff → review
- gloss `different` → review（同義/範囲/多義を自動断定しない）
- headword not_found → review（辞書未収録＝誤りの証拠にしない）
- 発音体系差・JA訳 → not_checked

## error/warning(validate-pos-tags v2)
- error: 許可外タグ/空タグ/重複タグ、および answer・例文・辞書すべてと明確に矛盾する単一品詞タグ
- warning: 多品詞、例文なし、answer曖昧、辞書体系差、辞書未収録、第2辞書未確認
