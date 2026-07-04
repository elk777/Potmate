# Potmate 小盆友

Potmate「小盆友」是一只桌面花盆桌宠。你每天记录一件小事，文字里的情绪会影响植物的叶形、颜色、花型、装饰和成长节奏。它不会逼你打卡，只是安静地陪在桌面上，慢慢开花。

## 下载

安装包通过本仓库的 GitHub Releases 页面分发。

| 平台 | 推荐下载 |
| --- | --- |
| macOS Apple Silicon | `Potmate_<version>_aarch64.dmg` |
| macOS Intel | `Potmate_<version>_x64.dmg` |
| Windows | `Potmate_<version>_x64_en-US.msi` 或 `Potmate_<version>_x64-setup.exe` |
| Linux 通用 | `Potmate_<version>_amd64.AppImage` |
| Ubuntu / Debian | `Potmate_<version>_amd64.deb` |

详细步骤见 [安装说明](INSTALL.md)。

## 功能

- 桌面透明花盆桌宠，支持置顶、拖动和缩放。
- 每日记录一件小事，文字情绪会影响植物生成。
- 植物会经历发芽、成长、花苞、盛放和结种。
- 图鉴收藏、种子继承、备份导入和导出。
- 迷你记录气泡、控制台抽屉、露珠花环动作菜单。
- 可选开机自启、系统通知、活动养分和画布穿透。
- 默认本地保存数据，不需要账号，不上传记录内容。

## 权限说明

Potmate 使用的桌面能力都服务于本地桌宠体验：

- 通知：用于每日记录提醒。
- 开机自启：只在你主动开启后启用。
- 文件读写：用于手动导入、导出 JSON 备份。
- 键鼠活动监听：可选能力，只统计点击/按键事件数量，用作植物辅助养分。

键鼠活动监听不会保存具体按键、鼠标坐标、密码、聊天内容或浏览器内容。权限不足时会自动降级为应用窗口内活动监听。

更多说明见 [隐私政策](PRIVACY.md) 和 [权限与隐私说明](release-docs/privacy-permissions.md)。

## 开发

```bash
pnpm install
pnpm tauri dev
```

Web 构建和类型检查：

```bash
pnpm build
```

正式桌面构建：

```bash
pnpm build:desktop
```

发布前验证：

```bash
pnpm verify:release
```

## 公开发布

Potmate 不通过应用商店分发，安装包只通过 GitHub Releases 提供。打 tag 后由 GitHub Actions 构建不同平台安装包。

```bash
git tag v0.1.0
git push origin v0.1.0
```

发布前请检查 [发布清单](release-docs/release-checklist.md)。

## 已知边界

- macOS 未签名/未公证版本首次打开可能需要右键打开或手动移除隔离属性。
- Windows 未签名版本可能触发 SmartScreen。
- Linux 的透明窗口、置顶和穿透效果会受桌面环境影响。
- 当前版本没有账号系统、云同步或自动更新。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
