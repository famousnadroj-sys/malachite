-- Defense in depth: private payment-review helpers must never be executable by anon/PUBLIC.
-- Authenticated execution is retained because the function independently checks private.is_admin().
begin;
revoke all on function private.traiter_paiement(bigint, boolean) from public, anon;
revoke all on function private.traiter_paiement(bigint, boolean, text) from public, anon;
grant execute on function private.traiter_paiement(bigint, boolean) to authenticated;
grant execute on function private.traiter_paiement(bigint, boolean, text) to authenticated;
commit;
