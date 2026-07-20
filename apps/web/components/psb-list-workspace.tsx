import Link from 'next/link'
import { PsbListTransitionForm } from '@/components/psb-list-transition-form'
import type { PsbListItem, PsbListPagePayload, PsbListStatus } from '@/lib/psb-list-shared'

function formatDateTime(value: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusTone(status: PsbListStatus) {
  switch (status) {
    case 'BARU':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'REVIEW_CS':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'PERLU_KOREKSI':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'DISETUJUI':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'DITOLAK':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'DITRANSFER_KE_TICKETING':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

function getStatusLabel(status: PsbListStatus) {
  switch (status) {
    case 'REVIEW_CS':
      return 'Review CS'
    case 'PERLU_KOREKSI':
      return 'Perlu Koreksi'
    case 'DISETUJUI':
      return 'Disetujui'
    case 'DITOLAK':
      return 'Ditolak'
    case 'DITRANSFER_KE_TICKETING':
      return 'Sudah ke Ticketing'
    default:
      return 'Baru'
  }
}

function buildHref(
  state: PsbListPagePayload['state'],
  overrides: Partial<PsbListPagePayload['state']>,
) {
  const params = new URLSearchParams()
  const nextState = { ...state, ...overrides }

  if (nextState.status) params.set('status', nextState.status)
  if (nextState.owner) params.set('owner', nextState.owner)
  if (nextState.q) params.set('q', nextState.q)
  if (nextState.selected) params.set('selected', nextState.selected)

  const query = params.toString()
  return query ? `/list-psb?${query}` : '/list-psb'
}

function buildSummaryCard(label: string, value: number, tone: string, href: string) {
  return (
    <Link href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value.toLocaleString('id-ID')}</p>
    </Link>
  )
}

function renderMetaBadge(label: string, value: string | null | undefined) {
  if (!value) {
    return null
  }

  return (
    <span className="badge border-slate-200 bg-white text-slate-700">
      {label}: {value}
    </span>
  )
}

function renderWorkOrderLinks(item: PsbListItem) {
  if (item.status !== 'DITRANSFER_KE_TICKETING') {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2">
      {item.transferredTicketRef ? (
        <Link
          href={`/dashboard/tracking/noc-queue?ticketType=PSB&q=${encodeURIComponent(item.transferredTicketRef)}`}
          className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
        >
          Buka Antrean Ticketing
        </Link>
      ) : null}
      {item.transferredWorkOrderId ? (
        <Link
          href={`/dashboard/tracking/work-orders/${item.transferredWorkOrderId}`}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Buka Detail WO
        </Link>
      ) : null}
    </div>
  )
}

export function PsbListWorkspace({
  payload,
  roleLabel,
  canUpdate,
  canApprove,
  reviewDbReady,
}: {
  payload: PsbListPagePayload
  roleLabel: string
  canUpdate: boolean
  canApprove: boolean
  reviewDbReady: boolean
}) {
  const { state, summary, items, selectedItem } = payload

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Domain Baru</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              List PSB
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Antrean validasi PSB di antara penjualan, CS, dan ticketing. Batch saat ini sudah membuka review dasar
              sampai transfer ke ticket operasional, dengan fallback aman agar tidak mengganggu jalur NOC, CS, dan
              inventory yang sudah stabil.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-sky-200 bg-sky-50 text-sky-700">{roleLabel}</span>
            <span className="badge border-slate-200 bg-slate-50 text-slate-700">
              {items.length.toLocaleString('id-ID')} item tampil
            </span>
            <span className="badge border-slate-200 bg-slate-50 text-slate-700">
              {canUpdate ? 'Bisa review' : 'Mode monitor'}
            </span>
            <span className="badge border-slate-200 bg-slate-50 text-slate-700">
              {canApprove ? 'Bisa approve' : 'Approve terbatas'}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {buildSummaryCard('Total List PSB', summary.totalCount, 'border-slate-200 bg-white text-slate-900', buildHref(state, { status: null, selected: state.selected }))}
        {buildSummaryCard('Baru', summary.baruCount, 'border-sky-200 bg-sky-50 text-sky-800', buildHref(state, { status: 'BARU', selected: state.selected }))}
        {buildSummaryCard('Review CS', summary.reviewCount, 'border-amber-200 bg-amber-50 text-amber-800', buildHref(state, { status: 'REVIEW_CS', selected: state.selected }))}
        {buildSummaryCard('Perlu Koreksi', summary.correctionCount, 'border-orange-200 bg-orange-50 text-orange-800', buildHref(state, { status: 'PERLU_KOREKSI', selected: state.selected }))}
        {buildSummaryCard('Disetujui', summary.approvedCount, 'border-emerald-200 bg-emerald-50 text-emerald-800', buildHref(state, { status: 'DISETUJUI', selected: state.selected }))}
        {buildSummaryCard('Sudah ke Ticketing', summary.transferredCount, 'border-violet-200 bg-violet-50 text-violet-800', buildHref(state, { status: 'DITRANSFER_KE_TICKETING', selected: state.selected }))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <form method="get" className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr_0.9fr_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cari</span>
            <input
              type="search"
              name="q"
              defaultValue={state.q ?? ''}
              placeholder="Cari kode list, nama customer, alamat, ODP, marketing..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select
              name="status"
              defaultValue={state.status ?? ''}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              <option value="">Semua Status</option>
              <option value="BARU">Baru</option>
              <option value="REVIEW_CS">Review CS</option>
              <option value="PERLU_KOREKSI">Perlu Koreksi</option>
              <option value="DISETUJUI">Disetujui</option>
              <option value="DITOLAK">Ditolak</option>
              <option value="DITRANSFER_KE_TICKETING">Sudah ke Ticketing</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Marketing</span>
            <select
              name="owner"
              defaultValue={state.owner ?? ''}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
            >
              <option value="">Semua Marketing</option>
              {payload.ownerOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-900 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Terapkan
            </button>
            <Link
              href="/list-psb"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="space-y-6">
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Antrean Operasional</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Daftar List PSB</h2>
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-4 py-3">Kode / Customer</th>
                  <th className="px-4 py-3">Alamat / Area</th>
                  <th className="px-4 py-3">Paket / ODP</th>
                  <th className="px-4 py-3">Marketing / Target</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tindak Lanjut</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length ? (
                  items.map((item) => {
                    const active = selectedItem?.id === item.id
                    return (
                      <tr key={item.id} className={active ? 'bg-sky-50/70' : 'bg-white'}>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm font-semibold text-slate-950">{item.psbListCode}</p>
                          <p className="mt-1 text-sm text-slate-700">{item.customerName}</p>
                          <p className="mt-2 text-xs text-slate-500">{item.customerPhone || '-'}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-slate-700">{item.addressText}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {renderMetaBadge('Area', item.areaLabel)}
                            {renderMetaBadge('Ticket', item.transferredTicketRef)}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-slate-800">{item.packageLabel || '-'}</p>
                          <p className="mt-2 text-xs text-slate-500">{item.odpCode || 'ODP belum dipilih'}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-slate-800">{item.salesOwnerName || '-'}</p>
                          <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.requestedInstallDate)}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={`badge ${getStatusTone(item.status)}`}>{getStatusLabel(item.status)}</span>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="text-sm text-slate-800">{item.nextActionLabel}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {item.csPicName ? `PIC CS: ${item.csPicName}` : 'Belum ada PIC CS'}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right align-top">
                          <Link
                            href={buildHref(state, { selected: String(item.id) })}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Buka Detail
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                      Tidak ada item yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 xl:hidden">
            {items.length ? (
              items.map((item) => {
                const active = selectedItem?.id === item.id
                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border p-4 ${active ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.psbListCode}</p>
                        <p className="mt-1 text-sm text-slate-700">{item.customerName}</p>
                      </div>
                      <span className={`badge ${getStatusTone(item.status)}`}>{getStatusLabel(item.status)}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{item.addressText}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {renderMetaBadge('Paket', item.packageLabel)}
                      {renderMetaBadge('ODP', item.odpCode)}
                      {renderMetaBadge('Marketing', item.salesOwnerName)}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Link
                        href={buildHref(state, { selected: String(item.id) })}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Buka Detail
                      </Link>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Tidak ada item yang cocok dengan filter saat ini.
              </div>
            )}
          </div>
        </article>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Detail Pilihan</p>
          {selectedItem ? (
            <div className="mt-4 space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{selectedItem.customerName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.psbListCode}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`badge ${getStatusTone(selectedItem.status)}`}>{getStatusLabel(selectedItem.status)}</span>
                {renderMetaBadge('Ticket', selectedItem.transferredTicketRef)}
                {renderMetaBadge('PIC CS', selectedItem.csPicName)}
              </div>
              {renderWorkOrderLinks(selectedItem)}
              <div className="space-y-3 text-sm text-slate-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Alamat</p>
                  <p className="mt-1 leading-6">{selectedItem.addressText}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Paket dan ODP</p>
                  <p className="mt-1 leading-6">
                    {selectedItem.packageLabel || '-'}{selectedItem.odpCode ? ` • ${selectedItem.odpCode}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Jadwal Target</p>
                  <p className="mt-1">{formatDateTime(selectedItem.requestedInstallDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pengawalan</p>
                  <p className="mt-1 leading-6">{selectedItem.escortNotes || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Catatan Aktivitas</p>
                  <p className="mt-1 leading-6">{selectedItem.activityNotes || '-'}</p>
                </div>
                {selectedItem.reviewNotes ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Catatan Review CS</p>
                    <p className="mt-1 leading-6">{selectedItem.reviewNotes}</p>
                  </div>
                ) : null}
                {selectedItem.correctionNotes ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Catatan Koreksi</p>
                    <p className="mt-1 leading-6">{selectedItem.correctionNotes}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Jejak Fase 1</p>
                <div className="mt-3 space-y-2">
                  {selectedItem.auditSummary.map((item) => (
                    <div key={`${selectedItem.id}-${item}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Arah Batch Berikutnya</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="badge border-slate-200 bg-white text-slate-700">
                    {canUpdate ? 'Write-side review aktif' : 'Mode monitor'}
                  </span>
                  <span className="badge border-slate-200 bg-white text-slate-700">
                    {canApprove ? 'Approve dan transfer siap dipakai' : 'Approve menunggu role yang berwenang'}
                  </span>
                  <span className="badge border-slate-200 bg-white text-slate-700">WO PSB masuk jalur NOC</span>
                </div>
              </div>

              <PsbListTransitionForm
                itemId={selectedItem.id}
                itemCode={selectedItem.psbListCode}
                currentStatus={selectedItem.status}
                canUpdate={canUpdate}
                canApprove={canApprove}
                reviewDbReady={reviewDbReady}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Pilih salah satu item untuk membaca detail operasional.
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
