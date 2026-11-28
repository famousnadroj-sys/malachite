-- Support updates are admin-only and the shipped admin UI changes only these fields.
-- Keep the row-level support_admin_update policy as the authorization boundary.
revoke update on table public.demandes_support from authenticated;
grant update (statut, reponse_admin, traite_par, traite_le)
  on table public.demandes_support to authenticated;
