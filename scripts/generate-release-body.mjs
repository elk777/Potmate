import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const changelogPath = resolve(rootDir, 'CHANGELOG.md')
const templatePath = resolve(rootDir, 'release-docs/templates/release-body.md')

const inputTag = process.argv[2]

if (!inputTag) {
  console.error('Usage: node scripts/generate-release-body.mjs <tag-or-version>')
  process.exit(1)
}

const tag = normalizeTag(inputTag)
const version = tag.replace(/^v/i, '')
const changelog = readFileSync(changelogPath, 'utf8')
const template = readFileSync(templatePath, 'utf8')
const releaseNotes = extractChangelogSection(changelog, version)

const body = template
  .replaceAll('{{TAG}}', tag)
  .replaceAll('{{VERSION}}', version)
  .replaceAll('{{CHANGELOG}}', releaseNotes)

process.stdout.write(`${body.trim()}\n`)

function normalizeTag(value) {
  const trimmed = value.trim()
  if (!trimmed) {
    console.error('Release tag cannot be empty.')
    process.exit(1)
  }

  return trimmed.startsWith('refs/tags/') ? trimmed.slice('refs/tags/'.length) : trimmed
}

function extractChangelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/)
  const headingPattern = new RegExp(`^##\\s+\\[?v?${escapeRegExp(version)}\\]?(?:\\s+-\\s+.*)?\\s*$`, 'i')
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()))

  if (startIndex === -1) {
    return [
      `> CHANGELOG.md 中没有找到 ${version} 的版本段落。`,
      '',
      '维护者发布前请补充本次新增、优化、修复和已知问题。',
    ].join('\n')
  }

  const section = []
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) break
    section.push(lines[index])
  }

  const text = section.join('\n').trim()
  if (!text) {
    return `> CHANGELOG.md 中 ${version} 的版本段落为空，维护者发布前请补充更新内容。`
  }

  return text
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
