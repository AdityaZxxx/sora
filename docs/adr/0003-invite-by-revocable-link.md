# Wallets are joined via revocable shareable links, not email invites

An invite is a link, also rendered as a QR code, that can be sent over any channel such as WhatsApp. Only owners and co-owners create, rotate and revoke links for a wallet; rotating replaces the active link and revokes the old one. Accepting a link requires signing in through it, and invitees join as members. A person who already has a personal wallet keeps it and all its records when they join another wallet. Email invites were rejected because they need third-party email infrastructure and per-invite email volume on a free product.

## Considered Options

- Invite by email with a secure link (rejected): requires an email provider and sends one email per invite; the free tier is reserved for auth emails.
- Claim a shared household by name after sign-up (rejected): no privacy control, easy to join the wrong wallet.
- Let any member mint or rotate links (rejected): a member could share the wallet without the owner's consent.

## Consequences

- Anyone holding a live link can join, so rotation, revocation and member removal are mandatory features, not nice-to-haves.
- No email is sent for invites; the link itself is the whole mechanism.
- A link is scoped to one wallet and stays invalid after rotation or revocation.
- Membership history survives departure, but a departed member needs a new invite to rejoin.
