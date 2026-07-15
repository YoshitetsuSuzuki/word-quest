# タグ依存コード分析（第1段階）

作成: 2026-07-16

## tags を読むコード（全探索）
- `src/core/QuestionEngine.ts`: `tags.includes('phrase')`（表現セッション識別）／`tags.find(t=>t!=='phrase')`（phrase問題のテーマ取得）
- `src/components/PhraseCardModal.tsx`: 同上（テーマラベル表示）
- `src/repositories/LocalQuestionRepository.ts`: phrases.json を `tags:['phrase',...]` で取り込み
- `src/types/index.ts`: 型 `tags: string[]`

## 結論
**品詞タグの値（名詞/動詞/形容詞/副詞/word）はコードから一切参照されない非機能メタデータ。**
参照されるのは `phrase` と（phrase問題の）テーマタグのみ。UI表示・フィルター・選択肢生成・学習履歴・保存データ・統計のいずれも品詞値を読まない。

## 新タグ追加の安全性
副詞/代名詞/数詞/間投詞/前置詞/接続詞/限定詞/冠詞/助動詞/助詞/固有名詞 を `tags` に追加しても：
- **コード影響: なし**（POS値は非参照）
- **既存ユーザーデータ影響: なし**（保存データは進捗のみ・tagsを保持しない）
- **phrase/テーマ影響: なし**（別扱い・保持）
→ 既存の日本語タグ形式を維持し、不足カテゴリを日本語ラベルで追加するのは安全。

## 現行タグ（実測）
- english: 名詞/動詞/形容詞（副詞なし）
- chinese/korean: 名詞/動詞/形容詞/副詞
- pivot6言語: word
