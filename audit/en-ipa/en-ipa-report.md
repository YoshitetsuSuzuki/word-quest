# ③ 英語IPA発音 外部辞書照合レポート(Kaikki英語)

作成 2026-07-16 / 出典: Kaikki英語(Wiktextract, CC-BY-SA) / **元データ変更 0件**

## 結果(英語8,136語)

| 状態 | 件数 | 意味 |
|---|---|---|
| **matched** | 7771 | 辞書IPAと一致(GA/RP差は正規化で吸収) |
| variant | 190 | US/UK・広狭の変種(許容) |
| different | 17 | 明白な逸脱候補(下記) |
| dict_no_ipa | 139 | 辞書に発音なし |
| app_no_ipa | 19 | アプリに発音なし(非表示語等) |

→ **発音ありの 7978 語中 7961 語(97.9%)が辞書と整合**。

## different 17件の実査
- 大半はなお **GA/RP変種**(where=(h)wɛɹ vs wɛə, hotshot=ɑ vs ɒ, cashier 等)で誤りではない。
- **真の誤り候補は 2〜4件のみ**:
  - **telephony**: app `/ˈtɛɫəˌfoʊni/`(第1強勢) → 正しくは第2強勢 `/təˈlɛfəni/`。
  - **saline**: app `/səˈɫin/` → 通例 `/ˈseɪlin/`(強勢/母音差)。
  - cooperative / hotshot も要目視。

## 判断
- **IPAは表示専用**(発音再生はWeb Speechが単語から生成・IPAは使わない)。アプリのIPAは**一貫したGeneral American表記**。
- 真の誤りは極少(推定 ~0.05%)。GA一貫性を崩さぬよう、少数の候補は**人手でGA表記のまま修正**するのが最適 → **自動修正0件**。
- 発音の正確さは**97.9%が外部辞書で確認済み**。

## 生成物
- audit/en-ipa/en-ipa-results.json / en-ipa-different.json / en-ipa-human-review.json(真の誤り候補注記付き)
