# 判定ルール(status-rules) v4 — 誤検知再発防止

適用: shared/local-engine.mjs / 更新 2026-07-16

## critical(学習を誤らせる明確な問題)に限定
- 例文の安全性が unsafe
- **アプリ品詞スキーマ内・単一品詞**の明確な誤タグ（pos = `different`）
  - 「単一品詞」かつ「対象品詞がアプリのその言語スキーマに存在」する場合のみ。

## critical にしない(誤検知回避)
- **スキーマ不足**（pos = `schema_gap`）: 辞書が単一品詞を示すが、アプリのその言語に該当タグが無い（例: 英語に副詞タグが無い）→ **review**。個別データ誤りでなくスキーマ課題。
- **多品詞**（pos = `ambiguous`）: 辞書に複数品詞。採用品詞は文脈依存 → **review**。
- **辞書体系差**（pos = `taxonomy_diff`）: phrase/固有名詞/character 等、辞書分類がアプリ体系と非対応 → **review**。
- **グロス表現差**（gloss = `different`）: 同義/範囲/多義の可能性を自動断定しない（規則6）→ **review**。
- **辞書未収録**（headword = `not_found`）: 辞書に無いことは誤りの証拠ではない（規則11/12）→ **review**。
- **発音体系差**（ローマ字転写 vs IPA 等）: `not_checked`。
- **日本語訳**: 信頼できるJA辞書が無い限り `not_checked`。AI翻訳で verified 化しない（規則9）。

## verified(厳格)
- 見出し exact/variant、品詞 exact/compatible（またはスキーマ都合の missing）、語義が strong_match 以上 or 発音 exact、矛盾なし、実辞書照合済み。

## 実装(statPos の戻り値)
`exact / compatible / ambiguous / schema_gap / taxonomy_diff / different / missing_in_app / missing_in_dictionary / not_checked`
→ overallVerdict は `different` のみ critical、`schema_gap/ambiguous/taxonomy_diff` と gloss `different` は review。
