# Potmate 排障指南

## macOS 提示无法打开

未签名或未公证版本可能被 macOS Gatekeeper 拦截。

优先尝试：

1. 打开 Finder。
2. 找到 `/Applications/Potmate.app`。
3. 右键选择“打开”。
4. 在弹窗中再次选择“打开”。

如果仍然打不开：

```bash
xattr -cr /Applications/Potmate.app
open /Applications/Potmate.app
```

## macOS 键鼠活动不生效

活动养分需要辅助功能或输入监控权限。

1. 打开“系统设置”。
2. 进入“隐私与安全性”。
3. 检查“辅助功能”和“输入监控”。
4. 给 Potmate 授权后重启应用。

拒绝授权不会影响每日记录养花，只会让活动养分退回应用窗口内监听。

## Windows SmartScreen 拦截

未签名安装包可能触发 SmartScreen。

1. 确认安装包来自项目 GitHub Releases。
2. 点击“更多信息”。
3. 点击“仍要运行”。

## Windows 托盘不显示

- 检查系统托盘折叠区域。
- 检查通知区域设置。
- 重启 Potmate。

## Linux AppImage 无法运行

先添加执行权限：

```bash
chmod +x Potmate_<version>_amd64.AppImage
./Potmate_<version>_amd64.AppImage
```

如果系统缺少 FUSE，请安装发行版对应的 FUSE 包，或改用 `.deb`。

## Linux 透明窗口或穿透异常

Linux 桌面环境差异较大。请在 Issue 中提供：

- 发行版和版本。
- GNOME / KDE / 其他桌面环境。
- X11 或 Wayland。
- 安装包类型。
- 是否开启画布穿透。

## 数据恢复

如果你之前导出过 JSON 备份：

1. 打开 Potmate 控制台。
2. 选择导入备份。
3. 选择备份 JSON 文件。

导入无效文件不会覆盖当前花园。
