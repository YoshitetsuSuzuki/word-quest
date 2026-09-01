// ============================================================================
// WordQuestWidget.swift  ホーム画面ウィジェット本体（WidgetKit / SwiftUI）
//
//   アプリ側(WidgetService.ts)が App Group の UserDefaults に書き出した
//   連続記録・今日の進捗・今日の1語 を読んで表示する。
//   データが無い場合は静的な応援メッセージにフォールバックする。
//
//   ▼ このファイルの使い方は docs/ios-widget-setup.md を参照。
//     Xcode で Widget Extension ターゲットを作り、このファイルを差し替える。
// ============================================================================
import WidgetKit
import SwiftUI

// アプリと共有する App Group。WidgetService.ts の WIDGET_APP_GROUP と一致させる。
private let appGroup = "group.com.infinitygames.wordquest"
private let dataKey = "widgetData"

// アプリが書き出す JSON に対応する構造体
struct WidgetData: Codable {
    var streak: Int
    var todayAnswered: Int
    var dailyGoal: Int
    var word: String
    var meaning: String
    var updatedAt: Double
}

struct WordEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WordEntry {
        WordEntry(date: Date(), data: WidgetData(streak: 3, todayAnswered: 6, dailyGoal: 10, word: "adventure", meaning: "冒険", updatedAt: 0))
    }

    func getSnapshot(in context: Context, completion: @escaping (WordEntry) -> Void) {
        completion(WordEntry(date: Date(), data: readData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WordEntry>) -> Void) {
        let entry = WordEntry(date: Date(), data: readData())
        // 1時間ごとに更新（アプリ起動時にも WidgetCenter.reloadAllTimelines で即時更新可能）
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func readData() -> WidgetData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let raw = defaults.string(forKey: dataKey),
              let json = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: json)
    }
}

struct WordQuestWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        let d = entry.data
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("WordQuest").font(.system(size: 12, weight: .heavy)).foregroundColor(.accentColor)
                Spacer()
                if let d = d, d.streak > 0 {
                    Text("🔥 \(d.streak)").font(.system(size: 12, weight: .bold))
                }
            }
            Spacer(minLength: 0)
            if let d = d, !d.word.isEmpty {
                Text(d.word).font(.system(size: 20, weight: .heavy)).lineLimit(1).minimumScaleFactor(0.6)
                Text(d.meaning).font(.system(size: 13)).foregroundColor(.secondary).lineLimit(2)
                Spacer(minLength: 0)
                let goal = max(d.dailyGoal, 1)
                ProgressView(value: Double(min(d.todayAnswered, goal)), total: Double(goal))
                    .tint(.accentColor)
                Text("今日 \(d.todayAnswered)/\(d.dailyGoal)").font(.system(size: 11)).foregroundColor(.secondary)
            } else {
                // データ未書き込み時のフォールバック（静的応援）
                Text("今日の単語をやろう").font(.system(size: 16, weight: .bold))
                Text("5分で数語。続けるほど強くなる。").font(.system(size: 12)).foregroundColor(.secondary)
            }
        }
        .padding(14)
        .widgetURL(URL(string: "wordquest://open"))
    }
}

@main
struct WordQuestWidget: Widget {
    let kind = "WordQuestWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                WordQuestWidgetEntryView(entry: entry).containerBackground(.fill.tertiary, for: .widget)
            } else {
                WordQuestWidgetEntryView(entry: entry).padding().background()
            }
        }
        .configurationDisplayName("WordQuest")
        .description("連続記録と今日の1語をホーム画面に。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
