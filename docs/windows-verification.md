# Windows 验证清单

当前开发机是 macOS，Windows 能力需要在 Windows 环境单独验证。

## 环境

- Windows 10 或 Windows 11。
- Node.js 和 pnpm。
- Rust stable toolchain。
- Microsoft WebView2 Runtime。

## 构建

```bash
pnpm install
pnpm build
pnpm tauri build
```

## 验证项

- 应用可安装和启动。
- 窗口置顶、透明、无边框表现可接受。
- 托盘图标存在，菜单可显示、隐藏、退出。
- 开机自启开关能写入系统启动项。
- 系统通知能正常弹出。
- 键鼠养分开启后，窗口内活动会增加今日交互次数。
- 后台全局键鼠活动能被记录；如果被安全软件拦截，设置中应显示降级状态。
- 备份导出到用户选择路径。
- 备份导入有效文件后状态恢复。
- 导入无效文件不会破坏当前花园。

## 记录结果

建议每次 Windows 验证记录：

- Windows 版本。
- CPU 架构。
- WebView2 版本。
- 安装包类型。
- 权限弹窗行为。
- 是否有杀毒/安全软件拦截。
