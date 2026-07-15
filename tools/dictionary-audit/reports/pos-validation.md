# 品詞タグ整合検証

生成 2026-07-16 / 検査 20131 / **error 353 / warning 3205** / 元データ非改変

種別: {"multiple_pos":3205,"pos_conflict":353}

- disallowed_tag/duplicate_tag/empty_tag = error
- pos_conflict(在庫内単一品詞と不一致) = error
- multiple_pos(多品詞) = warning
- 辞書未収録は error にしない。phrase/テーマタグは検査対象外(維持)。
