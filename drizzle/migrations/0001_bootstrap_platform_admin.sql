create or replace function public.grant_bootstrap_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and lower(new.email) = 'joelg.vallone@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.grant_bootstrap_admin() from public, anon, authenticated;

create trigger on_auth_user_created_bootstrap_admin
after insert on auth.users for each row execute function public.grant_bootstrap_admin();

create trigger on_auth_user_confirmed_bootstrap_admin
after update of email_confirmed_at on auth.users for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_bootstrap_admin();