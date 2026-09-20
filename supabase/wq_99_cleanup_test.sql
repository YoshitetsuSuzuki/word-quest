-- 疎通確認で作成した検証用アカウントの削除（2026-09-20 実施分）
-- 本番ユーザーには影響しない。フレンドコードで特定して消す。
-- auth.users を消せば wq_* は on delete cascade で連鎖削除される。

delete from auth.users
where id in (
    select id from public.wq_profiles
    where friend_code in ('TESTAAA2', 'TESTBBB3', '74JBZAH6')
);

-- 確認: 0件になっていればよい
select friend_code, display_name from public.wq_profiles
where friend_code in ('TESTAAA2', 'TESTBBB3', '74JBZAH6');
