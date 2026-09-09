import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { deriveHasExistingRows } from '../lib/import-batch-ui'

async function readDetailViewSource() {
  const url = new URL('../components/import-batch-detail-view.tsx', import.meta.url)
  return readFile(fileURLToPath(url), 'utf8')
}

describe('Import batch upload lock (UI heuristic)', () => {
  it('totalRows=0 + rows=0 + sourceFileName present => upload enabled (no existing rows)', () => {
    const batch = { totalRows: 0, sourceFileName: 'POP Pati(1).xls' }
    const detail = { rows: [] as unknown[] }
    assert.equal(deriveHasExistingRows(batch, detail), false)
  })

  it('totalRows>0 => upload disabled (existing rows)', () => {
    const batch = { totalRows: 1, sourceFileName: 'anything.xls' }
    const detail = { rows: [] as unknown[] }
    assert.equal(deriveHasExistingRows(batch, detail), true)
  })

  it('detail.rows.length>0 => upload disabled (existing rows)', () => {
    const batch = { totalRows: 0, sourceFileName: null }
    const detail = { rows: [{}] as unknown[] }
    assert.equal(deriveHasExistingRows(batch, detail), true)
  })

  it('totalRows=0 + rows=0 + sourceFileName empty => upload enabled (no existing rows)', () => {
    const batch = { totalRows: 0, sourceFileName: '' }
    const detail = { rows: [] as unknown[] }
    assert.equal(deriveHasExistingRows(batch, detail), false)
  })

  it('import-batch-detail-view does not treat sourceFileName as existing rows (static proof)', async () => {
    const src = await readDetailViewSource()
    assert.ok(!src.includes('Boolean(batch.sourceFileName)'))
    assert.ok(!src.includes('batch.sourceFileName)'))
    assert.ok(src.includes('deriveHasExistingRows'))
  })
})
