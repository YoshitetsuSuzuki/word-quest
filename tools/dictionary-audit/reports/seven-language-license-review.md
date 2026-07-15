# 7言語 辞書ライセンス確認レビュー（第2段階）

作成: 2026-07-16 / 実際に配布ページ・ライセンス文・HEAD・データ先頭行を確認した結果のみ記載。

## 採用: Kaikki.org (Wiktextract)

- 配布元: kaikki.org/dictionary/<言語>/kaikki.org-dictionary-<言語>.jsonl
- **ライセンス（実確認）**: kaikki.org/dictionary/ の「Copyright and license」に
  *"made available under the same licenses as Wiktionary - both CC-BY-SA and GFDL"* を確認。
- 商用: 可 ／ 帰属: 必要(Wiktionary) ／ 継承: あり(CC-BY-SA) ／ 再配布: 本文非転載
- 版: 各言語ページに *"wiktionary dump dated YYYY-MM-DD"*（例: 韓国語=2026-07-06）。取得時に記録。
- データ項目（韓国語ダンプ先頭行で実確認）: word / pos / senses[].glosses(英語義) / sounds[].ipa(IPA) / forms[] / lang_code

| 言語 | ダンプ(HEAD実測) | 取得方式 | 使用 |
|---|---|---|---|
| 韓国語 | 186.2MB | targeted抽出 | ○ |
| ポルトガル語 | 529.8MB | targeted抽出 | ○ |
| ポーランド語 | 736.3MB | targeted抽出 | ○ |
| ロシア語 | 892.8MB | targeted抽出 | ○ |
| フランス語 | 544.2MB | targeted抽出 | ○ |
| スペイン語 | 966.4MB | targeted抽出 | ○ |
| ドイツ語 | 1015.9MB | targeted抽出 | ○ |

## 不採用（理由あり）

- **FreeDict / 各言語WordNet / OMW**: 辞書ごとにライセンス・形式が分かれ確認負荷が高い。Kaikki（公式・多言語・品詞/英語義/IPA完備・ライセンス明確）で要件を満たすため本runでは未使用。ライセンスが確認できないものは利用しない（規則8）。

## 取得・利用の原則

- **targeted_official_download**: 公式ダンプをストリーム走査し、アプリ見出し語一致行のみ抽出。全ダンプは保存せず、1語ずつのAPI連打もしない。
- 照合専用。辞書の定義文・例文をアプリデータへ転載しない。CC-BY-SA継承は取り込み時に注意（本方針では取り込まない）。
- 帰属表示（利用時）: 「Wiktionary (via Kaikki.org / Wiktextract), CC-BY-SA」。
