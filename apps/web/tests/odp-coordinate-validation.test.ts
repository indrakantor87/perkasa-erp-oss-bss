import assert from 'node:assert/strict'
import type { DomainReviewRow } from '@/lib/types'
import { buildOdpMapHref, extractOdpPoint, parseOdpGeoCoordinate } from '@/components/inventory-network-ops-panel'

function buildRow(meta: string[], primary = 'ODP/TEST/001'): DomainReviewRow {
  return {
    row: { id: 'row-1', sectionId: 'section-1' },
    id: 'review-1',
    primary,
    secondary: '',
    detail: '',
    tone: 'default',
    meta,
    actions: [],
  } as unknown as DomainReviewRow
}

async function main() {
  assert.equal(parseOdpGeoCoordinate('', 'lat'), null)
  assert.equal(parseOdpGeoCoordinate(' ', 'lat'), null)
  assert.equal(parseOdpGeoCoordinate('-', 'lat'), null)
  assert.equal(parseOdpGeoCoordinate('abc', 'lat'), null)
  assert.equal(parseOdpGeoCoordinate(String(Number.NaN), 'lat'), null)
  assert.equal(parseOdpGeoCoordinate(String(Number.POSITIVE_INFINITY), 'lat'), null)
  assert.equal(parseOdpGeoCoordinate(String(Number.NEGATIVE_INFINITY), 'lat'), null)
  assert.equal(parseOdpGeoCoordinate('91', 'lat'), null)
  assert.equal(parseOdpGeoCoordinate('-91', 'lat'), null)
  assert.equal(parseOdpGeoCoordinate('181', 'lng'), null)
  assert.equal(parseOdpGeoCoordinate('-181', 'lng'), null)

  assert.equal(parseOdpGeoCoordinate('0', 'lat'), 0)
  assert.equal(parseOdpGeoCoordinate('0.0', 'lng'), 0)
  assert.equal(parseOdpGeoCoordinate('-6.9', 'lat'), -6.9)
  assert.equal(parseOdpGeoCoordinate('110.4', 'lng'), 110.4)

  const emptyRow = buildRow(['Latitude: ', 'Longitude: '])
  assert.equal(extractOdpPoint(emptyRow), null)
  assert.equal(buildOdpMapHref(emptyRow), '')

  const sentinelRow = buildRow(['Latitude: 0', 'Longitude: 0'])
  assert.equal(extractOdpPoint(sentinelRow), null)
  assert.equal(buildOdpMapHref(sentinelRow), '')

  const latNonZeroLngZero = buildRow(['Latitude: -6.9', 'Longitude: 0'])
  assert.deepEqual(extractOdpPoint(latNonZeroLngZero), { lat: -6.9, lng: 0, label: 'ODP/TEST/001' })
  assert.ok(buildOdpMapHref(latNonZeroLngZero).includes('mlat=-6.9'))
  assert.ok(buildOdpMapHref(latNonZeroLngZero).includes('mlon=0'))

  const latZeroLngNonZero = buildRow(['Latitude: 0', 'Longitude: 110.4'])
  assert.deepEqual(extractOdpPoint(latZeroLngNonZero), { lat: 0, lng: 110.4, label: 'ODP/TEST/001' })
  assert.ok(buildOdpMapHref(latZeroLngNonZero).includes('mlat=0'))
  assert.ok(buildOdpMapHref(latZeroLngNonZero).includes('mlon=110.4'))

  const indonesia = buildRow(['Latitude: -6.9', 'Longitude: 110.4'])
  assert.deepEqual(extractOdpPoint(indonesia), { lat: -6.9, lng: 110.4, label: 'ODP/TEST/001' })
  const href = buildOdpMapHref(indonesia)
  assert.ok(href.includes('mlat=-6.9'))
  assert.ok(href.includes('mlon=110.4'))

  console.log('odp-coordinate-validation.test.ts passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
