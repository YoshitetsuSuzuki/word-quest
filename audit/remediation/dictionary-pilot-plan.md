# 外部辞書照合 試作計画（第5段階）

作成: 2026-07-15 / 対象: needs_human_review のうち英語C/B語（試作）。全件取得は未実施。

## ネットワーク到達性（実測）

本環境から HEAD リクエストで実測（DLはしていない）:

| ホスト | 結果 |
|---|---|
| kaikki.org | HTTP 200（到達可） |
| www.mdbg.net（CC-CEDICT配布元） | HTTP 301（到達可） |
| raw.githubusercontent.com | HTTP 301（到達可） |
| wordnet.princeton.edu | HTTP 403（HEAD拒否・データ自体は別途取得可） |
| api.dictionaryapi.dev | HTTP 200（単語別JSON取得可・実照合に使用） |

→ **ネットワークは利用可能**。ただし本試作では大容量の全件ダンプは取得せず、単語別APIと（中国語は）ローカル配置前提に留めた。

## 使用リソース（正確な情報のみ・未確認は明記）

| データセット | 配布元 | ライセンス | 商用 | 帰属 | 継承(SA) | 再配布 | 照合のみ | サイズ | 更新 |
|---|---|---|---|---|---|---|---|---|---|
| English Wiktionary 抽出（本試作は dictionaryapi.dev 経由で参照） | api.dictionaryapi.dev（Wiktionary由来の無料API・非公式ラッパ） | 元データ Wiktionary = CC-BY-SA（版は要確認） | ○（照合用途） | 必要 | あり | 取込は継承注意 | 単語別 数KB | API随時 |
| Kaikki.org / Wiktextract（本命・本番向け） | kaikki.org | CC-BY-SA | ○ | 必要 | あり | 継承注意 | 言語別 数百MB〜数GB | 定期（日付は配布元で要確認） |
| Princeton WordNet / Open English WordNet | wordnet.princeton.edu ／ github.com/globalwordnet/english-wordnet | WordNet License（寛容）／ OEWNは CC-BY 4.0 | ○ | 必要 | WordNetは無/ OEWNは無 | 可 | ○ | 数十MB | 版毎 |
| CC-CEDICT（中国語） | mdbg.net（cedict_1_0_ts_utf-8_mdbg.txt.gz） | CC-BY-SA（版は要確認） | ○ | 必要 | あり | 継承注意 | 約4MB(gz)/~8MB | 随時 |

> 注意（ルール5・存在しない情報を作らない）: ライセンスの正確な版番号・最終更新日は各配布元で必ず原文確認すること。上表は既知の公開情報に基づく概況であり、本環境で全件取得・全項目照合を行った結果ではない。**照合していない項目を「辞書確認済み」とは扱わない。**

## 実施した試作（英語）

`node tools/dictionary-audit/check-english.mjs` を実行（dictionaryapi.dev、照合のみ・元データ非改変）。
対象＝カテゴリC英語22＋B5＝27語。各語の登録語義に対応する英語キーワードが辞書定義に存在するかで判定。

**結果**（`audit/dictionary-check/english-results.json`）:
- matched: 25（登録語義が辞書で確認できた。例: turner→lathe, august→majestic/venerable, chi→life force, mounting→support/mount, warmer→heater）
- partially_matched: 2（con, scotch＝見出しは存在するがキーワード未一致。語義は辞書に存在するが表現差により未ヒット）
- not_found / not_checked: 0

→ **B適用5語は全て matched で裏付け。暫定非表示にした22語も語義自体は辞書に実在**（＝語は誤りでなく、誤っていたのは例文）。ただし「例文が自然か」は辞書だけでは確定できないため、例文作成は人手を要する（暫定非表示を維持）。

## 中国語（試作枠のみ・本32件スコープ外）

本32件に中国語対象は無い。試作インフラのみ用意（`check-chinese.mjs`）。CC-CEDICTはローカル未取得のため実行結果は全件 `not_checked`。DLは大容量かつ要ライセンス確認のため自動実行しない（コマンドは `tools/dictionary-audit/README.md` と `chinese-results.json` に明記）。

## 状態の定義（統一）

`matched` / `partially_matched` / `not_found` / `conflicting` / `not_checked`。
**辞書に無いこと（not_found）を、単語が誤りである証拠として扱わない。**

## 次段階の推奨

1. 本番照合は Kaikki 公式ダンプ（英）＋ CC-CEDICT（中）をローカル取得して実施（継承義務ゆえ**照合専用**に限定）。
2. 例文の差し替え候補は Tatoeba（CC-BY・継承なし）を優先。
3. 照合済み項目のみ元データの `externalSourcesChecked` に出典を記録し、未照合は not_verified を維持。
