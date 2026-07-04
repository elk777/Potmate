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

准备下一个版本：

```bash
pnpm release:prepare 0.1.1
```

这个命令会同步更新 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 的版本号，并在 `CHANGELOG.md` 里插入对应版本的更新模板。填好 changelog 后再提交和打 tag。

稳定版本的 Git tag 仍然使用 `vX.Y.Z`，不要在 tag 里写空格或产品名。Release 页面标题会自动显示为 `Potmate VX.Y.Z`。

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

## Release 描述

Release 描述由脚本自动生成：

```bash
pnpm release:body v0.1.0
```

脚本会读取 `CHANGELOG.md` 中对应版本的段落，并套用 `release-docs/templates/release-body.md`。以后升级版本时，只需要补好 `CHANGELOG.md`，再推送对应 tag。

如果删除了 Draft Release，可以在 GitHub Actions 页面手动运行 `Release` workflow，并输入已有 tag 重新生成安装包和 Draft Release。

## 不签名版本说明

在没有配置 Apple Developer ID 和 Windows Code Signing Certificate 前，安装包应明确标记为未签名。

用户会看到：

- macOS：无法验证开发者。
- Windows：SmartScreen 风险提示。

Release notes 必须包含处理方式，并提醒用户只从 GitHub Releases 下载。
