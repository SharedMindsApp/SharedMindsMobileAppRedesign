-- Members directory visibility
--
-- Up to this point profiles were only visible if you were the owner, an
-- admin, or the other user had an active/recent session. That works for
-- session cards but kills any "browse members" UX — most profiles are
-- invisible most of the time.
--
-- For the small founding network (10-20 users), let any authenticated user
-- view any profile's public fields. This matches the product's small-
-- private-community design — everyone is meant to be discoverable. When
-- the network grows past the founding cohort we can layer in privacy
-- toggles per profile.
--
-- The other profile RLS policies (self, recent-session-owners, admin)
-- remain in place as belt-and-suspenders.

create policy "profiles_select_all_authenticated"
on public.profiles for select
to authenticated
using (true);
