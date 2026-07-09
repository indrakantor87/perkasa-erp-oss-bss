import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
}

type HrAttendanceGeofenceConfigRow = {
  id: number
  locationName: string | null
  latitude: number | null
  longitude: number | null
  radiusMeters: number | null
  isRequired: number | null
  notes: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export type HrAttendanceGeofenceConfig = {
  locationName: string
  latitude: number | null
  longitude: number | null
  radiusMeters: number
  isRequired: boolean
  notes: string
  updatedBy: string
  updatedAt: string
}

let geofenceTablesEnsured = false

export async function ensureHrAttendanceGeofenceTables() {
  if (geofenceTablesEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_attendance_geofence_settings (
      id TINYINT UNSIGNED NOT NULL,
      location_name VARCHAR(180) NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      radius_meters DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      updated_by VARCHAR(150) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_attendance_geofence_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      attendance_id BIGINT UNSIGNED NOT NULL,
      employee_code VARCHAR(80) NOT NULL,
      attendance_date DATE NOT NULL,
      location_name VARCHAR(180) NOT NULL,
      configured_latitude DECIMAL(10, 7) NOT NULL,
      configured_longitude DECIMAL(10, 7) NOT NULL,
      configured_radius_meters DECIMAL(10, 2) NOT NULL,
      submitted_latitude DECIMAL(10, 7) NOT NULL,
      submitted_longitude DECIMAL(10, 7) NOT NULL,
      distance_meters DECIMAL(10, 2) NOT NULL,
      within_radius TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_hr_attendance_geofence_logs_attendance (attendance_id),
      KEY idx_hr_attendance_geofence_logs_created (created_at)
    )
  `)

  geofenceTablesEnsured = true
}

export async function getHrAttendanceGeofenceConfig(): Promise<HrAttendanceGeofenceConfig | null> {
  await ensureHrAttendanceGeofenceTables()

  const [row] = await runReviewDbQuery<HrAttendanceGeofenceConfigRow>(
    `
      SELECT
        id,
        location_name AS locationName,
        latitude,
        longitude,
        radius_meters AS radiusMeters,
        is_required AS isRequired,
        notes,
        updated_by AS updatedBy,
        CAST(updated_at AS CHAR) AS updatedAt
      FROM hr_attendance_geofence_settings
      WHERE id = 1
      LIMIT 1
    `,
  )

  if (!row) {
    return null
  }

  return {
    locationName: row.locationName?.trim() || 'Titik Kerja HR',
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    radiusMeters: Number(row.radiusMeters ?? 100),
    isRequired: Number(row.isRequired ?? 0) === 1,
    notes: row.notes?.trim() || '',
    updatedBy: row.updatedBy?.trim() || '-',
    updatedAt: String(row.updatedAt ?? ''),
  }
}

export async function upsertHrAttendanceGeofenceConfig(params: {
  locationName: string
  latitude: number
  longitude: number
  radiusMeters: number
  isRequired: boolean
  notes: string
  updatedBy: string
}) {
  await ensureHrAttendanceGeofenceTables()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_attendance_geofence_settings (
        id,
        location_name,
        latitude,
        longitude,
        radius_meters,
        is_required,
        notes,
        updated_by
      )
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        location_name = VALUES(location_name),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        radius_meters = VALUES(radius_meters),
        is_required = VALUES(is_required),
        notes = VALUES(notes),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      params.locationName,
      params.latitude,
      params.longitude,
      params.radiusMeters,
      params.isRequired ? 1 : 0,
      params.notes || null,
      params.updatedBy,
    ],
  )
}

export async function recordHrAttendanceGeofenceLog(params: {
  attendanceId: number
  employeeCode: string
  attendanceDate: string
  config: HrAttendanceGeofenceConfig
  submittedLatitude: number
  submittedLongitude: number
  distanceMeters: number
  withinRadius: boolean
}) {
  await ensureHrAttendanceGeofenceTables()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_attendance_geofence_logs (
        attendance_id,
        employee_code,
        attendance_date,
        location_name,
        configured_latitude,
        configured_longitude,
        configured_radius_meters,
        submitted_latitude,
        submitted_longitude,
        distance_meters,
        within_radius
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.attendanceId,
      params.employeeCode,
      params.attendanceDate,
      params.config.locationName,
      params.config.latitude,
      params.config.longitude,
      params.config.radiusMeters,
      params.submittedLatitude,
      params.submittedLongitude,
      params.distanceMeters,
      params.withinRadius ? 1 : 0,
    ],
  )
}

export function calculateDistanceMeters(
  leftLatitude: number,
  leftLongitude: number,
  rightLatitude: number,
  rightLongitude: number,
) {
  const earthRadius = 6_371_000
  const toRadians = (value: number) => (value * Math.PI) / 180

  const latitudeDelta = toRadians(rightLatitude - leftLatitude)
  const longitudeDelta = toRadians(rightLongitude - leftLongitude)
  const startLatitude = toRadians(leftLatitude)
  const endLatitude = toRadians(rightLatitude)

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}
