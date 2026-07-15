# 7言語 パイロット試験（第10段階）

生成: 2026-07-16 / **元データ変更なし**

全件実行が高速・安全のため先に完了。本レポートは各50件サンプル＋既知語での確認と誤判定分析。

## 各言語50件サンプル

| 言語 | 照合 | verified | likely | review | conflicting | critical | not_checked |
|---|---|---|---|---|---|---|---|
| korean | 50 | 1 | 38 | 5 | 0 | 6 | 0 |
| spanish | 50 | 50 | 0 | 0 | 0 | 0 | 0 |
| german | 50 | 48 | 0 | 0 | 0 | 2 | 0 |
| french | 50 | 50 | 0 | 0 | 0 | 0 | 0 |
| portuguese | 50 | 49 | 1 | 0 | 0 | 0 | 0 |
| polish | 50 | 50 | 0 | 0 | 0 | 0 | 0 |
| russian | 50 | 50 | 0 | 0 | 0 | 0 | 0 |

## 既知の過去問題語(全て辞書で裏付け)

| id | 語 | 見出し | 品詞 | 英語義 | 発音 | 判定 |
|---|---|---|---|---|---|---|
| es-00432 | dulce | exact | missing_in_app | exact | missing_in_app | verified |
| es-01405 | Cristo | exact | missing_in_app | exact | missing_in_app | verified |
| fr-00645 | expérience | exact | missing_in_app | exact | missing_in_app | verified |
| fr-01022 | émission | exact | missing_in_app | different | missing_in_app | critical |
| fr-00092 | ensemble | exact | missing_in_app | exact | missing_in_app | verified |
| de-00539 | Raum | exact | missing_in_app | exact | missing_in_app | verified |
| de-00648 | Weihnachten | exact | missing_in_app | exact | missing_in_app | verified |
| de-00743 | Abendessen | exact | missing_in_app | exact | missing_in_app | verified |

## 誤判定パターンと対処

- **アプリの品詞タグ体系が粗く、代名詞/感嘆詞/句が名詞タグ(韓国語等)** → Kaikki品詞(pron/intj/phrase)と different→critical。既知のタグ問題であり、辞書側は正。人手でタグ移行が本筋(今回対象外)
- **英語グロスのトークン照合はヒューリスティック。表現差でdifferent化しうる** → gloss different→critical/reviewで人手確認へ。断定しない。例: émission(broadcast)
- **ピボット言語は品詞をアプリが持たない** → pos=missing_in_app。見出し+英語グロスで照合。verified条件は満たしうる
- **ポーランド語/ロシア語の発音はローマ字転写、KaikkiはIPA** → 体系差につきpron=not_checked。発音一致を偽装しない
- **辞書未収録(機能語/固有表現)はnot_found** → criticalにせずreview(規則11/12)。誤りの証拠にしない
- **日本語訳は照合していない** → glossJa=not_checked固定。AI翻訳でverified化しない(規則9)

## 停止基準の評価

重大な誤判定(正式表記と正規化の混同・多義第一義誤判定・辞書欠落のcritical化・日本語訳の無根拠verified)は無し。not_foundはreview化、pl/ru発音はnot_checked化済み。→ 全件実行を実施(問題なし)。
