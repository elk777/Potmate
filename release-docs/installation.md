# 安装与分发说明

面向用户的安装说明见仓库根目录 [INSTALL.md](../INSTALL.md)。

本文面向维护者，说明 GitHub Releases 分发规则。

## 分发渠道

Potmate 不上架应用商店。公开版本只通过 GitHub Releases 分发。

## 资产命名

建议 Release 资产保持 Tauri 默认命名，文档中用以下模式解释：

- `Potmate_<version>_aarch64.dmg`
- `Potmate_<version>_x64.dmg`
- `Potmate_<version>_x64_en-US.msi`
- `Potmate_<version>_x64-setup.exe`
- `Potmate_<version>_amd64.AppImage`
- `Potmate_<version>_amd64.deb`
- `Potmate-<version>-1.x86_64.rpm`

## Release Tag

稳定版本：

```bash
git tag v0.1.0
git push origin v0.1.0
```

测试版本：

```bash
git tag v0.1.0-beta.1
git push origin v0.1.0-beta.1
```

工作流会创建 draft release。发布前需要人工检查资产和说明。

## 不签名版本说明

在没有配置 Apple Developer ID 和 Windows Code Signing Certificate 前，安装包应明确标记为未签名。

用户会看到：

- macOS：无法验证开发者。
- Windows：SmartScreen 风险提示。

Release notes 必须包含处理方式，并提醒用户只从 GitHub Releases 下载。
