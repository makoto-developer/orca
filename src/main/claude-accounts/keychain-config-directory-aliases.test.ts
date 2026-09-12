import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { claudeConfigDirKeychainAliases } from './keychain'

let directory: string
let canonical: string
let linked: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'orca-claude-keychain-alias-'))
  canonical = join(directory, 'canonical')
  linked = join(directory, 'linked')
  mkdirSync(canonical)
  symlinkSync(canonical, linked, process.platform === 'win32' ? 'junction' : 'dir')
  canonical = realpathSync(canonical)
})

afterEach(() => {
  rmSync(directory, { recursive: true, force: true })
})

describe('Claude config directory Keychain aliases', () => {
  it.each([{ segments: ['.claude'] }, { segments: ['removed', '.claude'] }])(
    'resolves a missing config below a symlinked ancestor without creating it ($segments)',
    ({ segments }) => {
      const configDir = join(linked, ...segments)
      expect(claudeConfigDirKeychainAliases(configDir)).toEqual([
        configDir,
        join(canonical, ...segments)
      ])
      expect(existsSync(configDir)).toBe(false)
      expect(existsSync(join(linked, segments[0]))).toBe(false)
    }
  )

  it('retains the canonical alias for an existing directory', () => {
    const configDir = join(linked, '.claude')
    mkdirSync(configDir)
    expect(claudeConfigDirKeychainAliases(configDir)).toEqual([
      configDir,
      join(canonical, '.claude')
    ])
  })

  it('does not duplicate an already canonical missing path', () => {
    const configDir = join(canonical, '.claude')
    expect(claudeConfigDirKeychainAliases(configDir)).toEqual([configDir])
  })

  it.skipIf(process.platform === 'win32')('does not invent an alias for a broken symlink', () => {
    const configDir = join(linked, '.claude')
    symlinkSync(join(directory, 'missing-target'), configDir, 'dir')
    expect(claudeConfigDirKeychainAliases(configDir)).toEqual([configDir])
  })

  it('does not invent an alias below a file', () => {
    const file = join(linked, 'file')
    writeFileSync(file, '')
    const configDir = join(file, '.claude')
    expect(claudeConfigDirKeychainAliases(configDir)).toEqual([configDir])
  })
})
