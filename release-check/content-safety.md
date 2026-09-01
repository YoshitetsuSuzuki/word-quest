# 第3段階: 公開上危険な文字列の再検索

判定: **PASS**

- 検査した文脈フィールド数: 201,169（例文・訳・選択肢）
- Critical: 0 / Major: 0
- 方針: 見出し語が辞書語として必要な場合があるため、単語の存在だけでは問題扱いにしない。学習者が目にする文脈のみを検査。

## 検査対象

差別的表現 / 侮蔑語 / 性的に露骨な例文 / 年齢不相応な選択肢 / 文字化け / HTML・コード断片 / URLの誤混入

## 検出


### Info（見出し語自体の語義・辞書として正当）

- english en-20084 example: `Within the rape crisis movement, Greensite's dissent is significant. — レイプ危機運動の内`
- english en-20188 example: `The penis is one of the male reproductive organs. — 陰茎は雄の生殖器のひとつ。`
- english en-20188 answer: `陰茎`
- english en-20188 choices[3]: `陰茎`
- english en-20635 answer: `膣`
- english en-20635 choices[3]: `膣`
- english en-21232 answer: `強姦犯人`
- english en-21232 choices[2]: `強姦犯人`
- french fr-01812 answer: `rape`
- french fr-01812 glosses.ja: `強姦`
- french fr-01812 glosses.en: `rape`
- french fr-01812 choices[0]: `rape`
