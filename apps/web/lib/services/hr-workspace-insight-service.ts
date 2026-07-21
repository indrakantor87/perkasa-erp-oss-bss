import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import type { DomainReviewSection, DomainReviewRow } from '@/lib/types'

type ReviewDbCountRow = {
  total: number | null
}

type AttendanceIssueRow = {
  attendanceId: number
  employeeCode: string | null
  employeeName: string | null
  divisionName: string | null
  attendanceDate: string | null
  status: string | null
  checkIn: string | null
  checkOut: string | null
}

type AttendanceStatusSummaryRow = {
  attendanceStatus: string | null
  total: number | null
}

type DisciplinaryRiskRow = {
  employeeId: number
  employeeCode: string | null
  employeeName: string | null
  divisionName: string | null
  issueCount: number | null
  severeCount: number | null
  lateCount: number | null
  latestDate: string | null
}

type KpiRiskRow = {
  kpiId: number
  employeeCode: string | null
  employeeName: string | null
  divisionName: string | null
  kpiMonth: number | null
  kpiYear: number | null
  score: number | null
  performanceBonus: number | null
  notes: string | null
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString('id-ID')
}

async function hasTable(tableName: string) {
  const rows = await runReviewDbQuery<ReviewDbCountRow>(
    `
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = ?
    `,
    [tableName],
  ).catch(() => [])

  return Number(rows[0]?.total ?? 0) > 0
}

function buildRows<T>(rows: T[], mapper: (row: T, index: number) => DomainReviewRow) {
  return rows.map((row, index) => mapper(row, index)).slice(0, 8)
}

export async function getHrWorkspaceInsightSections(workspace: 'permissions' | 'disciplinary') {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as DomainReviewSection[]
  }

  try {
    const [hasEmployees, hasAttendance, hasKpis] = await Promise.all([
      hasTable('hr_employees'),
      hasTable('hr_attendance'),
      hasTable('hr_employee_kpis'),
    ])

    if (!hasEmployees || !hasAttendance) {
      return []
    }

    if (workspace === 'permissions') {
      const [issues, statusSummary] = await Promise.all([
        runReviewDbQuery<AttendanceIssueRow>(
          `
            SELECT
              ha.id AS attendanceId,
              he.employee_code AS employeeCode,
              he.full_name AS employeeName,
              od.name AS divisionName,
              DATE_FORMAT(ha.attendance_date, '%Y-%m-%d') AS attendanceDate,
              ha.status AS status,
              CAST(ha.check_in AS CHAR) AS checkIn,
              CAST(ha.check_out AS CHAR) AS checkOut
            FROM hr_attendance ha
            JOIN hr_employees he
              ON he.id = ha.employee_id
            LEFT JOIN org_divisions od
              ON od.id = he.division_id
            WHERE ha.attendance_date >= CURRENT_DATE - INTERVAL 30 DAY
              AND COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN') NOT IN ('PRESENT', 'HADIR', 'ON_TIME', 'ONTIME')
            ORDER BY ha.attendance_date DESC, ha.id DESC
            LIMIT 12
          `,
        ),
        runReviewDbQuery<AttendanceStatusSummaryRow>(
          `
            SELECT
              COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN') AS attendanceStatus,
              COUNT(*) AS total
            FROM hr_attendance ha
            WHERE ha.attendance_date >= CURRENT_DATE - INTERVAL 30 DAY
              AND COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN') NOT IN ('PRESENT', 'HADIR', 'ON_TIME', 'ONTIME')
            GROUP BY COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN')
            ORDER BY total DESC, attendanceStatus ASC
            LIMIT 4
          `,
        ),
      ])

      return [
        {
          title: 'Kandidat Perizinan 30 Hari',
          description:
            'Data nyata dari attendance yang butuh tindak lanjut administratif, seperti sakit, izin, cuti, atau status kehadiran lain yang bukan hadir normal.',
          summary: [
            { label: 'Total Kasus', value: formatNumber(issues.length) },
            { label: 'Status Dominan', value: String(statusSummary[0]?.attendanceStatus ?? '-') },
            { label: 'Varian Status', value: formatNumber(statusSummary.length) },
          ],
          rows: buildRows(issues, (row) => ({
            id: `PERM-${row.attendanceId}`,
            primary: String(row.employeeName ?? '-'),
            secondary: String(row.status ?? 'UNKNOWN'),
            status: String(row.status ?? 'UNKNOWN').toUpperCase(),
            detail: `Attendance ${row.attendanceDate || '-'} perlu follow-up administratif untuk memastikan dokumen izin/cuti/sakit tercatat rapi.`,
            meta: [
              `Employee Code: ${row.employeeCode || '-'}`,
              `Division: ${row.divisionName || '-'}`,
              `Date: ${row.attendanceDate || '-'}`,
              `Check In: ${row.checkIn || '-'}`,
              `Check Out: ${row.checkOut || '-'}`,
            ],
          })),
        },
        {
          title: 'Ringkasan Status Perlu Dokumen',
          description: 'Ringkasan status attendance yang paling sering muncul sebagai kandidat perizinan pada 30 hari terakhir.',
          rows: buildRows(statusSummary, (row, index) => ({
            id: `PERM-SUMMARY-${index + 1}`,
            primary: String(row.attendanceStatus ?? 'UNKNOWN'),
            secondary: `${formatNumber(row.total)} kasus`,
            status: 'SUMMARY',
            detail: `Status ${String(row.attendanceStatus ?? 'UNKNOWN')} muncul ${formatNumber(row.total)} kali dan perlu dipastikan alur administrasinya.`,
            meta: [`Total: ${formatNumber(row.total)}`],
          })),
        },
      ]
    }

    const [riskRows, kpiRows] = await Promise.all([
      runReviewDbQuery<DisciplinaryRiskRow>(
        `
          SELECT
            he.id AS employeeId,
            he.employee_code AS employeeCode,
            he.full_name AS employeeName,
            od.name AS divisionName,
            COUNT(*) AS issueCount,
            SUM(CASE WHEN COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN') IN ('ABSENT', 'ALPHA', 'NO_SHOW') THEN 1 ELSE 0 END) AS severeCount,
            SUM(CASE WHEN COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN') IN ('LATE', 'LAMBAT') THEN 1 ELSE 0 END) AS lateCount,
            DATE_FORMAT(MAX(ha.attendance_date), '%Y-%m-%d') AS latestDate
          FROM hr_attendance ha
          JOIN hr_employees he
            ON he.id = ha.employee_id
          LEFT JOIN org_divisions od
            ON od.id = he.division_id
          WHERE ha.attendance_date >= CURRENT_DATE - INTERVAL 30 DAY
            AND COALESCE(UPPER(TRIM(ha.status)), 'UNKNOWN') NOT IN ('PRESENT', 'HADIR', 'ON_TIME', 'ONTIME')
          GROUP BY he.id, he.employee_code, he.full_name, od.name
          ORDER BY severeCount DESC, issueCount DESC, latestDate DESC
          LIMIT 12
        `,
      ),
      hasKpis
        ? runReviewDbQuery<KpiRiskRow>(
            `
              SELECT
                hek.id AS kpiId,
                he.employee_code AS employeeCode,
                he.full_name AS employeeName,
                od.name AS divisionName,
                hek.kpi_month AS kpiMonth,
                hek.kpi_year AS kpiYear,
                hek.score AS score,
                hek.performance_bonus AS performanceBonus,
                hek.notes AS notes
              FROM hr_employee_kpis hek
              JOIN hr_employees he
                ON he.id = hek.employee_id
              LEFT JOIN org_divisions od
                ON od.id = he.division_id
              WHERE hek.score <= 70
              ORDER BY hek.kpi_year DESC, hek.kpi_month DESC, hek.score ASC, hek.id DESC
              LIMIT 8
            `,
          )
        : Promise.resolve([] as KpiRiskRow[]),
    ])

    const sections: DomainReviewSection[] = [
      {
        title: 'Risiko Disiplin 30 Hari',
        description:
          'Kandidat pembinaan dan sanksi berbasis data attendance nyata, diprioritaskan dari jumlah kasus berat dan frekuensi kejadian.',
        summary: [
          { label: 'Karyawan Berisiko', value: formatNumber(riskRows.length) },
          { label: 'Kasus Berat', value: formatNumber(riskRows.reduce((sum, row) => sum + Number(row.severeCount ?? 0), 0)) },
          { label: 'Kasus Terlambat', value: formatNumber(riskRows.reduce((sum, row) => sum + Number(row.lateCount ?? 0), 0)) },
        ],
        rows: buildRows(riskRows, (row) => ({
          id: `DISC-${row.employeeId}`,
          primary: String(row.employeeName ?? '-'),
          secondary: `${formatNumber(row.issueCount)} kasus`,
          status: Number(row.severeCount ?? 0) > 0 ? 'PRIORITAS' : 'MONITOR',
          detail: `${formatNumber(row.issueCount)} kasus attendance non-normal dalam 30 hari terakhir, dengan ${formatNumber(row.severeCount)} kasus berat dan ${formatNumber(row.lateCount)} kasus terlambat.`,
          meta: [
            `Employee Code: ${row.employeeCode || '-'}`,
            `Division: ${row.divisionName || '-'}`,
            `Severe Count: ${formatNumber(row.severeCount)}`,
            `Latest Date: ${row.latestDate || '-'}`,
          ],
        })),
      },
    ]

    if (kpiRows.length > 0) {
      sections.push({
        title: 'KPI Di Bawah Ambang',
        description: 'Daftar KPI nyata yang bisa dipakai HR sebagai bahan pembinaan atau sanksi lanjutan.',
        rows: buildRows(kpiRows, (row) => ({
          id: `DISC-KPI-${row.kpiId}`,
          primary: String(row.employeeName ?? '-'),
          secondary: `Skor ${formatNumber(row.score)}`,
          status: Number(row.score ?? 0) <= 50 ? 'KRITIS' : 'PERLU COACHING',
          detail: `KPI periode ${String(row.kpiMonth ?? '-')}/${String(row.kpiYear ?? '-')} tercatat ${formatNumber(row.score)} dengan bonus performa ${formatNumber(row.performanceBonus)}.`,
          meta: [
            `Employee Code: ${row.employeeCode || '-'}`,
            `Division: ${row.divisionName || '-'}`,
            `Periode: ${String(row.kpiMonth ?? '-')}/${String(row.kpiYear ?? '-')}`,
            `Notes: ${row.notes || '-'}`,
          ],
        })),
      })
    }

    return sections
  } catch (error) {
    return [
      {
        title: workspace === 'permissions' ? 'Perizinan' : 'Sanksi',
        description: getReviewDbErrorDetail(error),
        rows: [],
      },
    ]
  }
}
