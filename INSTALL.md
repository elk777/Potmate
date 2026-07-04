# Potmate 安装说明

Potmate 不通过应用商店分发。请从 GitHub Releases 下载与你系统匹配的安装包。

## 下载哪个文件

| 系统 | 文件 |
| --- | --- |
| macOS Apple Silicon | `Potmate_<version>_aarch64.dmg` |
| macOS Intel | `Potmate_<version>_x64.dmg` |
| Windows 10 / 11 | `Potmate_<version>_x64_en-US.msi` 或 `Potmate_<version>_x64-setup.exe` |
| Linux 通用 | `Potmate_<version>_amd64.AppImage` |
| Ubuntu / Debian | `Potmate_<version>_amd64.deb` |
| Fedora / RHEL | `Potmate-<version>-1.x86_64.rpm` |

如果不确定 Mac 是哪种芯片：点击左上角 Apple 菜单，选择“关于本机”。显示 Apple M 系列就是 Apple Silicon，显示 Intel 就下载 x64。

## macOS

1. 下载对应 `.dmg`。
2. 打开 `.dmg`。
3. 将 `Potmate.app` 拖入“应用程序”。
4. 从“应用程序”启动 Potmate。

如果提示“无法验证开发者”：

1. 在 Finder 中右键 `Potmate.app`。
2. 选择“打开”。
3. 在系统弹窗中再次选择“打开”。

如果仍然打不开，可以在终端执行：

```bash
xattr -cr /Applications/Potmate.app
open /Applications/Potmate.app
```

## Windows

1. 下载 `.msi` 或 `.exe` 安装包。
2. 双击安装。
3. 如果 SmartScreen 提示风险，点击“更多信息”，再点击“仍要运行”。
4. 启动 Potmate。

未签名版本出现 SmartScreen 是正常现象。请确认安装包来自项目的 GitHub Releases。

## Linux

### AppImage

```bash
chmod +x Potmate_<version>_amd64.AppImage
./Potmate_<version>_amd64.AppImage
```

### Ubuntu / Debian

```bash
sudo apt install ./Potmate_<version>_amd64.deb
```

### Fedora / RHEL

```bash
sudo rpm -i Potmate-<version>-1.x86_64.rpm
```

Linux 下透明窗口、置顶、托盘和穿透表现可能受桌面环境影响。GNOME、KDE、Wayland、X11 之间可能存在差异。

## 权限

Potmate 可以在设置中开启通知、开机自启和活动养分。活动养分只统计点击/按键事件数量，不保存具体按键或输入内容。

更多说明见 [隐私政策](PRIVACY.md)。
