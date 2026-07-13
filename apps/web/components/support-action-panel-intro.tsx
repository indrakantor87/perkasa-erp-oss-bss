export function SupportActionPanelIntro({
  laneLabel,
  detail,
  reviewDbReady,
}: {
  laneLabel: string
  detail: string
  reviewDbReady: boolean
}) {
  return (
    <div>
      <p className="section-title">Panel Aksi Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
        Form tindak lanjut lane {laneLabel}
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">{detail}</p>
      {!reviewDbReady ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mode review database belum aktif, sehingga form write-side dinonaktifkan agar tidak menulis ke mock.
        </div>
      ) : null}
    </div>
  )
}
