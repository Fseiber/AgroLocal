-- Security fix R1 (auditoría 2026-11-01, severidad Alta):
-- accept_pending_invitations() aceptaba invitaciones solo porque el correo del JWT coincidía,
-- sin comprobar que ese correo estuviera confirmado. Si la confirmación de correo está desactivada
-- (o un proveedor no verifica correos), alguien podía registrarse con el correo invitado y
-- quedarse con la membresía (incluso el rol admin) de otra empresa.
-- Ahora el correo se lee de auth.users (fuente canónica) y se exige email_confirmed_at.
create or replace function public.accept_pending_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare _email text; _confirmed timestamptz; _n integer := 0; r record;
begin
  if auth.uid() is null then return 0; end if;
  select lower(u.email), u.email_confirmed_at into _email, _confirmed
    from auth.users u where u.id = auth.uid();
  if _email is null or _confirmed is null then return 0; end if;
  for r in select * from public.company_invitations
           where lower(email) = _email and accepted_at is null
           for update loop
    insert into public.company_members(company_id, user_id, role) values (r.company_id, auth.uid(), r.role)
      on conflict (company_id, user_id) do nothing;
    update public.company_invitations set accepted_at = now() where id = r.id;
    insert into public.audit_log(actor, action, entity, entity_id, data)
      values (auth.uid(), 'company.invitation_accept', 'company', r.company_id, jsonb_build_object('invitation', r.id, 'role', r.role));
    _n := _n + 1;
  end loop;
  return _n;
end $$;
revoke execute on function public.accept_pending_invitations() from public, anon;
grant execute on function public.accept_pending_invitations() to authenticated;
