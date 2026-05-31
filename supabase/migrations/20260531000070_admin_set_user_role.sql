-- admin_set_user_role — let admins change another user's role.
--
-- BUG this fixes: the admin Users page wrote the role with a direct
-- `update profiles set role = ...`. But the only UPDATE policy on profiles is
-- `profiles_update_self` (id = auth.uid()), so an admin editing ANOTHER user's
-- row matched zero rows — no error, no change. The UI then falsely reported
-- "Role updated". (Even self-edits are risky to allow directly, as that's a
-- privilege-escalation path.)
--
-- Fix: a SECURITY DEFINER function that verifies the caller is an admin via
-- is_admin(), validates the role, and updates the target. RLS is bypassed
-- safely because the admin check is explicit.

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;

  if new_role not in ('free', 'premium', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  update public.profiles
     set role = new_role, updated_at = now()
   where id = target_user_id;

  if not found then
    raise exception 'User % not found', target_user_id;
  end if;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
