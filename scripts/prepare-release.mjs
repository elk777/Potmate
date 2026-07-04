import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2]?.trim()

if (!version || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('Usage: node scripts/prepare-release.mjs <version>')
  console.error('Example: node scripts/prepare-release.mjs 0.1.1')
  process.exit(1)
}

updatePackageJson(version)
updateTauriConfig(version)
updateCargoToml(version)
updateChangelog(version)

console.log(`Prepared Potmate ${version}.`)
console.log('Next: fill CHANGELOG.md, commit, tag, then push main and the tag.')

function updatePackageJson(nextVersion) {
  const path = resolve(rootDir, 'package.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.version = nextVersion
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
}

function updateTauriConfig(nextVersion) {
  const path = resolve(rootDir, 'src-tauri/tauri.conf.json')
  const json = JSON.parse(readFileSync(path, 'utf8'))
  json.version = nextVersion
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
}

function updateCargoToml(nextVersion) {
  const path = resolve(rootDir, 'src-tauri/Cargo.toml')
  const text = readFileSync(path, 'utf8')
  const updated = text.replace(/^version = ".*"$/m, `version = "${nextVersion}"`)

  if (updated === text) {
    console.error('Could not find version in src-tauri/Cargo.toml')
    process.exit(1)
  }

  writeFileSync(path, updated)
}

function updateChangelog(nextVersion) {
  const path = resolve(rootDir, 'CHANGELOG.md')
  const text = readFileSync(path, 'utf8')
  const headingPattern = new RegExp(`^##\\s+\\[?v?${escapeRegExp(nextVersion)}\\]?\\b`, 'm')

  if (headingPattern.test(text)) return

  const today = new Date().toISOString().slice(0, 10)
  const section = [
    `## ${nextVersion} - ${today}`,
    '',
    '### 新增',
    '',
    '- ',
    '',
    '### 优化',
    '',
    '- ',
    '',
    '### 修复',
    '',
    '- ',
    '',
    '### 已知限制',
    '',
    '- ',
    '',
  ].join('\n')

  const marker = 'All notable Potmate changes are documented here.\n'
  if (text.includes(marker)) {
    writeFileSync(path, text.replace(marker, `${marker}\n${section}`))
    return
  }

  writeFileSync(path, `${text.trim()}\n\n${section}\n`)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
