# ローカル辞書 パイロット試験

生成: 2026-07-15 / **元データ変更なし**

## 試験結果(サンプル)

| 言語 | 照合 | verified | likely | review | conflicting | critical | not_checked | 辞書 |
|---|---|---|---|---|---|---|---|---|
| english | 50 | 0 | 41 | 5 | 0 | 4 | 0 | oewn |
| chinese | 50 | 49 | 0 | 1 | 0 | 0 | 0 | cedict |
| korean | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |
| spanish | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |
| german | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |
| french | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |
| portuguese | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |
| polish | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |
| russian | 20 | 0 | 0 | 0 | 0 | 0 | 20 | - |

## 既知の過去問題語

| id | 語 | 言語 | 見出し | 品詞 | 英語義 | 発音 | 判定 |
|---|---|---|---|---|---|---|---|
| en-03104 | japan | english | exact | exact | missing | missing_in_dictionary | likely_correct |
| en-06181 | latex | english | exact | exact | missing | missing_in_dictionary | likely_correct |
| en-21406 | bouncing | english | exact | exact | missing | missing_in_dictionary | likely_correct |
| zh-00426 | 一边 | chinese | exact | missing_in_dictionary | exact | exact | verified |
| zh-02747 | 圈 | chinese | exact | missing_in_dictionary | exact | exact | verified |
| es-00432 | dulce | spanish | not_checked | not_checked | not_checked | not_checked | not_checked |
| es-01405 | Cristo | spanish | not_checked | not_checked | not_checked | not_checked | not_checked |
| fr-00092 | ensemble | french | not_checked | not_checked | not_checked | not_checked | not_checked |
| fr-00645 | expérience | french | not_checked | not_checked | not_checked | not_checked | not_checked |
| fr-01022 | émission | french | not_checked | not_checked | not_checked | not_checked | not_checked |
| de-00539 | Raum | german | not_checked | not_checked | not_checked | not_checked | not_checked |
| de-00648 | Weihnachten | german | not_checked | not_checked | not_checked | not_checked | not_checked |
| de-00743 | Abendessen | german | not_checked | not_checked | not_checked | not_checked | not_checked |

## 誤判定パターンと対処

- **英語はアプリに英語グロスが無く語義照合不可** → glossEn=missing。見出し・品詞のみOEWN照合、語義はnot確認。verifiedにしない
- **中国語はCC-CEDICTに品詞が無い** → pos=missing_in_dictionary。見出し・語義・拼音で照合。品詞は別途
- **ローカル辞書の無い言語(韓/西/独/仏/葡/波/露)は全件not_checked** → 未確認を一致扱いしない。Kaikki言語別ダンプ配置で対応可
