/**
 * ランキング用ダミーデータ。
 * MVPではローカル/ダミーで表示。将来 RankingRepository をSupabase実装に
 * 差し替えることでサーバーランキングへ移行できる。
 */
export interface MockPlayer {
  id: string
  name: string
  coin: number
  elo: number
  todayCoin: number
  totalCorrect: number
}

export const mockPlayers: MockPlayer[] = [
  { id: 'npc-1', name: 'Alice', coin: 1820, elo: 1450, todayCoin: 210, totalCorrect: 940 },
  { id: 'npc-2', name: 'Bob', coin: 1540, elo: 1380, todayCoin: 180, totalCorrect: 720 },
  { id: 'npc-3', name: 'Carol', coin: 1330, elo: 1520, todayCoin: 95, totalCorrect: 610 },
  { id: 'npc-4', name: 'Dave', coin: 1120, elo: 1290, todayCoin: 260, totalCorrect: 880 },
  { id: 'npc-5', name: 'Emi', coin: 980, elo: 1610, todayCoin: 140, totalCorrect: 530 },
  { id: 'npc-6', name: 'Frank', coin: 860, elo: 1210, todayCoin: 60, totalCorrect: 470 },
  { id: 'npc-7', name: 'Grace', coin: 740, elo: 1340, todayCoin: 175, totalCorrect: 420 },
  { id: 'npc-8', name: 'Hiro', coin: 620, elo: 1180, todayCoin: 40, totalCorrect: 360 },
  { id: 'npc-9', name: 'Ivy', coin: 510, elo: 1420, todayCoin: 120, totalCorrect: 300 },
  { id: 'npc-10', name: 'Ken', coin: 430, elo: 1100, todayCoin: 85, totalCorrect: 250 },
]

/** バトル相手候補（CPU/ダミー）。将来は近いElo同士でマッチング可能な設計。 */
export interface OpponentSeed {
  id: string
  name: string
  elo: number
  /** CPUの正答率(0-1)。Eloに応じてスコアを擬似生成する。 */
  accuracy: number
}

export const opponents: OpponentSeed[] = [
  { id: 'op-1', name: 'ルーキーくん', elo: 1050, accuracy: 0.55 },
  { id: 'op-2', name: 'アマチュア・ジョー', elo: 1200, accuracy: 0.65 },
  { id: 'op-3', name: 'ミドル・メグ', elo: 1350, accuracy: 0.72 },
  { id: 'op-4', name: 'エキスパート・レイ', elo: 1500, accuracy: 0.8 },
  { id: 'op-5', name: 'マスター・鴻', elo: 1700, accuracy: 0.88 },
]
