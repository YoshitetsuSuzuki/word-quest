# ④ japaneseカテゴリ 監査レポート

作成 2026-07-16 / 対象: japaneseカテゴリ 7,489語(英語圏向け日本語学習) / **元データ変更 0件**

## 出典
JLPT N5 decks(MIT) + JMdict(EDRDG, CC-BY-SA) + 人手検証(2026-07)

## 整合性(公開チェックで確認済)
JSON破損0 / id重複0 / answer空0 / prompt空0 / choices=4 / 正解∈choices / 参照切れ0 → **PASS**

## JMdict照合(見出し↔英訳)

| 状態 | 件数 | 割合 |
|---|---|---|
| **matched** | 7,427 | 99.2% |
| not_found_in_jmdict | 32 | 0.4%(特殊見出し・誤りではない) |
| conflicting | 30 | 0.4% |

## conflicting 30件の実査 → **真の誤り 0件**
全30件が誤検知:
- STOP語のトークン除去(that/one/to be/or/and/I/something/someone 等)
- 同義語差(sturdy≈robust[丈夫], nearby≈near[近く], to reduce≈to decrease[減らす], route≈course[針路], subscription≈購読, にっこり≈smiling)
- 同音語の統合(ぶどう=葡萄grape/武道martial arts → grapeは正しく含まれる)
→ いずれも**正しい訳**。

## 結論
- japaneseカテゴリ 7,489語は **99.2%がJMdictで直接確認**、conflictingは全て誤検知で**真の誤り0件**。
- JMdict＋人手検証由来で品質は高い。**修正不要・変更0件**。
- (発音=読み+ローマ字、例文=日英 も付属。整合性は良好)
