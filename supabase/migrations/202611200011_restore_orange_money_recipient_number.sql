insert into public.config(cle,valeur)
values ('orange','+243848775992')
on conflict (cle) do update set valeur=excluded.valeur;