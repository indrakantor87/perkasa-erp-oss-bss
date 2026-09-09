import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

async function readActionPanelSource() {
  const url = new URL('../components/import-batch-action-panel.tsx', import.meta.url)
  return readFile(fileURLToPath(url), 'utf8')
}

describe('Import Center UI: Stage 05 visibility', () => {
  it('defines Stage 05 in transformStages with Network ODP description', async () => {
    const src = await readActionPanelSource()
    assert.ok(src.includes("stage: '05'"))
    assert.ok(src.includes('network_odp'))
    assert.ok(src.includes('network_odp_ports'))
  })

  it('shows Stage 05 only for INVENTORY scope (static proof)', async () => {
    const src = await readActionPanelSource()
    assert.ok(src.includes("batch.scope === 'INVENTORY'"))
    assert.ok(src.includes("item.stage !== '05'"))
  })

  it('keeps stages 01-04 unchanged (static proof)', async () => {
    const src = await readActionPanelSource()
    for (const stage of ['01', '02', '03', '04']) {
      assert.ok(src.includes(`stage: '${stage}'`))
    }
  })

  it('ActionStage typing is derived from transformStages and includes 05 (static proof)', async () => {
    const src = await readActionPanelSource()
    assert.ok(src.includes("type TransformStageItem = (typeof transformStages)[number]"))
    assert.ok(src.includes("type ActionStage = TransformStageItem['stage']"))
  })

  it('stage buttons use official transform endpoint with stage payload (static proof)', async () => {
    const src = await readActionPanelSource()
    assert.ok(src.includes('fetch(`/api/import/batches/${batchId}/transform`'))
    assert.ok(src.includes('body: JSON.stringify({ stage })'))
    assert.ok(src.includes('onClick={() => runTransform(item.stage)}'))
  })

  it('does not add Retry Stage 05 override button (static proof)', async () => {
    const src = await readActionPanelSource()
    assert.ok(src.includes('retryStages.map'))
    assert.ok(!src.includes("Retry Tahap 5 (05)"))
  })

  it('recommendation logic does not hardcode stage 05 (static proof)', async () => {
    const src = await readActionPanelSource()
    assert.ok(!src.includes("return '05'"))
  })
})
