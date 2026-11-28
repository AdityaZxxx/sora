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
- **Edit the name.** In the Profile card, choose the edit-name button, replace the name, and save. The card shows the new name and a success toast. The dashboard greeting and navigation avatar use the first name, so changing only the surname leaves the greeting unchanged.
- **Add an avatar.** Create a small PNG, for example `convert -size 96x96 xc:'#4f46e5' <artifact-dir>/avatar.png`. Run `control-sora browser upload 'input[type="file"]' <artifact-dir>/avatar.png`. The `Choose your avatar` crop dialog opens with the image loaded. Click `Save avatar`; the toast reads `Avatar updated` and two `img[src*="/api/avatars/"]` elements appear, one in the Profile card and one in the navigation. Dismiss the install prompt if it covers `Remove`, then click `Remove`; the avatar images disappear and the `AQ` initials return.
- **Check the split.** Open `$U/manage` and confirm there is no Agent access, Appearance or Delete account card there.
- **Proof.** `control-sora browser screenshot <artifact-dir>/account/page.png` and `control-sora browser snapshot -i`.

## Gotchas

- `control-sora browser upload` works when given a real PNG path. The hidden file input is fine; Playwright sets the bytes and `FileReader` produces the data URL the crop dialog needs. The install aside can cover the Profile card's `Remove` button, so dismiss it first.
- Appearance is per device, so it belongs to the account page rather than a wallet.
- Account deletion is still blocked while the user owns a shared wallet with other members.
