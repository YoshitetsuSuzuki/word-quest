# 辞書ライセンス確認レビュー（第2段階）

作成: 2026-07-16 / 実際に配布ページ・ライセンス文書・HEADを確認した結果のみ記載（推測でURL/ライセンス/サイズを作らない）。

## 確認済み・本runで使用

| 辞書 | 配布元(確認済) | ライセンス(確認元) | 商用 | 帰属 | 継承 | サイズ(実測) | 使用 |
|---|---|---|---|---|---|---|---|
| CC-CEDICT | mdbg.net/chinese/dictionary?page=cc-cedict | **CC-BY-SA 4.0**（配布ページの by-sa/4.0 バッジ確認） | 可 | 必要 | あり | 3.97MB(gz)/9.8MB | ○(中国語) |
| Open English WordNet 2023 | en-word.net ／ github globalwordnet/english-wordnet | **CC-BY 4.0**（en-word.net表記＋LICENSE.md確認） | 可 | 必要(Princeton WN + OEWN) | なし | 12.7MB(gz)/103.6MB | ○(英語) |

## 確認済み・本runでは未使用（理由あり）

| 辞書 | ライセンス | サイズ(実測) | 未使用の理由 |
|---|---|---|---|
| Kaikki 英語(Wiktextract) | CC-BY-SA | **3.19GB** | 過大。英語はOEWNで代替。発音照合が要る時のみ配置 |
| Kaikki 他7言語 | CC-BY-SA | 未確認(数百MB規模想定) | 英中優先。未取得→該当言語は not_checked |

## ライセンス上の扱い（照合専用）

- 本パイプラインは**照合(verification)専用**。辞書本文・例文をアプリデータへ複製・再配布しない。
- **CC-BY-SA**（CC-CEDICT/Kaikki）: 取り込むと継承義務。→ 照合限定で回避。
- **CC-BY**（OEWN）: 帰属表示で取り込みも可だが、本方針では取り込まない。
- 帰属表示（利用時）: 「Princeton WordNet / Open English WordNet team」「CC-CEDICT」。
- ライセンスが確認できないデータはダウンロード・利用しない（Kaikki他言語は未取得のまま）。
