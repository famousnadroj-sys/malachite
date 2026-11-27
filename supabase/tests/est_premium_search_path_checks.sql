do $test$
declare p record;
begin
 select prosecdef,proconfig,has_function_privilege('anon',oid,'execute') anon_exec,
        has_function_privilege('authenticated',oid,'execute') auth_exec
 into p from pg_proc where oid='public.est_premium(uuid)'::regprocedure;
 if not p.prosecdef then raise exception 'est_premium_must_remain_security_definer'; end if;
 if not ('search_path=""'=any(p.proconfig)) then raise exception 'est_premium_search_path_not_empty'; end if;
 if p.anon_exec or p.auth_exec then raise exception 'est_premium_client_execute_grant_changed'; end if;
 if public.est_premium(null) is distinct from false then raise exception 'null_user_must_not_be_premium'; end if;
end
$test$;
