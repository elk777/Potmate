# Potmate

Potmate is a gentle desktop plant companion. Write one small note each day, and the emotion in that note shapes the plant's leaves, colors, flower species, decorations, and growth.

## Download

Installers are published through this repository's GitHub Releases page.

| Platform | Recommended asset |
| --- | --- |
| macOS Apple Silicon | `Potmate_<version>_aarch64.dmg` |
| macOS Intel | `Potmate_<version>_x64.dmg` |
| Windows | `Potmate_<version>_x64_en-US.msi` or `Potmate_<version>_x64-setup.exe` |
| Linux universal | `Potmate_<version>_amd64.AppImage` |
| Ubuntu / Debian | `Potmate_<version>_amd64.deb` |

See [Installation](INSTALL.md) for detailed steps.

## Features

- Transparent always-on-top desktop flowerpot.
- Daily text notes that influence plant generation.
- Growth stages, bloom, seed inheritance, gallery, and backups.
- Mini record bubble, control dock, dewdrop action menu, and canvas pass-through.
- Optional autostart, notifications, and activity nourishment.
- Local-first storage with no account, no cloud sync, and no server upload.

## Permissions

Potmate uses desktop permissions only for local companion features:

- Notifications for daily note reminders.
- Autostart only after you enable it.
- File access for manually importing and exporting JSON backups.
- Optional keyboard and mouse activity monitoring to count activity events as gentle nourishment.

Activity monitoring does not store exact keys, mouse coordinates, passwords, chat content, or browser content. If the permission is unavailable, Potmate falls back to in-window activity signals.

Read [Privacy Policy](PRIVACY.md) and [Permissions Guide](release-docs/privacy-permissions.md).

## Development

```bash
pnpm install
pnpm tauri dev
```

Build and type-check:

```bash
pnpm build
```

Release desktop build:

```bash
pnpm build:desktop
```

Pre-release verification:

```bash
pnpm verify:release
```

## Release

Potmate is distributed through GitHub Releases, not app stores. Push a version tag to trigger the multi-platform release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Review [Release checklist](release-docs/release-checklist.md) before publishing.

## Known Limits

- Unsigned and unnotarized macOS builds may require manual approval.
- Unsigned Windows builds may trigger SmartScreen.
- Linux transparency, always-on-top, and pass-through behavior can vary by desktop environment.
- Potmate currently has no account system, cloud sync, or auto-update.

## License

MIT. See [LICENSE](LICENSE).
