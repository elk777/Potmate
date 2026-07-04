# Potmate 发布清单

Potmate 当前不走应用商店，只通过 GitHub Releases 分发安装包。

## 版本准备

- `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 版本号一致。
- `CHANGELOG.md` 写清楚本次新增、修复和已知问题。
- `README.md` 下载链接、安装包名称和支持平台仍然准确。
- `PRIVACY.md` 和 `release-docs/privacy-permissions.md` 覆盖新增权限或数据行为。
- `LICENSE` 已存在并符合公开分发预期。

## 本机验证

- `pnpm build` 通过。
- `pnpm verify:release` 通过。
- 打开应用，确认主窗口透明置顶、可拖动、可缩放。
- 描述气泡、控制台抽屉、动作菜单在最小尺寸下不溢出。
- 记录一条内容后植物生成，关闭重开后数据仍在。
- 导出备份、导入备份均可用。
- 托盘菜单可显示、隐藏、退出。
- 设置中的通知、开机自启、活动养分开关状态清晰。

## GitHub Release 验证

- tag 使用 `vX.Y.Z` 或 `vX.Y.Z-beta.N`。
- GitHub Actions release workflow 全部通过。
- Release 处于 draft 状态时先检查资产再发布。
- Release 资产包含目标平台安装包：
  - macOS Apple Silicon `.dmg`
  - macOS Intel `.dmg`
  - Windows `.msi` 或 `.exe`
  - Linux `.AppImage`
  - Ubuntu / Debian `.deb`
  - 可选 `.rpm`
- Release notes 写明“未签名安装包可能被系统拦截”。

## macOS 验证

- 在干净 macOS 用户环境验证首次启动。
- 验证未签名/未公证包的右键打开流程。
- 验证通知权限、辅助功能权限和输入监控权限提示。
- 验证未授权全局键鼠权限时降级为窗口内监听。

## Windows 验证

- 在 Windows 10 或 Windows 11 安装 `.msi` / `.exe`。
- 验证 SmartScreen 提示文案和用户绕过路径。
- 验证托盘菜单、开机自启、通知权限。
- 验证全局键鼠监听是否被安全软件拦截。
- 验证卸载后不会留下异常启动项。

## Linux 验证

- 在 Ubuntu/Debian 安装 `.deb`。
- 运行 `.AppImage`。
- 如果发布 `.rpm`，在 Fedora/RHEL 系环境验证。
- 分别记录 X11 / Wayland、GNOME / KDE 下透明窗口、置顶、穿透和托盘表现。

## 不能跳过

- 不要发布 debug 包。
- 不要发布未验证备份导入/导出的包。
- 不要在未说明权限用途的情况下默认开启全局键鼠养分。
- 不要把未验证的平台描述为“完全支持”。
