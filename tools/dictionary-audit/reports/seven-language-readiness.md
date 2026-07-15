# 7言語 現状確認（第1段階）

作成: 2026-07-16 / 対象: 既存で not_checked の7言語（英語・中国語は対象外・既存を壊さない）

## 現状（既存 reports/full/summary.json より）

| 言語 | 元データ件数 | 現在の総合判定 | not_checked | 既存辞書設定 | 既存ノーマライザ | 既存インデックス | 不足していた実装 |
|---|---|---|---|---|---|---|---|
| 韓国語 | 1,529 | 全 not_checked | 1,529 | なし | kaikki(汎用) | なし | Kaikki韓国語の取得・索引 |
| スペイン語 | 1,948 | 全 not_checked | 1,948 | なし | kaikki | なし | Kaikkiスペイン語 |
| ドイツ語 | 1,919 | 全 not_checked | 1,919 | なし | kaikki | なし | Kaikkiドイツ語 |
| フランス語 | 1,948 | 全 not_checked | 1,948 | なし | kaikki | なし | Kaikkiフランス語 |
| ポルトガル語 | 150 | 全 not_checked | 150 | なし | kaikki | なし | Kaikkiポルトガル語 |
| ポーランド語 | 150 | 全 not_checked | 150 | なし | kaikki | なし | Kaikkiポーランド語 |
| ロシア語 | 150 | 全 not_checked | 150 | なし | kaikki | なし | Kaikkiロシア語 |
| **計** | **7,794** | — | **7,794** | — | — | — | — |

合計7,794件＝実データと一致（英8136＋中4201＋7言語7794＝20,131）。

## 既存の共通基盤（再利用・作り直さない）
- ローダ/索引: `shared/dictionary-loader`・`index-store`（Mapシリアライズ・簡繁/アクセント/ё-е/大小文字を区別）
- 照合: `shared/local-engine`（--local-only/--resume・詳細ステータス・consensus・監査意味フラグ）
- ノーマライザ: `shared/normalizers/kaikki.mjs`（今回、pos略記の正規化を追加）
- 取得: `download-dictionaries.mjs`（今回、targetedストリーム抽出＋--languages/--seven-languagesを追加）

## 今回追加した実装
- 7言語の Kaikki を `config/sources.json` に targeted 追加、公式ダンプをストリームしてアプリ見出し語一致行のみ抽出（全ダンプ非保存）。
- `local-engine` の LOCAL_SOURCES に7言語を追加。ポーランド語/ロシア語の発音はローマ字転写でKaikki IPAと体系差のため not_checked。
