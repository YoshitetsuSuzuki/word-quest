# 外部辞書照合計画（第7段階・調査のみ／未ダウンロード）

作成: 2026-07-15
現状: **全20,131件が外部辞書未照合**（`externalSourcesChecked: []`）。本段階では大容量ファイルをダウンロードせず、利用可能性とライセンスの調査に留める。

> 注意: 下表は各リソースの公開情報に基づく調査であり、本作業環境で実データを取得・照合したものではない。実利用前にライセンス原文を各配布元で必ず再確認すること（ライセンスは版により変わりうる）。

## リソース比較

| リソース | 対応言語 | 形式 | 規模(目安) | ライセンス | 商用可 | 表示義務 | 継承義務(ShareAlike) | 照合のみ | アプリ直接取込 |
|---|---|---|---|---|---|---|---|---|---|
| Kaikki.org / Wiktextract | ほぼ全言語 | JSONL | 言語毎 数百MB〜数GB | CC-BY-SA | ✅ | 必要 | **あり** | ✅安全 | ⚠ 継承注意 |
| CC-CEDICT | 中→英 | テキスト行 | 数MB(~12万語) | CC-BY-SA 3.0 | ✅ | 必要 | **あり** | ✅安全 | ⚠ 継承注意 |
| WordNet (Princeton) | 英 | DB/tab | 数十MB | WordNet License(BSD系) | ✅ | 必要 | なし | ✅ | ✅可(寛容) |
| Open Multilingual WordNet | 多言語 | LMF/tab | 中 | **言語毎に異なる** | 言語毎 | 言語毎 | 言語毎 | ✅ | ⚠ 言語毎確認 |
| FreeDict | 多対訳ペア | TEI XML | 小〜中 | GPL/CC(辞書毎) | 辞書毎 | 辞書毎 | GPLは**あり** | ✅ | ⚠ コピーレフト注意 |
| Tatoeba | 多言語例文 | CSV | 大 | **CC-BY 2.0 FR** | ✅ | 必要 | **なし** | ✅ | ✅可(表示のみ) |
| 形態素辞書(下記) | 言語別 | 各種 | 中 | 各種 | 各種 | 各種 | 各種 | ✅ | ⚠ 個別確認 |

### 言語別 形態素/発音辞書
- 独: Wiktionary(de) / DEMorphy — 性・複数形・品詞
- 西: Wiktionary(es) / FreeLing — 性・活用・品詞
- 仏: Wiktionary(fr) / Lefff — 性・活用・品詞
- 露: OpenCorpora / pymorphy2辞書 — **強勢**・格・アスペクト
- 波: SGJP/PoliMorf(Morfeusz) — 格・活用・品詞
- 韓: 国立国語院 標準国語大辞典系 / KKMA — 品詞・助詞
- 中: CC-CEDICT + HSK公式 — 拼音・声調・品詞(粗)

## 現在のデータ項目と照合できるフィールド

| 検査したい項目(カテゴリB) | 有効なリソース |
|---|---|
| スペル/見出し(lemma) | Wiktextract, WordNet(英), 各Wiktionary |
| 品詞(POS) | WordNet(英), Wiktextract, 各形態素辞書 |
| 発音(IPA) | Wiktextract(英中心に豊富), 各Wiktionary |
| 声調(拼音) | CC-CEDICT |
| 強勢(露) | OpenCorpora/pymorphy2 |
| 性/複数/活用/格/アスペクト | 各言語形態素辞書, Wiktextract |
| 基本義 | WordNet(英), Wiktextract, CC-CEDICT |
| 例文の差し替え(カテゴリC) | **Tatoeba**(CC-BY・継承なしで最適) |

## ライセンス方針（重要）

1. **照合(verification)のみの利用は全リソースで安全**。単語の正誤確認に使い、辞書本文をアプリに複製しなければ継承義務は発生しにくい。まずは照合専用で使う。
2. **アプリデータへ内容を取り込む場合**:
   - CC-BY-SA(Wiktextract/CC-CEDICT/一部FreeDict) は**継承義務**があり、取り込むと当該派生データを同ライセンスで公開する必要が生じうる。プロプライエタリな単語データへの混入は避け、**照合専用**に限定するのが安全。
   - **取り込むなら継承義務のない CC-BY を優先**: 例文の差し替えは **Tatoeba(CC-BY)** が最適（表示=クレジットのみでよい）。WordNet(英)も寛容ライセンスで取り込み可。
3. 既に取り込み済みの es/de/fr 由来(FrequencyWords CC-BY 4.0 / Wiktextract)については、和訳は独自付与済みで本文大量転載はしていない方針を維持（`dictionary-sources-and-licenses.md` 参照）。

## 実装難易度と推奨順序（提案・未実施）

| フェーズ | 内容 | リソース | 難易度 |
|---|---|---|---|
| 1 | 中国語 拼音・声調・基本義の照合 | CC-CEDICT(小・容易) | 低 |
| 2 | 英語 品詞・基本義の照合(副詞等の再タグ根拠) | WordNet(寛容) | 低〜中 |
| 3 | 危険な例文の差し替え候補取得(カテゴリC) | Tatoeba(CC-BY) | 中 |
| 4 | 英語 IPA の照合 | Wiktextract(en, 大) | 中 |
| 5 | 西独仏露波 の性/活用/強勢/品詞 | 各形態素辞書/Wiktextract | 中〜高 |

## この段階での結論

- 照合専用なら全候補が利用可能。**取り込み用途では Tatoeba(例文) と WordNet(英) を第一候補**とし、CC-BY-SA系(Wiktextract/CEDICT)は照合に限定するのが法的に最も安全。
- 大容量ダウンロードは未実施（本段階の指示どおり）。次段階で、まず軽量な CC-CEDICT と WordNet から照合パイプラインを試作するのが低リスク。
- 照合を実施した項目のみ `externalSourcesChecked` に出典を記録し、未照合は `not_verified` のまま維持する（「合格」は外部保証を意味しない原則を継続）。
