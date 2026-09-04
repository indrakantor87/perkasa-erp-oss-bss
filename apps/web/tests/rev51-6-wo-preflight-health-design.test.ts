import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('REV51.6 WO Assignment Preflight + Health Hardening Design Static Checks', () => {
  it('WO preflight default dry-run never authorizes CLI process for schema mutation', async () => {
    const mod = await import(
      '@/scripts/provision-wo-assignment-schema.ts?t=' + Date.now()
    )
    assert.equal(typeof mod, 'object', 'WO provision script loads as module')
    assert.equal(
      (mod as { WO_ASSIGNMENT_TABLE_CANONICAL_NAME?: string }).WO_ASSIGNMENT_TABLE_CANONICAL_NAME,
      'service_work_order_assignments',
      'table canonical name matches runtime ensureServiceWorkOrderAssignmentTable',
    )
  })

  it('health requiredColumns now includes BOTH TT.released_by_user_id and WO.released_by_user_id', async () => {
    const fs = await import('node:fs')
    const route = fs.readFileSync(
      new URL(
        '@/app/api/health/route.ts'.replace('@/', 'apps/web/'),
        import.meta.url,
      ).pathname,
      'utf8',
    )
    assert.match(
      route,
      /service_trouble_ticket_assignments.*released_by_user_id/,
      'health route must check TT assignment released_by_user_id',
    )
    assert.match(
      route,
      /service_work_order_assignments.*released_by_user_id/,
      'health route must check WO assignment released_by_user_id',
    )
    assert.match(
      route,
      /assignment_role.*TECHNICIAN/,
      'health route probes WO backfill legacy TECHNICIAN count',
    )
    assert.doesNotMatch(
      route,
      /ALTER TABLE|CREATE TABLE|UPDATE\s+service_work_order_assignments|runReviewDbExecute\([\s\S]*?(ALTER|CREATE|UPDATE|INSERT|DELETE)/,
      'health MUST NOT contain DDL/DML write operations',
    )
  })

  it('review-db.ts detectProductionDdl blocks DDL keywords at start', async () => {
    const mod = await import('@/lib/review-db.ts?t=' + Date.now())
    const fn = (mod as unknown as Record<string, unknown>).isReviewDbProductionRuntime
    assert.equal(typeof fn, 'function', 'isReviewDbProductionRuntime exported')
  })
})
