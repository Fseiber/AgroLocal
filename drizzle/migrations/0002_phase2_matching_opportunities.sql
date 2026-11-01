
-- Server-side CUIT check digit validation (Phase 1 fix)
create or replace function public.is_valid_cuit(_c text) returns boolean
language plpgsql immutable set search_path = public as $$
declare w int[] := array[5,4,3,2,7,6,5,4,3,2]; s int := 0; chk int;
begin
  if _c is null or _c !~ '^[0-9]{11}$' then return false; end if;
  for i in 1..10 loop s := s + w[i] * substr(_c,i,1)::int; end loop;
  chk := 11 - (s % 11);
  if chk = 11 then chk := 0; end if;
  if chk = 10 then return false; end if;
  return chk = substr(_c,11,1)::int;
end $$;

create or replace function public.register_company(
  _name text, _cuit text, _province text, _locality text, _activity text, _intent public.company_intent,
  _phone text, _email text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  if auth.uid() is null then raise exception 'Necesitás iniciar sesión'; end if;
  if not public.is_valid_cuit(_cuit) then raise exception 'CUIT inválido: revisá los 11 números'; end if;
  if exists (select 1 from public.company_members where user_id = auth.uid() and role = 'admin') then
    raise exception 'Ya administrás una empresa registrada';
  end if;
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

-- ===== Matching (rule based, computed on demand so it always reflects current stock) =====
create or replace function public.match_pairs(_listing uuid default null, _demand uuid default null)
returns table(listing_id uuid, demand_id uuid, seller_company_id uuid, buyer_company_id uuid,
              available_kg numeric, wanted_kg numeric, matches text[], pending text[], rank int)
language sql stable security invoker set search_path = public as $$
  with pairs as (
    select l.*, d.id as d_id, d.company_id as d_company, d.quantity_kg as d_qty, d.min_quantity_kg as d_min,
           d.variety as d_variety, d.subgroup as d_subgroup, d.presentation as d_presentation, d.province as d_province,
           d.target_price as d_price, d.currency as d_currency, d.needed_by as d_needed, d.quality_requirements as d_quality,
           d.delivery_terms as d_delivery,
           (l.quantity_kg - l.reserved_kg - l.sold_kg) as avail
    from public.listings l
    join public.demands d on d.product_type = l.product_type and d.commercial_type = l.commercial_type
    where l.status = 'active' and d.status = 'active'
      and l.company_id <> d.company_id
      and l.is_demo = d.is_demo
      and (_listing is null or l.id = _listing)
      and (_demand is null or d.id = _demand)
  )
  select p.id, p.d_id, p.company_id, p.d_company, p.avail, p.d_qty,
    array_remove(array[
      'Mismo producto y tipo comercial',
      case when p.d_variety is not null and lower(p.d_variety) = lower(coalesce(p.variety,'')) then 'Variedad: ' || p.variety end,
      case when p.avail >= p.d_qty then 'La cantidad disponible cubre lo buscado'
           else 'Cubre parcialmente lo buscado (' || round(p.avail/1000,2) || ' t disponibles)' end,
      case when p.d_presentation is not null then 'Presentación: ' || p.presentation end,
      case when p.d_subgroup is not null then 'Subgrupo: ' || p.subgroup end,
      case when p.province = p.d_province then 'Misma provincia (' || p.province || ')' end,
      case when p.price is not null and p.d_price is not null and p.currency = p.d_currency and p.price <= p.d_price then 'Precio dentro del objetivo' end,
      case when p.quality_status = 'documented' then 'Calidad respaldada con documento' end
    ], null),
    array_remove(array[
      case when p.d_variety is null then null when p.variety is null then 'Variedad no informada por el vendedor' end,
      case when p.d_quality is not null and p.quality_status <> 'documented' then 'Confirmar calidad requerida' end,
      case when p.quality_status = 'not_informed' then 'Calidad no informada' end,
      case when p.province <> p.d_province then 'Logística entre ' || p.province || ' y ' || p.d_province end,
      case when p.price is null or p.d_price is null or p.currency <> p.d_currency then 'Precio final a negociar' end,
      case when p.price is not null and p.d_price is not null and p.currency = p.d_currency and p.price > p.d_price then 'Precio publicado supera el objetivo' end,
      'Condiciones de entrega'
    ], null),
    ( (case when p.province = p.d_province then 2 else 0 end)
    + (case when p.quality_status = 'documented' then 1 else 0 end)
    + (case when p.avail >= p.d_qty then 2 else 0 end)
    + (case when p.price is not null and p.d_price is not null and p.price <= p.d_price then 1 else 0 end) )
  from pairs p
  where
    -- excluding requirements
    (p.d_variety is null or p.variety is null or lower(p.d_variety) = lower(p.variety))
    and (p.d_subgroup is null or p.subgroup = p.d_subgroup)
    and (p.d_presentation is null or p.presentation = p.d_presentation)
    and p.avail > 0
    and p.avail >= coalesce(p.d_min, case when p.partial_allowed then 0 else p.d_qty end)
    and (p.min_sale_kg is null or p.min_sale_kg <= p.d_qty or p.min_sale_kg >= p.avail)
    and (p.partial_allowed or p.d_qty >= p.avail)
    and (p.available_from is null or p.d_needed is null or p.available_from <= p.d_needed)
  order by 9 desc, p.created_at desc
  limit 100
$$;
grant execute on function public.match_pairs(uuid, uuid) to anon, authenticated;

-- ===== Opportunities =====
create type public.opportunity_status as enum ('contact_requested','negotiating','agreement_declared','cancelled');
create sequence public.opportunity_code_seq start 1001;

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('OP-' || nextval('public.opportunity_code_seq')),
  listing_id uuid references public.listings(id) on delete set null,
  demand_id uuid references public.demands(id) on delete set null,
  seller_company_id uuid not null references public.companies(id) on delete cascade,
  buyer_company_id uuid not null references public.companies(id) on delete cascade,
  initiator_company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid not null,
  quantity_kg numeric not null check (quantity_kg > 0),
  status public.opportunity_status not null default 'contact_requested',
  seller_declared_at timestamptz,
  buyer_declared_at timestamptz,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (listing_id is not null or demand_id is not null),
  check (seller_company_id <> buyer_company_id)
);
create unique index opportunities_open_listing_uniq on public.opportunities(buyer_company_id, listing_id)
  where listing_id is not null and demand_id is null and status in ('contact_requested','negotiating');
create unique index opportunities_open_demand_uniq on public.opportunities(seller_company_id, demand_id)
  where demand_id is not null and status in ('contact_requested','negotiating');
grant select on public.opportunities to authenticated;
grant all on public.opportunities to service_role;
alter table public.opportunities enable row level security;
create policy "parties read opportunities" on public.opportunities for select to authenticated
  using (public.is_company_member(seller_company_id) or public.is_company_member(buyer_company_id) or public.has_role(auth.uid(),'admin'));

create table public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  event text not null,
  from_status public.opportunity_status,
  to_status public.opportunity_status,
  note text check (note is null or char_length(note) <= 500),
  actor uuid,
  actor_company_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.opportunity_events to authenticated;
grant all on public.opportunity_events to service_role;
alter table public.opportunity_events enable row level security;
create policy "parties read events" on public.opportunity_events for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and
    (public.is_company_member(o.seller_company_id) or public.is_company_member(o.buyer_company_id) or public.has_role(auth.uid(),'admin'))));

-- Request a quote (buyer on a listing, or seller offering against a demand). Idempotent.
create or replace function public.request_quote(_company uuid, _listing uuid, _demand uuid, _kg numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.listings; d public.demands; _seller uuid; _buyer uuid; _avail numeric; o public.opportunities;
        _phone text; _counter uuid; _existing boolean := false;
begin
  if auth.uid() is null then raise exception 'Necesitás iniciar sesión'; end if;
  if not public.is_company_member(_company,'operator') then raise exception 'No tenés permiso comercial en esta empresa'; end if;
  if not public.company_is_verified(_company) then raise exception 'Tu empresa debe estar verificada'; end if;
  if _kg is null or _kg <= 0 then raise exception 'Indicá la cantidad a consultar'; end if;

  if _listing is not null then
    select * into l from public.listings where id = _listing;
    if not found or l.status <> 'active' then raise exception 'La publicación no está activa'; end if;
    if l.is_demo then raise exception 'Es una publicación de demostración'; end if;
    _seller := l.company_id; _buyer := _company; _counter := l.company_id;
    _avail := l.quantity_kg - l.reserved_kg - l.sold_kg;
    if _kg > _avail then raise exception 'La cantidad supera lo disponible (% kg)', _avail; end if;
    if not l.partial_allowed and _kg <> _avail then raise exception 'El vendedor solo vende el lote completo'; end if;
    if l.min_sale_kg is not null and _kg < l.min_sale_kg and _kg <> _avail then raise exception 'Mínimo de venta: % kg', l.min_sale_kg; end if;
  end if;
  if _demand is not null then
    select * into d from public.demands where id = _demand;
    if not found or d.status <> 'active' then raise exception 'La demanda no está activa'; end if;
    if d.is_demo then raise exception 'Es una demanda de demostración'; end if;
    if _listing is null then
      _seller := _company; _buyer := d.company_id; _counter := d.company_id;
      if _kg > d.quantity_kg then raise exception 'La cantidad supera lo buscado'; end if;
    elsif d.company_id <> _company then raise exception 'La demanda no pertenece a tu empresa';
    end if;
  end if;
  if _seller is null then raise exception 'Indicá una publicación o demanda'; end if;
  if _seller = _buyer then raise exception 'No podés consultar tu propia publicación'; end if;
  if not public.company_is_verified(_counter) then raise exception 'La otra empresa no está verificada'; end if;

  select * into o from public.opportunities
   where status in ('contact_requested','negotiating')
     and ((_listing is not null and listing_id = _listing and buyer_company_id = _buyer and (demand_id is null or _demand is not null))
       or (_listing is null and demand_id = _demand and seller_company_id = _seller))
   limit 1;
  if found then
    _existing := true;
  else
    begin
      insert into public.opportunities(listing_id, demand_id, seller_company_id, buyer_company_id, initiator_company_id, requested_by, quantity_kg, next_action)
      values (_listing, case when _listing is null then _demand else null end, _seller, _buyer, _company, auth.uid(), _kg, 'Responder la consulta por WhatsApp')
      returning * into o;
    exception when unique_violation then
      select * into o from public.opportunities where status in ('contact_requested','negotiating')
        and ((_listing is not null and listing_id = _listing and buyer_company_id = _buyer)
          or (_listing is null and demand_id = _demand and seller_company_id = _seller)) limit 1;
      _existing := true;
    end;
    if not _existing then
      insert into public.opportunity_events(opportunity_id, event, to_status, note, actor, actor_company_id)
      values (o.id, 'created', 'contact_requested', 'Cotización solicitada por ' || round(_kg/1000,3) || ' t', auth.uid(), _company);
      insert into public.audit_log(actor, action, entity, entity_id) values (auth.uid(), 'opportunity.create', 'opportunity', o.id);
    end if;
  end if;

  select contact_phone into _phone from public.companies where id = _counter;
  return jsonb_build_object('id', o.id, 'code', o.code, 'existing', _existing, 'phone', _phone, 'quantity_kg', o.quantity_kg);
end $$;

-- Status changes by either party; each side can only declare its own agreement.
create or replace function public.set_opportunity_status(_id uuid, _status public.opportunity_status, _note text default null)
returns public.opportunities language plpgsql security definer set search_path = public as $$
declare o public.opportunities; _side text; _company uuid;
begin
  select * into o from public.opportunities where id = _id for update;
  if not found then raise exception 'Oportunidad inexistente'; end if;
  if public.is_company_member(o.seller_company_id,'operator') then _side := 'seller'; _company := o.seller_company_id;
  elsif public.is_company_member(o.buyer_company_id,'operator') then _side := 'buyer'; _company := o.buyer_company_id;
  else raise exception 'No participás en esta oportunidad'; end if;

  if o.status = 'cancelled' then raise exception 'La oportunidad está cancelada'; end if;
  if not (
    (o.status = 'contact_requested' and _status in ('negotiating','cancelled','agreement_declared')) or
    (o.status = 'negotiating' and _status in ('agreement_declared','cancelled')) or
    (o.status = 'agreement_declared' and _status in ('agreement_declared','cancelled'))
  ) then raise exception 'Cambio de estado no permitido'; end if;

  update public.opportunities set
    status = _status,
    seller_declared_at = case when _status = 'agreement_declared' and _side = 'seller' then coalesce(seller_declared_at, now()) else seller_declared_at end,
    buyer_declared_at = case when _status = 'agreement_declared' and _side = 'buyer' then coalesce(buyer_declared_at, now()) else buyer_declared_at end,
    next_action = case _status
      when 'negotiating' then 'Acordar precio, calidad y entrega'
      when 'agreement_declared' then 'Esperar la confirmación de la otra parte'
      else null end,
    updated_at = now()
  where id = _id returning * into o;

  insert into public.opportunity_events(opportunity_id, event, from_status, to_status, note, actor, actor_company_id)
  values (_id, case when _status = 'agreement_declared' then _side || '_declared' else 'status' end, o.status, _status, nullif(trim(_note),''), auth.uid(), _company);
  return o;
end $$;

-- Company names of opportunity counterparts (only for parties)
create or replace function public.opportunity_parties(_id uuid)
returns table(seller_name text, buyer_name text, seller_phone text, buyer_phone text)
language plpgsql stable security definer set search_path = public as $$
declare o public.opportunities;
begin
  select * into o from public.opportunities where id = _id;
  if not found or not (public.is_company_member(o.seller_company_id) or public.is_company_member(o.buyer_company_id) or public.has_role(auth.uid(),'admin')) then
    raise exception 'Sin acceso';
  end if;
  return query select s.name, b.name, s.contact_phone, b.contact_phone
    from public.companies s, public.companies b where s.id = o.seller_company_id and b.id = o.buyer_company_id;
end $$;

revoke execute on function public.request_quote(uuid,uuid,uuid,numeric) from anon;
revoke execute on function public.set_opportunity_status(uuid, public.opportunity_status, text) from anon;
revoke execute on function public.opportunity_parties(uuid) from anon;
