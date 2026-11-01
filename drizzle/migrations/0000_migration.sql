
create type public.app_role as enum ('admin','user');
create type public.company_role as enum ('admin','operator','viewer');
create type public.verification_status as enum ('started','pending','info_requested','verified','rejected','suspended');
create type public.product_type as enum ('cascara','elaborado');
create type public.post_status as enum ('active','paused','closed');
create type public.quality_status as enum ('declared','documented','not_informed');
create type public.company_intent as enum ('sell','buy','both');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  cuit text not null unique check (cuit ~ '^[0-9]{11}$'),
  province text not null,
  locality text not null,
  activity_type text not null,
  intent public.company_intent not null default 'both',
  contact_phone text not null default '',
  contact_email text not null default '',
  verification_status public.verification_status not null default 'pending',
  verification_note text,
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role public.company_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
grant select, update, delete on public.company_members to authenticated;
grant all on public.company_members to service_role;
alter table public.company_members enable row level security;

create or replace function public.is_company_member(_company uuid, _min public.company_role default 'viewer') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = _company and m.user_id = auth.uid()
      and (case m.role when 'admin' then 3 when 'operator' then 2 else 1 end)
          >= (case _min when 'admin' then 3 when 'operator' then 2 else 1 end)
  )
$$;

create or replace function public.company_is_verified(_company uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies where id = _company and verification_status = 'verified')
$$;

create policy "members read company" on public.companies for select to authenticated
  using (public.is_company_member(id) or public.has_role(auth.uid(),'admin'));
create policy "company admin update" on public.companies for update to authenticated
  using (public.is_company_member(id,'admin'));

create policy "members read members" on public.company_members for select to authenticated
  using (public.is_company_member(company_id) or public.has_role(auth.uid(),'admin'));
create policy "company admin manage members" on public.company_members for update to authenticated
  using (public.is_company_member(company_id,'admin'));
create policy "company admin remove members" on public.company_members for delete to authenticated
  using (public.is_company_member(company_id,'admin') and user_id <> auth.uid());

create or replace function public.protect_company_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_setting('agrolocal.verify_op', true) = '1' then
    new.updated_at := now(); return new;
  end if;
  new.verification_status := old.verification_status;
  new.verification_note := old.verification_note;
  new.is_demo := old.is_demo;
  new.created_by := old.created_by;
  new.cuit := old.cuit;
  new.updated_at := now();
  return new;
end $$;
create trigger companies_protect before update on public.companies for each row execute function public.protect_company_fields();

create view public.companies_public as
  select id, name, province, locality, activity_type, verification_status, is_demo from public.companies;
grant select on public.companies_public to anon, authenticated;

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.company_role not null default 'viewer',
  created_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);
grant select, insert, delete on public.company_invitations to authenticated;
grant all on public.company_invitations to service_role;
alter table public.company_invitations enable row level security;
create policy "company admin read invites" on public.company_invitations for select to authenticated
  using (public.is_company_member(company_id,'admin'));
create policy "company admin create invites" on public.company_invitations for insert to authenticated
  with check (public.is_company_member(company_id,'admin') and created_by = auth.uid());
create policy "company admin delete invites" on public.company_invitations for delete to authenticated
  using (public.is_company_member(company_id,'admin'));

create or replace function public.accept_pending_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare _email text := lower(auth.jwt()->>'email'); _n integer := 0; r record;
begin
  if auth.uid() is null or _email is null then return 0; end if;
  for r in select * from public.company_invitations where lower(email) = _email and accepted_at is null loop
    insert into public.company_members(company_id, user_id, role) values (r.company_id, auth.uid(), r.role)
      on conflict (company_id, user_id) do nothing;
    update public.company_invitations set accepted_at = now() where id = r.id;
    _n := _n + 1;
  end loop;
  return _n;
end $$;

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  from_status public.verification_status,
  to_status public.verification_status not null,
  note text,
  actor uuid,
  created_at timestamptz not null default now()
);
grant select on public.verification_events to authenticated;
grant all on public.verification_events to service_role;
alter table public.verification_events enable row level security;
create policy "members or admin read events" on public.verification_events for select to authenticated
  using (public.is_company_member(company_id) or public.has_role(auth.uid(),'admin'));

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "admin read audit" on public.audit_log for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.register_company(
  _name text, _cuit text, _province text, _locality text, _activity text, _intent public.company_intent,
  _phone text, _email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if auth.uid() is null then raise exception 'Necesitás iniciar sesión'; end if;
  insert into public.companies(name, cuit, province, locality, activity_type, intent, contact_phone, contact_email, verification_status, created_by)
  values (trim(_name), _cuit, _province, trim(_locality), _activity, _intent, trim(_phone), lower(trim(_email)), 'pending', auth.uid())
  returning id into _id;
  insert into public.company_members(company_id, user_id, role) values (_id, auth.uid(), 'admin');
  insert into public.verification_events(company_id, from_status, to_status, note, actor) values (_id, null, 'pending', 'Registro enviado', auth.uid());
  insert into public.audit_log(actor, action, entity, entity_id) values (auth.uid(), 'company.register', 'company', _id);
  return _id;
exception when unique_violation then
  raise exception 'Ya existe una empresa registrada con ese CUIT';
end $$;

create or replace function public.set_company_verification(_company uuid, _status public.verification_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare _old public.verification_status;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Solo administradores de AgroLocal'; end if;
  if coalesce(trim(_note),'') = '' then raise exception 'Agregá una observación'; end if;
  select verification_status into _old from public.companies where id = _company for update;
  if not found then raise exception 'Empresa inexistente'; end if;
  perform set_config('agrolocal.verify_op','1', true);
  update public.companies set verification_status = _status, verification_note = _note where id = _company;
  perform set_config('agrolocal.verify_op','0', true);
  insert into public.verification_events(company_id, from_status, to_status, note, actor) values (_company, _old, _status, _note, auth.uid());
  insert into public.audit_log(actor, action, entity, entity_id, data) values (auth.uid(), 'company.verification', 'company', _company, jsonb_build_object('from',_old,'to',_status));
end $$;

create or replace function public.get_company_contact(_company uuid)
returns table(name text, contact_phone text, contact_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.company_members m join public.companies c on c.id = m.company_id
    where m.user_id = auth.uid() and c.verification_status = 'verified'
  ) and not public.has_role(auth.uid(),'admin') then
    raise exception 'Tu empresa debe estar verificada para ver contactos';
  end if;
  return query select c.name, c.contact_phone, c.contact_email from public.companies c where c.id = _company;
end $$;

create sequence public.listing_code_seq start 1001;
create sequence public.demand_code_seq start 1001;

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  product_type public.product_type not null,
  commercial_type text not null,
  variety text,
  subgroup text,
  presentation text not null default 'granel',
  unit_weight_kg numeric check (unit_weight_kg is null or unit_weight_kg > 0),
  unit_count numeric check (unit_count is null or unit_count > 0),
  original_unit text not null,
  original_quantity numeric not null check (original_quantity > 0),
  quantity_kg numeric not null check (quantity_kg > 0),
  min_sale_kg numeric check (min_sale_kg is null or min_sale_kg > 0),
  partial_allowed boolean not null default true,
  reserved_kg numeric not null default 0 check (reserved_kg >= 0),
  sold_kg numeric not null default 0 check (sold_kg >= 0),
  released_kg numeric not null default 0 check (released_kg >= 0),
  price numeric check (price is null or price >= 0),
  currency text not null default 'ARS' check (currency in ('ARS','USD')),
  price_unit text not null default 't',
  province text not null,
  locality text not null,
  available_from date,
  delivery_terms text,
  description text check (description is null or char_length(description) <= 2000),
  quality jsonb not null default '{}'::jsonb,
  quality_status public.quality_status not null default 'not_informed',
  status public.post_status not null default 'active',
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reserved_kg + sold_kg <= quantity_kg)
);
grant select on public.listings to anon;
grant select, insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;
alter table public.listings enable row level security;

create policy "public active listings" on public.listings for select to anon, authenticated
  using (status = 'active' and (is_demo or public.company_is_verified(company_id)));
create policy "members read own listings" on public.listings for select to authenticated
  using (public.is_company_member(company_id) or public.has_role(auth.uid(),'admin'));
create policy "operators create listings" on public.listings for insert to authenticated
  with check (public.is_company_member(company_id,'operator') and public.company_is_verified(company_id) and created_by = auth.uid() and is_demo = false);
create policy "operators update listings" on public.listings for update to authenticated
  using (public.is_company_member(company_id,'operator'));
create policy "operators delete listings" on public.listings for delete to authenticated
  using (public.is_company_member(company_id,'operator') and reserved_kg = 0 and sold_kg = 0);

create or replace function public.listings_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.code := 'OF-' || nextval('public.listing_code_seq');
    new.reserved_kg := 0; new.sold_kg := 0; new.released_kg := 0;
    if new.quality_status = 'documented' then new.quality_status := 'declared'; end if;
  else
    if current_setting('agrolocal.stock_op', true) is distinct from '1' then
      new.reserved_kg := old.reserved_kg; new.sold_kg := old.sold_kg; new.released_kg := old.released_kg;
      new.code := old.code; new.company_id := old.company_id; new.is_demo := old.is_demo; new.created_by := old.created_by;
      if new.quality_status = 'documented' and old.quality_status <> 'documented' then new.quality_status := old.quality_status; end if;
      if new.quantity_kg < old.reserved_kg + old.sold_kg then
        raise exception 'La cantidad no puede ser menor a lo reservado y vendido';
      end if;
    end if;
    new.updated_at := now();
  end if;
  if new.original_unit in ('bolsa','big_bag') and new.unit_weight_kg is null then
    raise exception 'Indicá el peso por bolsa o big bag';
  end if;
  return new;
end $$;
create trigger listings_bw before insert or update on public.listings for each row execute function public.listings_before_write();

create table public.demands (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  product_type public.product_type not null,
  commercial_type text not null,
  variety text,
  subgroup text,
  presentation text,
  original_unit text not null,
  original_quantity numeric not null check (original_quantity > 0),
  unit_weight_kg numeric check (unit_weight_kg is null or unit_weight_kg > 0),
  quantity_kg numeric not null check (quantity_kg > 0),
  min_quantity_kg numeric check (min_quantity_kg is null or min_quantity_kg > 0),
  province text not null,
  locality text not null,
  quality_requirements text check (quality_requirements is null or char_length(quality_requirements) <= 2000),
  target_price numeric check (target_price is null or target_price >= 0),
  currency text not null default 'ARS' check (currency in ('ARS','USD')),
  price_unit text not null default 't',
  needed_by date,
  delivery_terms text,
  description text check (description is null or char_length(description) <= 2000),
  status public.post_status not null default 'active',
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.demands to anon;
grant select, insert, update, delete on public.demands to authenticated;
grant all on public.demands to service_role;
alter table public.demands enable row level security;
create policy "public active demands" on public.demands for select to anon, authenticated
  using (status = 'active' and (is_demo or public.company_is_verified(company_id)));
create policy "members read own demands" on public.demands for select to authenticated
  using (public.is_company_member(company_id) or public.has_role(auth.uid(),'admin'));
create policy "operators create demands" on public.demands for insert to authenticated
  with check (public.is_company_member(company_id,'operator') and public.company_is_verified(company_id) and created_by = auth.uid() and is_demo = false);
create policy "operators update demands" on public.demands for update to authenticated
  using (public.is_company_member(company_id,'operator'));
create policy "operators delete demands" on public.demands for delete to authenticated
  using (public.is_company_member(company_id,'operator'));

create or replace function public.demands_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.code := 'DM-' || nextval('public.demand_code_seq');
  else
    new.code := old.code; new.company_id := old.company_id; new.is_demo := old.is_demo; new.created_by := old.created_by;
    new.updated_at := now();
  end if;
  if new.original_unit in ('bolsa','big_bag') and new.unit_weight_kg is null then
    raise exception 'Indicá el peso por bolsa o big bag';
  end if;
  return new;
end $$;
create trigger demands_bw before insert or update on public.demands for each row execute function public.demands_before_write();

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  kind text not null check (kind in ('reserve','sell','release','sell_direct')),
  quantity_kg numeric not null check (quantity_kg > 0),
  note text,
  actor uuid,
  created_at timestamptz not null default now()
);
grant select on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "members read movements" on public.stock_movements for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and (public.is_company_member(l.company_id) or public.has_role(auth.uid(),'admin'))));

create or replace function public.apply_stock_movement(_listing uuid, _kind text, _kg numeric, _note text default null)
returns public.listings language plpgsql security definer set search_path = public as $$
declare l public.listings; _available numeric;
begin
  if _kg is null or _kg <= 0 then raise exception 'La cantidad debe ser mayor a cero'; end if;
  select * into l from public.listings where id = _listing for update;
  if not found then raise exception 'Publicación inexistente'; end if;
  if not public.is_company_member(l.company_id,'operator') then raise exception 'No tenés permiso sobre esta publicación'; end if;
  _available := l.quantity_kg - l.reserved_kg - l.sold_kg;

  if _kind in ('reserve','sell_direct') then
    if _kg > _available then raise exception 'Stock insuficiente: disponible % kg', _available; end if;
    if not l.partial_allowed and _kg <> _available then raise exception 'Esta publicación no admite venta parcial'; end if;
    if l.min_sale_kg is not null and _kg < l.min_sale_kg and _kg <> _available then
      raise exception 'Cantidad menor a la mínima de venta (% kg)', l.min_sale_kg;
    end if;
  elsif _kind in ('sell','release') then
    if _kg > l.reserved_kg then raise exception 'Solo hay % kg reservados', l.reserved_kg; end if;
  else
    raise exception 'Movimiento inválido';
  end if;

  perform set_config('agrolocal.stock_op','1', true);
  update public.listings set
    reserved_kg = reserved_kg + case _kind when 'reserve' then _kg when 'sell' then -_kg when 'release' then -_kg else 0 end,
    sold_kg = sold_kg + case when _kind in ('sell','sell_direct') then _kg else 0 end,
    released_kg = released_kg + case _kind when 'release' then _kg else 0 end
  where id = _listing returning * into l;
  perform set_config('agrolocal.stock_op','0', true);

  insert into public.stock_movements(listing_id, kind, quantity_kg, note, actor) values (_listing, _kind, _kg, _note, auth.uid());
  insert into public.audit_log(actor, action, entity, entity_id, data) values (auth.uid(), 'stock.'||_kind, 'listing', _listing, jsonb_build_object('kg',_kg));
  return l;
end $$;

create table public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('photo','analysis','tech_sheet','other')),
  bucket text not null check (bucket in ('listing-photos','company-docs')),
  path text not null,
  file_name text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.listing_documents to anon;
grant select, insert, delete on public.listing_documents to authenticated;
grant all on public.listing_documents to service_role;
alter table public.listing_documents enable row level security;
create policy "public photos meta" on public.listing_documents for select to anon, authenticated
  using (bucket = 'listing-photos');
create policy "members read docs" on public.listing_documents for select to authenticated
  using (public.is_company_member(company_id) or public.has_role(auth.uid(),'admin'));
create policy "operators add docs" on public.listing_documents for insert to authenticated
  with check (public.is_company_member(company_id,'operator') and created_by = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.company_id = listing_documents.company_id)
    and split_part(path,'/',1) = company_id::text);
create policy "operators delete docs" on public.listing_documents for delete to authenticated
  using (public.is_company_member(company_id,'operator'));

create or replace function public.docs_mark_quality() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('analysis','tech_sheet') then
    perform set_config('agrolocal.stock_op','1', true);
    update public.listings set quality_status = 'documented' where id = new.listing_id;
    perform set_config('agrolocal.stock_op','0', true);
  end if;
  return new;
end $$;
create trigger docs_quality after insert on public.listing_documents for each row execute function public.docs_mark_quality();

create table public.units_config (
  code text primary key,
  label text not null,
  kg_factor numeric,
  needs_weight boolean not null default false,
  sort integer not null default 0
);
grant select on public.units_config to anon, authenticated;
grant all on public.units_config to service_role;
alter table public.units_config enable row level security;
create policy "units public" on public.units_config for select to anon, authenticated using (true);
insert into public.units_config values
 ('kg','Kilogramos',1,false,1),('qq','Quintales (100 kg)',100,false,2),('t','Toneladas',1000,false,3),
 ('bolsa','Bolsas',null,true,4),('big_bag','Big bags',null,true,5);

-- Storage policies (path = <company_id>/<listing_id>/<file>)
create policy "photos readable by all" on storage.objects for select to anon, authenticated
  using (bucket_id = 'listing-photos');
create policy "operators upload photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and public.is_company_member(((storage.foldername(name))[1])::uuid, 'operator'));
create policy "operators delete photos" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and public.is_company_member(((storage.foldername(name))[1])::uuid, 'operator'));
create policy "members read docs files" on storage.objects for select to authenticated
  using (bucket_id = 'company-docs' and (public.is_company_member(((storage.foldername(name))[1])::uuid) or public.has_role(auth.uid(),'admin')));
create policy "operators upload docs files" on storage.objects for insert to authenticated
  with check (bucket_id = 'company-docs' and public.is_company_member(((storage.foldername(name))[1])::uuid, 'operator'));
create policy "operators delete docs files" on storage.objects for delete to authenticated
  using (bucket_id = 'company-docs' and public.is_company_member(((storage.foldername(name))[1])::uuid, 'operator'));

-- Demo data (clearly marked is_demo)
insert into public.companies(id, name, cuit, province, locality, activity_type, intent, verification_status, is_demo)
values ('00000000-0000-0000-0000-0000000000d1','Molino Demo S.A.','30000000001','Corrientes','Mercedes','Molino arrocero','both','verified',true),
       ('00000000-0000-0000-0000-0000000000d2','Distribuidora Demo','30000000002','Chaco','Resistencia','Distribuidor','buy','verified',true);

insert into public.listings(company_id, product_type, commercial_type, variety, subgroup, presentation, unit_weight_kg, unit_count, original_unit, original_quantity, quantity_kg, min_sale_kg, currency, price_unit, province, locality, delivery_terms, quality, quality_status, is_demo)
values
('00000000-0000-0000-0000-0000000000d1','cascara','Largo fino','Gurí INTA CL',null,'granel',null,null,'t',120,120000,10000,'ARS','t','Corrientes','Mercedes','Retira el comprador','{"humedad":"14"}','declared',true),
('00000000-0000-0000-0000-0000000000d1','elaborado','Largo fino',null,'pulido','bolsas',25,2000,'bolsa',2000,50000,5000,'ARS','t','Corrientes','Mercedes','Entrega a convenir','{}','not_informed',true);

insert into public.demands(company_id, product_type, commercial_type, original_unit, original_quantity, quantity_kg, province, locality, quality_requirements, is_demo)
values ('00000000-0000-0000-0000-0000000000d2','elaborado','Largo fino','t',50,50000,'Chaco','Resistencia','Grado 00 o superior, bolsas de 25 kg',true);
