# Contributing to Potmate

Thanks for helping improve Potmate.

## Before You Start

- Open an Issue for user-facing changes before large implementation work.
- Keep changes focused and small enough to review.
- Do not commit generated build artifacts from `dist` or `src-tauri/target`.
- Do not add analytics, tracking, or network upload behavior without a clear proposal and privacy review.

## Development

```bash
pnpm install
pnpm tauri dev
```

Run checks before opening a PR:

```bash
pnpm build
```

For release packaging checks on your current platform:

```bash
pnpm verify:release
```

## Pull Requests

Please include:

- What changed.
- Why it changed.
- How you tested it.
- Screenshots or recordings for UI changes.
- Platform notes for desktop behavior.

## Commit Style

Use concise messages similar to:

- `feat: 优化迷你态浮层交互`
- `fix: 修复桌宠缩放边界`
- `docs: 补充安装说明`
- `chore: 更新发布配置`
