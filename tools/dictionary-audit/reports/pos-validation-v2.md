# 品詞タグ検証 v2

生成 2026-07-16 / 第2ソース(Kaikki英語)併用・適用後

**error 0 / warning 171**

## error(限定)

- answer_example_pos_conflict: answer語形と例文文法が明確に食い違う単一品詞タグ
- (構造error=許可外/空/重複タグ は既存 validate-pos-tags.mjs が担保・現状0)

## warning

- multiple_pos_or_ambiguous: 多品詞・answer/例文で一意化できず
- dictionary_taxonomy_or_conflict: 例文品詞が辞書に無い/スキーマ外

## v1との違い

v1は単一辞書(OEWN)の第一品詞と不一致を一律 error(353)。v2は**第2辞書(Kaikki)併用で多品詞を認識**し、多品詞でアプリタグが妥当なもの・多品詞で曖昧なものを error から除外(→warning/OK)。error は真の矛盾に限定。
