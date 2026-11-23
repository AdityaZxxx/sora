# Onboarding

The onboarding flow carries a member from sign-up to their first dashboard. Sign-up happens with an email/password or Google; after sign-in the member lands on `/` and the currency gate decides whether to send them to `/wizard` or render the empty dashboard.

## Sub-features

- `sign-up` signs up with email+password or with Google. No verification is required to sign in.
- `sign-in` signs in with email+password or with Google; a signed-in member is bounced from the auth page to their destination.
- `wizard` collects the household currency and sends the member to their (empty) dashboard.
- `first-dashboard` shows an empty ledger and prompts the member to add their first transaction.
- `next-redirect` honours the `next` query parameter for deep links into the app.
- `invite-cta` the member can invite another member for a shared household, or dismiss the suggestion.

## How to get to it (user POV)

- Open `/sign-up` or `/sign-in`, and choose email/password or `Continue with Google`.
- Follow a `next` parameter to deep-link into an authenticated page.
- The dashboard redirects a currency-less member to `/wizard` until one is picked.
- `I'm done` on the wizard lands the member on their dashboard.
- `Invite a Member` shows when the household has exactly one member, and can be dismissed with `Hide this suggestion`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The database is empty (`control-sora reset --empty`), so no seeded member exists yet.
- A fresh browser session is open.

- **Sign up.** Run `control-sora browser open "$U/sign-up"`, then `control-sora browser find label "Name" fill "Casey Morgan"`, `control-sora browser find label "Email" fill "casey@sora.test"`, `control-sora browser find label "Password" fill "sora-verify-pass"`, and `control-sora browser find role button click --name "Sign up"`. The member lands on `/wizard` and the heading reads `Welcome, Casey! 👋`.
- **Pick the currency.** The wizard creates the household before it renders, so the page is not blank. The currency trigger is prefilled with `🇺🇸 United States Dollar` from the USD default, not `Select currency…`. Run `control-sora browser find role button click --name "🇺🇸 United States Dollar"`, then `control-sora browser find placeholder "Filter currency…" fill "USD"` and `control-sora browser find role option click --name "🇺🇸 United States Dollar"`. Picking the same currency may not fire a change; pick another currency first if `I'm done` does not navigate. The currency persists on pick, not on finish.
- **To the dashboard.** Run `control-sora browser find role button click --name "I'm done! Take me to the dashboard"`. The member lands on `/`; the heading reads `Hello, Casey! 👋` and the totals are zero.
- **Invite a member.** Run `control-sora browser find role button click --name "Invite a Member"`. A dialog describes the invite link; the member can dismiss it with `Hide this suggestion` or send it with `Create new link`. (Only a full member can create an invite link.)
- **Sign out and sign back in.** The member signs out and signs in again on `/sign-in`. The dashboard renders directly; there is nothing saved but the currency, so `Hello, Casey! 👋` still reads and the empty ledger is identical.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/onboarding/sign-up.png` before the currency pick. Restore the seeded baseline with `control-sora reset`.

## Gotchas

- The household row is created before the wizard renders, so the wizard is never a blank page and the currency picker is prefilled with USD.
- The currency persists the moment a different currency is picked; the `I'm done` button saves nothing extra.
- `/wizard` is session-gated; a signed-out member is bounced to `/sign-in`.
- Sign-up sends a verification email but does not require it; a failed email does not block sign-in.
- A sign-in that succeeds on `/sign-in` pushes the member to `next` (default `/`); a sign-up pushes to `next` (default `/wizard`).
- Re-picking the already selected currency may not save; choose a different one first if the final button does not navigate.
