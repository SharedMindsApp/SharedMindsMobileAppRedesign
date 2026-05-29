-- credit_invites — the stub-and-claim growth loop for work credits.
--
-- Slice 4 let you tag existing members. This lets you credit someone who isn't
-- on SharedMinds yet: a minimal stub (name + email) + a shareable invite link.
-- When they sign up and open the link, they CLAIM the stub — it links to their
-- new account and shows in their "confirm your credits" inbox.
--
-- Consent-careful by design:
--   • Minimal data — name + email only, supplied by the tagger.
--   • No automated email blast — the tagger shares the link themselves (avoids
--     unsolicited mail / deliverability / consent-email law). A notification
--     email is a deliberate later decision, not a default.
--   • Unclaimed stubs are NEVER public — RLS only exposes them to the owner
--     until claimed AND confirmed (the existing wcc read policy already gates
--     on collaborator_user_id / status='confirmed', and a null collaborator
--     with status<>'confirmed' is owner-only).

alter table public.work_credit_collaborators
  alter column collaborator_user_id drop not null;

alter table public.work_credit_collaborators
  add column if not exists invited_email text,
  add column if not exists invited_name  text,
  add column if not exists invite_token   text,
  add column if not exists claimed_at     timestamptz;

-- One invite per email per credit (case-insensitive).
create unique index if not exists wcc_credit_email_idx
  on public.work_credit_collaborators (credit_id, lower(invited_email))
  where invited_email is not null;

create index if not exists wcc_token_idx on public.work_credit_collaborators (invite_token) where invite_token is not null;

-- Claim a credit invite: link the stub to the calling user, surface it in their
-- pending inbox to confirm. SECURITY DEFINER so the token lookup bypasses RLS;
-- returns enough context to show "X credited you on Y".
create or replace function public.claim_credit_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.work_credit_collaborators;
  v_credit public.work_credits;
  v_owner_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_row from public.work_credit_collaborators
    where invite_token = p_token;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.owner_user_id = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'own_credit');
  end if;
  if v_row.collaborator_user_id is not null and v_row.collaborator_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  update public.work_credit_collaborators
    set collaborator_user_id = v_uid,
        claimed_at = now()
    where id = v_row.id;

  select * into v_credit from public.work_credits where id = v_row.credit_id;
  select display_name into v_owner_name from public.profiles where id = v_row.owner_user_id;

  return jsonb_build_object(
    'ok', true,
    'collaborator_id', v_row.id,
    'credit_title', coalesce(v_credit.title, 'a project'),
    'credit_role', v_credit.role,
    'owner_name', coalesce(v_owner_name, 'A member')
  );
end;
$$;

grant execute on function public.claim_credit_invite(text) to authenticated;
