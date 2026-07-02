# Potmate 小盆友

Potmate「小盆友」是一个桌面端花盆桌宠原型。用户每天记录一件小事，文字情绪会影响植物的叶形、颜色、花型和装饰；植物会随记录生长、枯萎、恢复、盛放、结种，并进入图鉴。

## 当前能力

- Vue 3 + TypeScript + Tauri 2 桌面应用。
- 本地文字情绪分析和参数化 Canvas 植物渲染。
- 每日记录、成长阶段、活力衰减、温和模式。
- 盛放结种、图鉴收藏、种子继承。
- Tauri Store 持久化，旧 `localStorage` 数据自动迁移。
- JSON 备份导入/导出。
- 托盘显示/隐藏/退出。
- 系统通知、开机自启、全局键鼠活动监听。
- macOS 权限不足时自动降级为窗口内活动监听。

## 开发

```bash
pnpm install
pnpm dev
```

桌面开发：

```bash
pnpm tauri dev
```

## 构建

Web 构建和类型检查：

```bash
pnpm build
```

桌面 debug 构建：

```bash
pnpm build:desktop
```

生成 debug DMG：

```bash
pnpm package:dmg
```

发布前本机验证：

```bash
pnpm verify:release
```

产物位置：

- `src-tauri/target/debug/bundle/macos/Potmate.app`
- `src-tauri/target/debug/bundle/dmg/Potmate_<version>_<arch>.dmg`

## 验收

详见 [docs/v1-验收清单.md](docs/v1-验收清单.md)。

发布准备：

- [发布清单](docs/release-checklist.md)
- [权限与隐私说明](docs/privacy-permissions.md)
- [Windows 验证清单](docs/windows-verification.md)

## 系统边界

- macOS 全局键鼠监听需要用户授予辅助功能或输入监控权限。
- 当前 macOS 包是 debug 构建，可用于自用/内部测试；未签名、未公证时首次打开可能需要手动允许。
- 当前未配置自动更新。
- Windows 相关能力需要在 Windows 真机上再做安装和权限验证。
