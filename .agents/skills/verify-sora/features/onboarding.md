# Onboarding

The onboarding flow carries a member from sign-up to their first dashboard. Email sign-up lands on `/wizard`; a sign-in lands on `/`. `Get started` creates the personal wallet with the USD default the wizard displays, so finishing with only the prefilled currency lands on the empty dashboard. Picking another currency replaces that stored default before the finish step.

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
- The dashboard renders `Wallet not found` only for a wallet that has no currency; the wizard stores the displayed default so new households never reach that state.
- `I'm done` on the wizard lands the member on the empty dashboard with zero totals, whether or not the prefilled currency was changed.
- `Invite a Member` shows when the household has exactly one member, and can be dismissed with `Hide this suggestion`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- The database is empty (`control-sora reset --empty`), so no seeded member exists yet.
- A fresh browser session is open.

- **Sign up.** Run `control-sora browser open "$U/sign-up"`, then `control-sora browser find label "Name" fill "Casey Morgan"`, `control-sora browser find label "Email" fill "casey@sora.test"`, `control-sora browser find label "Password" fill "sora-verify-pass"`, and `control-sora browser find role button click --name "Sign up"`. The member lands on `/wizard` and the heading reads `Welcome, Casey! 👋`.
- **Create the space.** Run `control-sora browser find role button click --name "Get started"`. The household is created by the form action and the currency card replaces the button. A GET of `/wizard` before this step writes nothing.
- **Pick the currency.** The wizard creates the household when `Get started` is submitted; a GET renders no write. After that submission the currency trigger is prefilled with `🇺🇸 United States Dollar`, which is also the currency stored on the wallet. To change it, run `control-sora browser find role button click --name "🇺🇸 United States Dollar"`, then `control-sora browser find placeholder "Filter currency…" fill "USD"` and `control-sora browser find role option click --name "🇺🇸 United States Dollar"`. Picking the same currency may not fire a change; pick another currency first if a change is needed. The currency persists on pick.
- **To the dashboard.** Run `control-sora browser find role button click --name "I'm done! Take me to the dashboard"`. The member lands on `/`; the heading reads `Hello, Casey! 👋` and the totals are zero. No currency pick is required before this step.
- **Invite a member.** Run `control-sora browser find role button click --name "Invite a Member"`. A dialog describes the invite link; the member can dismiss it with `Hide this suggestion` or send it with `Create new link`. (Only an owner or co-owner can create an invite link.)
- **Sign out and sign back in.** The member signs out and signs in again on `/sign-in`. The dashboard renders directly; there is nothing saved but the currency, so `Hello, Casey! 👋` still reads and the empty ledger is identical.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/onboarding/sign-up.png` before the currency pick. Restore the seeded baseline with `control-sora reset`.

## Gotchas

- The household row is created by the `Get started` form action, not by the wizard's GET. The wizard page before that submission has a plain `Get started` button and no currency picker.
- The wallet is created with USD as its stored currency, and a different currency persists the moment it is picked. The `I'm done` button saves nothing extra.
- `/wizard` is session-gated; a signed-out member is bounced to `/sign-in`.
- Sign-up sends a verification email but does not require it; a failed email does not block sign-in.
- A sign-in that succeeds on `/sign-in` pushes the member to `next` (default `/`); a sign-up pushes to `next` (default `/wizard`).
- Re-picking the already selected currency may not save; choose a different one first if the final button does not navigate.
