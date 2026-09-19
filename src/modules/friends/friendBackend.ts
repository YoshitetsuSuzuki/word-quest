import type { FriendEntry } from './friendTypes'

/**
 * フレンド機能のサーバー側。段階2で Supabase 実装に差し替えるため、
 * 画面はこのインターフェースだけに依存させる。
 */
export interface FriendsBackend {
  /** ランキング参加（匿名サインイン＋プロフィール登録）。自分のuserIdを返す */
  join(profile: MyProfile): Promise<string>
  /** 自分の最新値を送る（学習のたびに呼ぶのではなく、画面を開いたときで十分） */
  publish(profile: MyProfile): Promise<void>
  /** フレンド一覧（各人の最新値つき） */
  listFriends(): Promise<FriendEntry[]>
  /** コードから相手を探す。見つからなければ null */
  lookupByCode(code: string): Promise<FriendEntry | null>
  addFriend(userId: string): Promise<void>
  removeFriend(userId: string): Promise<void>
  /** つつく（1日1回はサーバー側の unique 制約で担保する） */
  sendNudge(toUserId: string, day: string): Promise<void>
  /** 受け取っていないつつき */
  pendingNudges(): Promise<{ fromNames: string[] }>
  /** つつきを受け取る（コイン付与はアプリ側） */
  claimNudges(): Promise<number>
}

/** サーバーへ送る自分の公開情報 */
export interface MyProfile {
  userId: string
  displayName: string
  friendCode: string
  streak: number
  weeklyWords: number
  lastStudyDate: string
  category: string
}

/**
 * 端末内だけで完結する実装。サーバー未接続でも画面が一通り動く。
 * 他人とはつながらないので、フレンドは端末内に保存された行しか見えない。
 */
export class LocalFriendsBackend implements FriendsBackend {
  private key = 'wordquest.friends.local'
  private read(): { friends: FriendEntry[]; nudges: string[] } {
    try {
      const raw = localStorage.getItem(this.key)
      if (raw) return JSON.parse(raw) as { friends: FriendEntry[]; nudges: string[] }
    } catch {
      // 壊れていたら初期値に戻す
    }
    return { friends: [], nudges: [] }
  }
  private write(v: { friends: FriendEntry[]; nudges: string[] }): void {
    try { localStorage.setItem(this.key, JSON.stringify(v)) } catch { /* 容量超過などは無視 */ }
  }
  async join(p: MyProfile): Promise<string> { return p.userId }
  async publish(): Promise<void> { /* 端末内なので何もしない */ }
  async listFriends(): Promise<FriendEntry[]> { return this.read().friends }
  async lookupByCode(): Promise<FriendEntry | null> { return null } // 端末内では他人を探せない
  async addFriend(): Promise<void> { /* 同上 */ }
  async removeFriend(userId: string): Promise<void> {
    const v = this.read(); v.friends = v.friends.filter((f) => f.userId !== userId); this.write(v)
  }
  async sendNudge(): Promise<void> { /* 相手がいないので何もしない */ }
  async pendingNudges(): Promise<{ fromNames: string[] }> { return { fromNames: this.read().nudges } }
  async claimNudges(): Promise<number> {
    const v = this.read(); const n = v.nudges.length; v.nudges = []; this.write(v); return n
  }
}
