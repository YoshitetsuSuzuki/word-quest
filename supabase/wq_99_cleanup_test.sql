-- 疎通確認・撮影で作成した検証用アカウントの削除（2026-09-20 実施分）
-- 本番ユーザーには影響しない。auth.users を消せば wq_* は cascade で連鎖削除される。

-- ① プロフィールを持つ検証アカウント
delete from auth.users
where id in (
    select id from public.wq_profiles
    where friend_code in (
        'TESTAAA2',  -- 疎通確認 検証A
        'TESTBBB3',  -- 疎通確認 検証B
        '74JBZAH6',  -- ブラウザ疎通確認
        'XPK95YPP',  -- シミュレータ撮影用（ハル）
        'MKDEM234',  -- 撮影用 みき
        'TKDEM345',  -- 撮影用 たくや
        'SRDEM456'   -- 撮影用 Sara
    )
);

-- ② プロフィール登録に失敗した孤児アカウント
-- フレンドコードに 0/O/1/I を含めてしまい check 制約で弾かれた分。
-- プロフィールが無いのに wq_friendships の行だけ残っている。
delete from auth.users u
where u.is_anonymous
  and not exists (select 1 from public.wq_profiles p where p.id = u.id)
  and exists (select 1 from public.wq_friendships f where f.user_id = u.id);

-- 確認: いずれも 0 件になっていればよい
select count(*) as 残存プロフィール from public.wq_profiles
where friend_code in ('TESTAAA2','TESTBBB3','74JBZAH6','XPK95YPP','MKDEM234','TKDEM345','SRDEM456');
select count(*) as 孤児フレンド行 from public.wq_friendships f
where not exists (select 1 from public.wq_profiles p where p.id = f.user_id);
