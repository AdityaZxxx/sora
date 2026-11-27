# Account settings

Account Settings holds user scope concerns: profile, authentication, appearance, agent access and account deletion. Wallet data stays on Manage.

## Sub-features

- `account-profile` shows the signed-in user's avatar, display name and a read-only email field with a hint that email cannot be changed. The name is editable inline, and the user can upload a square avatar or remove one they uploaded.
- `account-authentication` shows the current sign-in and offers sign out.
- `account-appearance` chooses light, dark or system theme.
- `account-agent-access` covers token creation, wallet scope and effective access; see [Agent access](./agent-access.md).
- `account-data` downloads the full JSON export and links to the privacy policy.
- `account-delete` deletes the sign-in and sole-member wallets.

## How to get to it (user POV)

- Choose `Account` in the top navigation.
- Wallet members, roles, invites, currency, categories and budgets remain under `Manage`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `$U`; `control-sora doctor` passes.
- Signed in as `avery@sora.test` with a seeded wallet.

- **Open Account Settings.** Run `control-sora browser open "$U/account"`. The page shows Profile, Your data, Authentication, Appearance, Agent access and Delete account.
- **Edit the name.** In the Profile card, choose the edit-name button, replace the name, and save. The card shows the new name and a success toast. The update is visible in the dashboard greeting too.
- **Add an avatar.** Choose Change avatar, pick a small PNG, crop it in the dialog and save. The Profile card and the navigation avatar show the uploaded image. Remove restores the initials fallback.
- **Check the split.** Open `$U/manage` and confirm there is no Agent access, Appearance or Delete account card there.
- **Proof.** `control-sora browser screenshot <artifact-dir>/account/page.png` and `browser snapshot -i`.

## Gotchas

- In this environment `control-sora browser upload` sets a File whose bytes `FileReader` cannot read, so the crop dialog never opens. Drive the change event with a File constructed in the page from the PNG bytes instead.
- Appearance is per device, so it belongs to the account page rather than a wallet.
- Account deletion is still blocked while the user owns a shared wallet with other members.
