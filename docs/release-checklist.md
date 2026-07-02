# Potmate 发布清单

## 本机可完成

- `pnpm verify:release` 通过。
- `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 版本号一致。
- 打开 `.app`，确认主窗口透明置顶、可拖动。
- 托盘菜单可显示、隐藏、退出。
- 记录一条内容后植物生成，关闭重开后数据仍在。
- 导出备份、导入备份均可用。
- 打开设置页，桌面状态面板无异常状态。

## macOS 自用/内部测试

- 替换正式品牌图标。
- 在干净 macOS 用户环境验证首次启动、通知权限、辅助功能权限。
- 验证未授权全局键鼠权限时会降级为窗口内监听。
- 未签名、未公证的包可以作为自用/内部测试包交付，但首次打开可能需要在系统设置中手动允许。

## macOS 对外分发可选项

- 使用 Apple Developer ID 签名。
- 配置 hardened runtime 和必要 entitlements。
- 运行公证并 stapling。

## Windows 正式发布前

- 在 Windows 真机或虚拟机执行 `pnpm tauri build`。
- 验证 WebView2 环境。
- 验证托盘菜单、开机自启、通知权限。
- 验证全局键鼠监听是否需要额外安全软件放行。
- 生成并安装 NSIS/MSI 包。

## 不能跳过

- 不要把 debug 包当对外正式包发布；自用/内部测试可接受未签名、未公证包。
- 不要在未说明权限用途的情况下默认开启全局键鼠养分。
- 不要发布未验证备份导入/导出的包。
