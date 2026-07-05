// ============================================================================
// 型定義 — アプリ全体で共有する中核データ構造
// Core層は「英単語」を知らない。Question型だけを扱う汎用エンジンとする。
// ============================================================================

/** 出題カテゴリ。将来 chinese/history/spi/certification を追加できる拡張可能union */
export type Category =
  | 'english'
  | 'chinese'
  | 'korean'

/** 難易度 1(易) 〜 7(難)。英語はLv6-7(拡張候補プールのレビュー昇格分)まで存在する */
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** 汎用問題。英単語専用ではない。 */
export interface Question {
  id: string
  category: Category
  prompt: string // 問題文（例: "apple の意味は？"）
  answer: string // 正解の選択肢テキスト
  choices: string[] // 4択（answer を含む）
  difficulty: Difficulty
  tags: string[]
  explanation?: string
  example?: string // 例文
  exampleForm?: string // 例文中に実際に現れる形(bought等)。リスニング穴埋めの正解判定に使う
  pronunciation?: string // 発音記号(IPA) 例: /ˈæpəɫ/
  audioUrl?: string // 将来の音声再生用（optional）
  /** 人手レビュー済み(訳が確実)か。verifiedOnly時はtrueのみ出題する */
  verified?: boolean
}

/** Anki式間隔反復の管理単位（SM-2 lite） */
export interface ReviewItem {
  questionId: string
  /** 次回復習の予定時刻（epoch ms） */
  nextReviewAt: number
  /** 現在の復習間隔（日） */
  intervalDays: number
  /** 連続正解回数 */
  repetitions: number
  /** 易しさ係数（SM-2） */
  easeFactor: number
}

/** 実績の獲得状況 */
export interface AchievementProgress {
  id: string
  unlockedAt: number // epoch ms
}

/** ユーザーデータ本体。localStorageに保存され、将来Supabaseへ移行する。 */
export interface User {
  id: string
  name: string
  xp: number
  level: number
  coin: number
  eloRating: number
  streakDays: number
  totalCorrect: number
  totalAnswered: number
  /** 一度でも正解した問題ID */
  learnedQuestionIds: string[]
  /** 間隔反復キュー */
  reviewQueue: ReviewItem[]
  /** 獲得済み実績 */
  achievements: AchievementProgress[]

  // --- 派生・付随データ（サーバー化時も保持しやすいフラットな構造） ---
  /** 最終ログイン日（YYYY-MM-DD, ローカル） */
  lastLoginDate: string
  /** バトル戦績 */
  battleWins: number
  battleLosses: number
  /** 今日獲得したCoin（デイリーランキング用, 日付が変わるとリセット） */
  todayCoin: number
  todayCoinDate: string
  /** 購入済みショップアイテムID */
  ownedItemIds: string[]
  /** 装備中の項目（正解エフェクト・アイコン枠など） */
  equipped: EquippedItems
  /** デイリーミッションの進捗（日付ごとにリセット） */
  missionState: MissionState
  /** レイドへの本日の貢献数 */
  raidState: RaidState
  /** 語ごとの正答率トラッキング: questionId -> { c: 正解数, t: 挑戦数 } */
  wordStats: Record<string, { c: number; t: number }>
  /** ユーザーがタップで追加した自分専用の単語帳（暗記カード）: questionId の配列 */
  customDeck: string[]
  /** 今日回答した問題数（デイリー目標用、日付が変わるとリセット） */
  todayAnswered: number
  todayAnsweredDate: string
}

export interface EquippedItems {
  effect?: string // 正解エフェクトのアイテムID
  frame?: string // アイコン枠のアイテムID
  title?: string // 称号アイテムID
}

// ============================================================================
// データ駆動の設定型（コードを書き換えずに追加・変更できる形にする）
// ============================================================================

/** 報酬計算の設定 */
export interface RewardConfig {
  baseXp: number
  baseCoin: number
  /** 難易度ごとの倍率 */
  difficultyMultiplier: Record<Difficulty, number>
  /** コンボ数に応じた倍率カーブ（超えた分は最後の値を使う） */
  comboMultipliers: number[]
  /** レベルアップに必要なXP: level -> requiredXp */
  levelCurve: (level: number) => number
}

/** ミッション定義（設定データ） */
export type MissionType =
  | 'answerCorrect' // n問正解
  | 'playBattle' // バトルをn回
  | 'joinRaid' // レイドにn回参加
  | 'loginStreak' // n日連続ログイン

export interface MissionDef {
  id: string
  title: string
  type: MissionType
  target: number
  rewardCoin: number
  rewardXp: number
}

/** ミッションの進捗状態（ユーザーデータ内） */
export interface MissionState {
  date: string // 進捗が有効な日付（変わるとリセット）
  progress: Record<string, number> // missionId -> 進捗値
  claimed: string[] // 報酬受取済みのmissionId
}

/** レイドボス定義（設定データ） */
export interface RaidDef {
  id: string
  name: string
  emoji: string
  /** クリアに必要な合計貢献数（ダミー集計） */
  targetContribution: number
  /** 演出用の「他プレイヤー分」擬似ベース進捗の割合(0-1) */
  baseProgressRatio: number
  rewardCoin: number
  rewardXp: number
  rewardTitle?: string
}

/** レイド状態（ユーザーデータ内） */
export interface RaidState {
  date: string
  bossId: string
  myContribution: number
  claimed: boolean
}

/** 実績定義（設定データ） */
export type AchievementCondition =
  | { kind: 'firstCorrect' }
  | { kind: 'comboReach'; value: number }
  | { kind: 'totalCorrect'; value: number }
  | { kind: 'battleWin'; value: number }
  | { kind: 'raidJoin'; value: number }
  | { kind: 'loginStreak'; value: number }

export interface AchievementDef {
  id: string
  title: string
  description: string
  emoji: string
  condition: AchievementCondition
  rewardCoin: number
}

/** ショップアイテム定義（設定データ） */
export type ShopItemKind = 'title' | 'frame' | 'effect'

export interface ShopItemDef {
  id: string
  name: string
  kind: ShopItemKind
  price: number
  /** 表示用のプレビュー（絵文字・色クラスなど） */
  preview: string
  description: string
}

/** 機能フラグ */
export interface FeatureFlags {
  battleEnabled: boolean
  raidEnabled: boolean
  rankingEnabled: boolean
  shopEnabled: boolean
  missionsEnabled: boolean
  achievementsEnabled: boolean
  reviewEnabled: boolean
  /** true の間は人手レビュー済み(verified)の語だけを出題する */
  verifiedOnly: boolean
}

// ============================================================================
// ランキング
// ============================================================================

export type RankingKind = 'coin' | 'elo' | 'todayCoin' | 'totalCorrect'

export interface RankingEntry {
  id: string
  name: string
  value: number
  isMe?: boolean
}

// ============================================================================
// 学習・演出のセッション結果（UIへ渡す値）
// ============================================================================

/** 1問回答時の判定＋報酬結果 */
export interface AnswerOutcome {
  correct: boolean
  correctAnswer: string
  gainedXp: number
  gainedCoin: number
  comboCount: number
  leveledUp: boolean
  newLevel: number
  unlockedAchievements: AchievementDef[]
}

/** バトル結果 */
export interface BattleResult {
  win: boolean
  myScore: number
  opponentScore: number
  opponentName: string
  myCorrect: number
  gainedCoin: number
  eloDelta: number
}
