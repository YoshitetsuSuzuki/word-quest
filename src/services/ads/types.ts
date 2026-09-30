// ============================================================================
// 広告プロバイダの「口」。広告会社1社ぶんの契約をここで定義する。
//
//   画面 ──► AdService ──► AdProvider（AdMob / maio / LevelPlay / Noop）──► 各社SDK
//
// 姉妹アプリ PawPlanet の `Ads/AdProvider.swift` と対応させてある。
// 広告会社を替えるときに触るのは、プロバイダ1ファイルと AdService の選択1か所だけ。
//
// 取り決め（PawPlanet と同じ）:
//  - すべての show は必ず有限時間で返る。待たせ続けない
//  - 失敗は throw せず AdOutcome で返す。広告のために例外を撒かない
//  - 未初期化で呼ばれても落ちない。初期化は各実装の内部で面倒を見る
// ============================================================================

/** 広告の種類。画面側はこの3つしか知らなくてよい。 */
export type AdFormat = 'banner' | 'interstitial' | 'rewarded'

/** 広告表示の結末。計測とUIの出し分けに使う。 */
export type AdOutcome =
  /** 最後まで見て報酬を得た（リワード）／全画面が表示されて閉じられた */
  | 'completed'
  /** 広告は出たが、報酬の条件を満たす前に閉じられた */
  | 'dismissedEarly'
  /** そもそも広告を出せなかった（在庫なし・未承認・オフライン・タイムアウト） */
  | 'unavailable'

export interface AdProvider {
  /** 計測とデバッグ表示で使う識別子（'admob' / 'maio' / 'levelplay' / 'none'）。 */
  readonly id: string

  /** この端末・このビルドで実際に広告を出しうるか。UIの広告導線の表示判定に使う。 */
  isAvailable(): boolean

  /** 起動時に一度だけ呼ばれる。失敗しても投げず、静かに使用不可のままにする。 */
  init(): Promise<void>

  /** リワード動画を出す。出せなければ 'unavailable' を返す。 */
  showRewarded(): Promise<AdOutcome>

  /** 全画面広告を出す。出せなければ 'unavailable' を返す。 */
  showInterstitial(): Promise<AdOutcome>

  /** バナー。対応しないプロバイダは実装しない（このアプリは現状バナー未使用）。 */
  showBanner?(): Promise<void>
  hideBanner?(): Promise<void>
}

/** 広告SDKが無い・使えない・止められているときの受け皿＝フェイルセーフの土台。 */
export const NoopAdProvider: AdProvider = {
  id: 'none',
  isAvailable: () => false,
  init: async () => {},
  showRewarded: async () => 'unavailable',
  showInterstitial: async () => 'unavailable',
}
