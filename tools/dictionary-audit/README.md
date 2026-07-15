# dictionary-audit — 外部辞書照合ツール（試作）

元データ（`public/wordbank/`）は**一切変更しない**。照合結果のみ `audit/dictionary-check/` に出力する。

## スクリプト

```bash
# 英語: dictionaryapi.dev(Wiktionary由来/CC-BY-SA)で登録語義を照合
node tools/dictionary-audit/check-english.mjs
#   入力: tools/dictionary-audit/english-targets.json
#   出力: audit/dictionary-check/english-results.json

# 中国語: CC-CEDICT(ローカル配置)で照合。未取得なら全件 not_checked。
node tools/dictionary-audit/check-chinese.mjs
#   入力: tools/dictionary-audit/chinese-targets.json + tools/dictionary-audit/cedict_ts.u8(任意)
#   出力: audit/dictionary-check/chinese-results.json
```

## 状態

`matched` / `partially_matched` / `not_found` / `conflicting` / `not_checked`
**辞書に無い（not_found）＝単語が誤り、ではない。**

## CC-CEDICT の取得（任意・要ライセンス確認）

大容量のため自動DLしない。ライセンス（CC-BY-SA・**照合専用なら継承義務は発生しにくい**）を配布元で確認の上、手動で:

```bash
curl -L -o tools/dictionary-audit/cedict.txt.gz \
  "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz"
gunzip -c tools/dictionary-audit/cedict.txt.gz > tools/dictionary-audit/cedict_ts.u8
```

## ライセンス上の原則

- 本ツールは**照合（verification）専用**。辞書本文をアプリデータへ複製・再配布しない。
- CC-BY-SA 由来（Wiktionary/Kaikki/CC-CEDICT）を**アプリへ取り込む**場合は継承義務に注意。取り込むなら CC-BY の Tatoeba / 寛容ライセンスの WordNet を優先。
- ネットワーク不可・未取得は `not_checked` を記録し、**照合したふりをしない**。
