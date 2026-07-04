# Potmate {{TAG}}

> Potmate「小盆友」是一只会随着每日记录慢慢成长的桌面花盆桌宠。

## 下载安装

请根据你的系统下载对应安装包：

| 平台 | 推荐下载 | 说明 |
| --- | --- | --- |
| macOS Apple Silicon | `Potmate_{{VERSION}}_aarch64.dmg` | 适用于 M 系列芯片 Mac |
| macOS Intel | `Potmate_{{VERSION}}_x64.dmg` | 适用于 Intel 芯片 Mac |
| Windows | `.msi` 或 `.exe` | Windows 10 / 11 |
| Linux 通用 | `.AppImage` | 下载后添加执行权限即可运行 |
| Ubuntu / Debian | `.deb` | 适用于 Debian 系发行版 |
| Fedora / RHEL | `.rpm` | 适用于 RPM 系发行版 |

如果你不确定该下载哪个文件：

- Mac 显示 Apple M 系列芯片：下载 `aarch64.dmg`
- Mac 显示 Intel 芯片：下载 `x64.dmg`
- Windows 用户：优先下载 `.msi`
- Linux 用户：优先下载 `.AppImage`，Ubuntu/Debian 用户也可以下载 `.deb`

## 本次更新

{{CHANGELOG}}

## 安装提示

### macOS

当前安装包未签名、未公证，首次打开时可能提示“无法验证开发者”。

可以这样打开：

1. 将 `Potmate.app` 拖入“应用程序”。
2. 在 Finder 中右键 `Potmate.app`。
3. 选择“打开”。
4. 在弹窗中再次选择“打开”。

如果仍然打不开，可以执行：

```bash
xattr -cr /Applications/Potmate.app
open /Applications/Potmate.app
```

### Windows

当前安装包未签名，可能触发 SmartScreen。

确认安装包来自本 Release 后，可以点击：

```text
更多信息 -> 仍要运行
```

### Linux

AppImage 需要添加执行权限：

```bash
chmod +x Potmate_{{VERSION}}_amd64.AppImage
./Potmate_{{VERSION}}_amd64.AppImage
```

Linux 的透明窗口、置顶、托盘和穿透表现可能受桌面环境影响。

## 权限与隐私

Potmate 默认本地保存每日记录、植物状态、图鉴和设置，不需要账号，也不会上传记录内容。

可选键鼠活动养分只统计点击/按键事件数量，不保存具体按键、鼠标坐标、密码、聊天内容或浏览器内容。权限不足时会自动降级为应用窗口内活动监听。

## 已知平台边界

- macOS / Windows 安装包暂未签名。
- Linux 下透明窗口、置顶和穿透效果可能因 GNOME、KDE、Wayland、X11 等环境不同而表现不一致。
- 当前版本没有自动更新。
- 当前版本没有云同步，数据默认仅保存在本机。

## 反馈

如果你遇到安装、权限、桌宠显示或数据备份问题，请在 Issues 中反馈，并尽量附上：

- 操作系统和版本。
- 下载的安装包类型。
- 问题截图或录屏。
- 复现步骤。
