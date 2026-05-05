# Admin Access

TradeMind AI keeps internal platform diagnostics separate from normal user-facing trading tools.

## Admin-only route

`/system-status` is available only to platform administrators.

Current admin email:

- `ydolishniy@gmail.com`

Admin access is checked only from the authenticated Supabase user email. The application does not store an admin password in source code, does not perform custom password checks, and does not display secrets on the System Status page.

## Normal users

Normal authenticated users cannot view System Status data. If they open `/system-status`, they see an access denied card with a link back to `/dashboard`.

Links to System Status are hidden from non-admin users.

## Future improvement

A later production hardening stage can move admin authorization to a database role such as `profiles.role = 'admin'`, protected by Row Level Security and admin-only management workflows.
