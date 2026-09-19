-- ちりつも単語 フレンド機能: RPC（wq_01_schema.sql の後に実行する）
--
-- 他人の行を読むのはこのファイルの SECURITY DEFINER 関数だけ。
-- どの関数も「相手がフレンドであること」を必ず確認してから値を返す。

-- ============================================================
-- wq_upsert_profile: 自分の公開値を登録・更新
-- ============================================================
create or replace function public.wq_upsert_profile(
    p_display_name    text,
    p_friend_code     text,
    p_streak          int,
    p_weekly_words    int,
    p_last_study_date date,
    p_category        text
) returns void
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;
    insert into public.wq_profiles as t
        (id, display_name, friend_code, streak, weekly_words, last_study_date, category, updated_at)
    values
        (auth.uid(), p_display_name, p_friend_code, greatest(p_streak, 0), greatest(p_weekly_words, 0),
         p_last_study_date, coalesce(p_category, 'english'), now())
    on conflict (id) do update set
        display_name    = excluded.display_name,
        streak          = excluded.streak,
        weekly_words    = excluded.weekly_words,
        last_study_date = excluded.last_study_date,
        category        = excluded.category,
        updated_at      = now();
        -- friend_code は初回登録の値を保持する（友達に配った後で変わると困るため）
end $$;

-- ============================================================
-- wq_lookup_by_code: コードから相手を探す
-- 見つかった相手の「表示名だけ」を返す。学習状況はフレンドになるまで見せない。
-- ============================================================
create or replace function public.wq_lookup_by_code(p_code text)
returns table (user_id uuid, display_name text)
language sql security definer set search_path = public as $$
    select p.id, p.display_name
    from public.wq_profiles p
    where p.friend_code = upper(p_code)
      and p.id <> auth.uid()
    limit 1;
$$;

-- ============================================================
-- wq_add_friend: 双方向に登録する
-- 片方向だけだと「相手の一覧に自分が出ない」状態になり、つつきも届かないため。
-- ============================================================
create or replace function public.wq_add_friend(p_friend uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;
    if p_friend = auth.uid() then
        raise exception 'cannot add yourself';
    end if;
    if not exists (select 1 from public.wq_profiles where id = p_friend) then
        raise exception 'no such user';
    end if;
    insert into public.wq_friendships (user_id, friend_id)
    values (auth.uid(), p_friend), (p_friend, auth.uid())
    on conflict do nothing;
end $$;

-- ============================================================
-- wq_remove_friend: 双方向に解除する
-- ============================================================
create or replace function public.wq_remove_friend(p_friend uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
    delete from public.wq_friendships
    where (user_id = auth.uid() and friend_id = p_friend)
       or (user_id = p_friend and friend_id = auth.uid());
end $$;

-- ============================================================
-- wq_friends: フレンド一覧（各人の最新値つき）
-- ============================================================
create or replace function public.wq_friends()
returns table (
    user_id uuid, display_name text, streak int,
    weekly_words int, last_study_date date, category text
)
language sql security definer set search_path = public as $$
    select p.id, p.display_name, p.streak, p.weekly_words, p.last_study_date, p.category
    from public.wq_friendships f
    join public.wq_profiles p on p.id = f.friend_id
    where f.user_id = auth.uid()
    order by p.streak desc, p.weekly_words desc;
$$;

-- ============================================================
-- wq_send_nudge: つつく（フレンドのみ・1日1回）
-- 1日1回は unique 制約で担保し、二重送信は静かに無視する。
-- ============================================================
create or replace function public.wq_send_nudge(p_to uuid, p_day date)
returns void
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;
    if not exists (
        select 1 from public.wq_friendships
        where user_id = auth.uid() and friend_id = p_to
    ) then
        raise exception 'not a friend';
    end if;
    insert into public.wq_nudges (from_id, to_id, nudge_day)
    values (auth.uid(), p_to, p_day)
    on conflict (from_id, to_id, nudge_day) do nothing;
end $$;

-- ============================================================
-- wq_pending_nudges: 未受取のつつきの送り主（表示名）
-- ============================================================
create or replace function public.wq_pending_nudges()
returns table (display_name text)
language sql security definer set search_path = public as $$
    select coalesce(p.display_name, 'ななしさん')
    from public.wq_nudges n
    left join public.wq_profiles p on p.id = n.from_id
    where n.to_id = auth.uid() and n.claimed = false
    order by n.created_at desc;
$$;

-- ============================================================
-- wq_claim_nudges: 受け取る。受け取った件数を返す（コイン付与はアプリ側）
-- ============================================================
create or replace function public.wq_claim_nudges()
returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
    update public.wq_nudges
    set claimed = true
    where to_id = auth.uid() and claimed = false;
    get diagnostics n = row_count;
    return n;
end $$;

-- ============================================================
-- 実行権限（匿名認証のユーザーが呼べるようにする）
-- ============================================================
grant execute on function public.wq_upsert_profile(text, text, int, int, date, text) to anon, authenticated;
grant execute on function public.wq_lookup_by_code(text)  to anon, authenticated;
grant execute on function public.wq_add_friend(uuid)      to anon, authenticated;
grant execute on function public.wq_remove_friend(uuid)   to anon, authenticated;
grant execute on function public.wq_friends()             to anon, authenticated;
grant execute on function public.wq_send_nudge(uuid, date) to anon, authenticated;
grant execute on function public.wq_pending_nudges()      to anon, authenticated;
grant execute on function public.wq_claim_nudges()        to anon, authenticated;
