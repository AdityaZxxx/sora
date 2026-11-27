# User avatars are stored in Postgres and replace provider photos

Account Settings lets a user edit their display name and choose one avatar. We store the cropped image bytes in Postgres and point `User.image` at a same-origin route, so every existing avatar view keeps working without a second field or a resolver. A user has exactly one active avatar: uploading replaces any photo from their sign-in provider, a source marker prevents a later provider sign-in from restoring it, and removing the avatar clears it to initials.

We chose Postgres over a managed blob service because Sora promises free forever with zero cost and has no storage vendor or configuration. The trade-off is that we own validation, serving and resizing, and that a provider photo is permanently discarded on upload.

## Considered options

- Managed blob store such as Vercel Blob or S3: simpler serving and resizing, but adds a paid dependency and configuration that conflict with [ADR 0002](./0002-free-forever-zero-cost.md).
- Base64 data URL in the existing `User.image` text column: the smallest change, but it bloats database rows and API responses.

## Consequences

- Provider sign-ins must not overwrite `User.image` once a custom avatar is set.
- Removing a custom avatar clears it to initials rather than restoring the provider photo.
- The application owns the image size and format limits, currently PNG, JPEG or WebP up to 2 MB, cropped to a square.
