import type { FriendsBackend, MyProfile } from './friendBackend'
import type { FriendEntry } from './friendTypes'
import type { Category } from '../../types'

/**
 * Supabase 実装。SDK は入れず REST / Auth を直接叩く。
 * 理由: 依存を増やさずに済むのと、PawPlanet で Swift SDK の解決に苦労した経験から、
 * この程度の用途なら fetch で十分だと判断した。
 *
 * 認証は匿名サインインのみ。メールもパスワードも扱わないので、
 * ユーザーに個人情報の入力を求めることがない。
 */

/** 接続先。publishable キーはクライアント埋め込み前提の公開キーで、保護は RLS が担う */
export const SUPABASE_URL = 'https://pprkgpgjwgrmxslghpvo.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_I8GUJKUXjkYJ7o6avDbxGw_Hhb-KjJ7'

const TOKEN_KEY = 'wordquest.friends.sb'

interface Session {
  access_token: string
  refresh_token: string
  /** 失効時刻（ミリ秒）。少し手前で更新する */
  expires_at: number
  user_id: string
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function saveSession(s: Session): void {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(s))
  } catch {
    // 保存できないと毎回サインインし直しになるが、動作自体は続く
  }
}

function toSession(json: {
  access_token: string
  refresh_token: string
  expires_in: number
  user: { id: string }
}): Session {
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
    user_id: json.user.id,
  }
}

export class SupabaseFriendsBackend implements FriendsBackend {
  private session: Session | null = loadSession()

  /** 匿名サインイン。既にセッションがあれば使い回し、期限が近ければ更新する */
  private async auth(): Promise<Session> {
    const s = this.session
    if (s && s.expires_at - Date.now() > 60_000) return s
    if (s) {
      const refreshed = await this.refresh(s.refresh_token)
      if (refreshed) return refreshed
    }
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    })
    if (!res.ok) throw new Error(`signup failed: ${res.status}`)
    const next = toSession(await res.json())
    this.session = next
    saveSession(next)
    return next
  }

  private async refresh(token: string): Promise<Session | null> {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: token }),
      })
      if (!res.ok) return null
      const next = toSession(await res.json())
      this.session = next
      saveSession(next)
      return next
    } catch {
      return null
    }
  }

  /** RPC を1本呼ぶ */
  private async rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const s = await this.auth()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${s.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`)
    const text = await res.text()
    return (text ? JSON.parse(text) : null) as T
  }

  async join(p: MyProfile): Promise<string> {
    const s = await this.auth()
    await this.publish(p)
    return s.user_id
  }

  async publish(p: MyProfile): Promise<void> {
    await this.rpc('wq_upsert_profile', {
      p_display_name: p.displayName,
      p_friend_code: p.friendCode,
      p_streak: p.streak,
      p_weekly_words: p.weeklyWords,
      p_last_study_date: p.lastStudyDate || null,
      p_category: p.category,
    })
  }

  async listFriends(): Promise<FriendEntry[]> {
    const rows = await this.rpc<
      { user_id: string; display_name: string; streak: number; weekly_words: number; last_study_date: string | null; category: string }[]
    >('wq_friends')
    return (rows ?? []).map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      streak: r.streak,
      weeklyWords: r.weekly_words,
      lastStudyDate: r.last_study_date ?? '',
      category: r.category as Category,
    }))
  }

  async lookupByCode(code: string): Promise<FriendEntry | null> {
    const rows = await this.rpc<{ user_id: string; display_name: string }[]>('wq_lookup_by_code', { p_code: code })
    const r = rows?.[0]
    if (!r) return null
    // 学習状況はフレンドになるまで返さない設計なので、0 で埋めておく
    return { userId: r.user_id, displayName: r.display_name, streak: 0, weeklyWords: 0, lastStudyDate: '', category: 'english' }
  }

  async addFriend(userId: string): Promise<void> {
    await this.rpc('wq_add_friend', { p_friend: userId })
  }

  async removeFriend(userId: string): Promise<void> {
    await this.rpc('wq_remove_friend', { p_friend: userId })
  }

  async sendNudge(toUserId: string, day: string): Promise<void> {
    await this.rpc('wq_send_nudge', { p_to: toUserId, p_day: day })
  }

  async pendingNudges(): Promise<{ fromNames: string[] }> {
    const rows = await this.rpc<{ display_name: string }[]>('wq_pending_nudges')
    return { fromNames: (rows ?? []).map((r) => r.display_name) }
  }

  async claimNudges(): Promise<number> {
    const n = await this.rpc<number>('wq_claim_nudges')
    return typeof n === 'number' ? n : 0
  }
}
