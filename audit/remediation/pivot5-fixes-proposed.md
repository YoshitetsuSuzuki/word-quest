# pivot5 修正案（適用前・承認用）

作成: 2026-07-15 / 辞書照合: en.wiktionary REST + 各言語版Wiktionary（実アクセス済）

## es-00432 dulce（noun／採用義: 菓子/甘いもの(candy)）

conf 0.98 / 出典: en.wiktionary.org REST API, es.wiktionary.org action API

理由: 現行 answer/en=candy(名詞) に合わせ名詞義へ統一。ja「甘い」(形容詞)を名詞義へ修正し不一致解消。名詞と形容詞を混在させない。

| field | before | after |
|---|---|---|
| glosses.ja | 甘い | 菓子，甘いもの |

## es-01405 Cristo（proper noun／採用義: キリスト(Christ)）

conf 0.98 / 出典: en.wiktionary.org REST API, es.wiktionary.org action API

理由: 固有名詞Christとして確定。見出しをCristo(大文字)、en/answerをjesus→Christへ(JesusとChristを無根拠に同一視しない)。ja「キリスト」は維持。

| field | before | after |
|---|---|---|
| prompt | 「cristo」の意味は？ | 「Cristo」の意味は？ |
| answer | jesus | Christ |
| glosses.en | jesus | Christ |
| choices | moment / universe / jesus / summer | moment / universe / Christ / summer |

## fr-00645 expérience（noun／採用義: 実験(experiment)）

conf 0.98 / 出典: en.wiktionary.org REST API, fr.wiktionary.org action API

理由: 現行 answer/en=experiment に統一。ja「経験，実験」の両義併記を実験1義へ。経験と実験を混在させない。

| field | before | after |
|---|---|---|
| glosses.ja | 経験，実験 | 実験 |

## fr-01022 émission（noun／採用義: 放送/番組(broadcast)）

conf 0.98 / 出典: en.wiktionary.org REST API, fr.wiktionary.org action API

理由: 現行ja「放送」に合わせ放送義へ確定。空似言葉のen=emissionをbroadcastへ修正。answer変更に伴いchoicesも整合。

| field | before | after |
|---|---|---|
| answer | emission | broadcast |
| glosses.en | emission | broadcast |
| choices | combat / moment / prize / emission | combat / moment / prize / broadcast |

## fr-00092 ensemble（adverb／採用義: 一緒に(together)）

conf 0.98 / 出典: en.wiktionary.org REST API, fr.wiktionary.org action API

理由: 現行ja「一緒に」に合わせ副詞together義へ確定。en/answerをset(名詞)→together(副詞)へ。副詞と名詞を混在させない。answer変更に伴いchoicesも整合。

| field | before | after |
|---|---|---|
| answer | set | together |
| glosses.en | set | together |
| choices | message / pair of jeans / set / site | message / pair of jeans / together / site |

