<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Backend is Lovable Cloud; all business rules (verification, stock, permissions) live in Postgres RLS + SECURITY DEFINER RPCs, because clients talk to the DB directly and must not be trusted.
- Stock changes only via `apply_stock_movement` (row lock), never direct UPDATE; a trigger blocks direct edits of reserved/sold to prevent overselling.
- Company verification changes only via `set_company_verification` (platform admin from `user_roles`); a trigger reverts other edits.
- Quantities are stored in kg; bags/big bags require a per-unit weight (src/lib/domain.ts, tested in src/test/domain.test.ts).
- Public pages read companies through the `companies_public` view; contact data only via `get_company_contact` (verified companies).
- Both storage buckets are private (workspace blocks public buckets); photos are served with signed URLs; paths start with the company id.
- Demo rows carry `is_demo = true` and must stay distinguishable in the UI.
- WhatsApp assistant remains pending and requires credentials.
- Commercial operations use versioned seller proposals and buyer acceptance through RPCs; only accepted deliveries consume allocated reservations, preserving atomic stock locks.
- Operation documents use a separate private bucket and participant RLS; document-access RPC logs UI consultations before short-lived signed URLs are issued.
- Commission and document requirements are snapshotted on new agreements; admin configuration is audited and never silently changes confirmed commercial terms.
- Matching is computed live by the `match_pairs` SQL function (rule based: excluding requirements + listed matches/pending, never percentages).
- Opportunities are created only via `request_quote` (idempotent per open buyer+listing / seller+demand) and changed only via `set_opportunity_status`; each side records only its own agreement; opening WhatsApp is a wa.me link, not an API integration, and never moves stock.
- Backend end-to-end test: `NODE_PATH=node_modules bun scripts/e2e/agrolocal_e2e.ts` (creates and deletes its own test users/companies; needs SUPABASE_SERVICE_ROLE_KEY).
