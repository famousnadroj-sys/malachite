with ranked as (
 select p.id,p.user_id,row_number() over(partition by p.user_id order by coalesce(p.reviewed_at,p.created_at) desc,p.id desc) as rn
 from public.paiements p where p.offre='Premium' and p.statut='valide' and p.entitlement_expires_at is null
)
update public.paiements p
set entitlement_starts_at=coalesce(p.reviewed_at,p.created_at),
    entitlement_expires_at=coalesce(s.premium_until,coalesce(p.reviewed_at,p.created_at)+interval '30 days')
from ranked r left join public.statuts s on s.user_id=r.user_id
where p.id=r.id and r.rn=1;
update public.paiements p set expiry_notified_at=coalesce(p.expiry_notified_at,now())
where p.offre='Premium' and p.statut='valide' and p.entitlement_expires_at is null;
