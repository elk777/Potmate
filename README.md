# Potmate 小盆友

> 一只会随着每日记录慢慢成长的桌面花盆桌宠。

[简体中文](README.zh-CN.md) | [English](README.en-US.md)

Potmate is a local-first desktop plant companion built with Tauri, Vue, TypeScript, Rust, and Canvas. It turns small daily notes and gentle activity signals into a growing flowerpot that lives on your desktop.

## Download

Installers are distributed through this repository's GitHub Releases page.

| Platform | Recommended asset |
| --- | --- |
| macOS Apple Silicon | `Potmate_<version>_aarch64.dmg` |
| macOS Intel | `Potmate_<version>_x64.dmg` |
| Windows | `Potmate_<version>_x64_en-US.msi` or `Potmate_<version>_x64-setup.exe` |
| Linux universal | `Potmate_<version>_amd64.AppImage` |
| Ubuntu / Debian | `Potmate_<version>_amd64.deb` |

See [Installation](INSTALL.md) for platform-specific steps and security prompts.

## Highlights

- Transparent always-on-top desktop flowerpot.
- Daily text notes that influence plant shape, color, species, and decorations.
- Growth stages, bloom, seed inheritance, gallery, and backup export/import.
- Mini record bubble, control dock, action menu, and canvas pass-through mode.
- Local storage by default. No account, cloud sync, or server upload.
- Tray menu, notifications, optional autostart, and optional activity nourishment.

## Privacy

Potmate is designed to be local-first. Daily notes, plant state, gallery data, and settings stay on your machine unless you manually export a backup. Optional keyboard and mouse activity monitoring only counts activity events; it does not save key values, mouse coordinates, passwords, or text from other apps.

Read the full [Privacy Policy](PRIVACY.md) and [Permissions Guide](release-docs/privacy-permissions.md).

## Development

```bash
pnpm install
pnpm tauri dev
```

Release build:

```bash
pnpm verify:release
```

## Documentation

- [中文说明](README.zh-CN.md)
- [English README](README.en-US.md)
- [Installation](INSTALL.md)
- [Troubleshooting](release-docs/troubleshooting.md)
- [Release checklist](release-docs/release-checklist.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
