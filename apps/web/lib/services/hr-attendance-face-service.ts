import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type HrAttendanceFaceConfigRow = {
  id: number
  isRequired: number | null
  verificationMode: string | null
  autoVerifyHighConfidence: number | null
  autoVerifyMinScore: number | null
  notes: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export type HrAttendanceFaceConfig = {
  isRequired: boolean
  verificationMode: string
  autoVerifyHighConfidence: boolean
  autoVerifyMinScore: number
  notes: string
  updatedBy: string
  updatedAt: string
}

type HrAttendanceFaceReviewRow = {
  faceLogId: number
  attendanceId: number
  employeeId: number | null
  employeeCode: string
  attendanceDate: string
  verificationMode: string
  captureRef: string
  captureStatus: string
  baselineReferenceRef: string | null
  baselineVerificationMode: string | null
  reviewNotes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

export type HrAttendanceFaceReviewItem = {
  faceLogId: number
  attendanceId: number
  employeeId: number
  employeeCode: string
  attendanceDate: string
  verificationMode: string
  captureRef: string
  captureStatus: string
  matchScore: number
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW'
  recommendedDecision: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  recommendationReason: string
  autoReviewEligible: boolean
  baselineReferenceRef: string
  baselineVerificationMode: string
  baselineMatchScore: number
  baselineMatchBand: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_BASELINE'
  baselineMatchOutcome: 'MATCH' | 'REVIEW_MANUAL' | 'RETAKE' | 'NO_BASELINE'
  baselineMatchReason: string
  reviewNotes: string
  reviewedBy: string
  reviewedAt: string
  createdAt: string
}

type HrAttendanceFaceAnalyticsSummaryRow = {
  totalLogs: number | null
  pendingCount: number | null
  verifiedCount: number | null
  rejectedCount: number | null
  reviewedCount: number | null
  cameraCaptureCount: number | null
  manualReviewCount: number | null
  latestCaptureAt: string | null
  latestReviewAt: string | null
}

type HrAttendanceFaceAnalyticsSampleRow = {
  employeeCode: string
  verificationMode: string
  captureRef: string
  captureStatus: string
}

export type HrAttendanceFaceOutcomeAnalytics = {
  totalLogs: number
  pendingCount: number
  verifiedCount: number
  rejectedCount: number
  reviewedCount: number
  cameraCaptureCount: number
  manualReviewCount: number
  averageMatchScore: number
  highConfidenceCount: number
  mediumConfidenceCount: number
  lowConfidenceCount: number
  autoReviewEligibleCount: number
  recommendedVerifiedCount: number
  recommendedPendingReviewCount: number
  recommendedRejectedCount: number
  scoreSampleSize: number
  latestCaptureAt: string
  latestReviewAt: string
}

type HrEmployeeFaceReferenceRow = {
  referenceId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  employmentStatus: string
  verificationMode: string
  referenceRef: string
  notes: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export type HrEmployeeFaceReferenceItem = {
  referenceId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  employmentStatus: string
  verificationMode: string
  referenceRef: string
  notes: string
  updatedBy: string
  updatedAt: string
}

type HrEmployeeFaceReferenceHistoryRow = {
  historyId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  verificationMode: string
  referenceRef: string
  scoreSnapshot: number | null
  sourceType: string | null
  sourceRef: string | null
  notes: string | null
  updatedBy: string | null
  createdAt: string | null
}

export type HrEmployeeFaceReferenceHistoryItem = {
  historyId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  verificationMode: string
  referenceRef: string
  scoreSnapshot: number
  sourceType: string
  sourceRef: string
  notes: string
  updatedBy: string
  createdAt: string
}

type HrEmployeeFaceReferenceTrendRow = {
  employeeId: number
  employeeCode: string
  employeeName: string
  historyCount: number
  averageScore: number | null
  latestScore: number | null
  bestScore: number | null
  latestVerificationMode: string | null
  latestSourceType: string | null
  latestSourceRef: string | null
  latestUpdatedBy: string | null
  latestCreatedAt: string | null
}

export type HrEmployeeFaceReferenceTrendItem = {
  employeeId: number
  employeeCode: string
  employeeName: string
  historyCount: number
  averageScore: number
  latestScore: number
  bestScore: number
  latestVerificationMode: string
  latestSourceType: string
  latestSourceRef: string
  latestUpdatedBy: string
  latestCreatedAt: string
  driftStatus: 'STABLE' | 'WATCHLIST' | 'DRIFTING' | 'INSUFFICIENT_DATA'
  driftGapFromAverage: number
  driftGapFromBest: number
  driftReason: string
}

type HrVerifiedFaceReferenceCandidateRow = {
  faceLogId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  employmentStatus: string
  verificationMode: string
  captureRef: string
  reviewedAt: string | null
  currentReferenceRef: string | null
  currentReferenceMode: string | null
}

export type HrVerifiedFaceReferenceCandidateItem = {
  faceLogId: number
  employeeId: number
  employeeCode: string
  employeeName: string
  employmentStatus: string
  verificationMode: string
  captureRef: string
  reviewedAt: string
  currentReferenceRef: string
  currentReferenceMode: string
}

type HrAttendanceFaceRetakeQueueRow = {
  faceLogId: number
  attendanceId: number
  employeeCode: string
  captureRef: string
  queueStatus: string
  reasonText: string | null
  queuedBy: string | null
  queuedAt: string | null
  resolvedBy: string | null
  resolvedAt: string | null
}

export type HrAttendanceFaceRetakeQueueItem = {
  faceLogId: number
  attendanceId: number
  employeeCode: string
  captureRef: string
  queueStatus: string
  reasonText: string
  queuedBy: string
  queuedAt: string
  resolvedBy: string
  resolvedAt: string
}

export type HrAttendanceFacePriorityQueueItem = {
  queueType: 'RETAKE' | 'DRIFTING' | 'WATCHLIST'
  priorityScore: number
  employeeId: number
  employeeCode: string
  employeeName: string
  referenceRef: string
  attendanceId: number
  faceLogId: number
  captureRef: string
  retakeStatus: string
  driftStatus: HrEmployeeFaceReferenceTrendItem['driftStatus']
  latestScore: number
  averageScore: number
  bestScore: number
  driftGapFromAverage: number
  driftGapFromBest: number
  detailReason: string
  latestUpdatedBy: string
  latestUpdatedAt: string
}

type HrEmployeeLookupRow = {
  employeeId: number
  employeeCode: string
  employmentStatus: string
}

type HrFaceBaselineMatching = {
  baselineMatchScore: number
  baselineMatchBand: 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_BASELINE'
  baselineMatchOutcome: 'MATCH' | 'REVIEW_MANUAL' | 'RETAKE' | 'NO_BASELINE'
  baselineMatchReason: string
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeAutoVerifyMinScore(value: number | null | undefined) {
  return clampScore(typeof value === 'number' ? value : 85)
}

function normalizeCount(value: number | string | null | undefined) {
  return Math.max(0, Number(value ?? 0) || 0)
}

function buildFaceReferenceDriftSummary(params: {
  historyCount: number
  averageScore: number
  latestScore: number
  bestScore: number
}) {
  const historyCount = normalizeCount(params.historyCount)
  const averageScore = Number((Number(params.averageScore ?? 0) || 0).toFixed(1))
  const latestScore = normalizeCount(params.latestScore)
  const bestScore = normalizeCount(params.bestScore)
  const driftGapFromAverage = Number(Math.max(0, averageScore - latestScore).toFixed(1))
  const driftGapFromBest = Math.max(0, bestScore - latestScore)

  if (historyCount < 2) {
    return {
      driftStatus: 'INSUFFICIENT_DATA' as const,
      driftGapFromAverage,
      driftGapFromBest,
      driftReason: 'Histori baseline belum cukup untuk membaca tren penurunan kualitas.',
    }
  }

  if (driftGapFromAverage >= 15 || driftGapFromBest >= 20) {
    return {
      driftStatus: 'DRIFTING' as const,
      driftGapFromAverage,
      driftGapFromBest,
      driftReason: 'Skor terbaru turun jauh dari rata-rata atau skor terbaik, sehingga baseline perlu ditinjau ulang.',
    }
  }

  if (driftGapFromAverage >= 8 || driftGapFromBest >= 12) {
    return {
      driftStatus: 'WATCHLIST' as const,
      driftGapFromAverage,
      driftGapFromBest,
      driftReason: 'Kualitas baseline mulai melemah dan sebaiknya dimonitor pada capture berikutnya.',
    }
  }

  return {
    driftStatus: 'STABLE' as const,
    driftGapFromAverage,
    driftGapFromBest,
    driftReason: 'Skor terbaru masih dekat dengan baseline historis terbaik dan rata-rata employee.',
  }
}

function tokenizeReference(value: string) {
  return value
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((item) => item && item !== 'FACE' && item !== 'REFERENCE')
}

function buildFaceBaselineMatching(params: {
  captureRef: string
  verificationMode: string
  employeeCode: string
  baselineReferenceRef: string
  baselineVerificationMode: string
}): HrFaceBaselineMatching {
  const captureRef = params.captureRef.trim()
  const baselineReferenceRef = params.baselineReferenceRef.trim()

  if (!baselineReferenceRef) {
    return {
      baselineMatchScore: 0,
      baselineMatchBand: 'NO_BASELINE',
      baselineMatchOutcome: 'NO_BASELINE',
      baselineMatchReason: 'Baseline referensi wajah employee belum tersedia, jadi matching berbasis baseline belum bisa dihitung.',
    }
  }

  let score = 25
  const reasons: string[] = []
  const normalizedCaptureRef = captureRef.toUpperCase()
  const normalizedBaselineRef = baselineReferenceRef.toUpperCase()
  const normalizedVerificationMode = params.verificationMode.trim().toUpperCase()
  const normalizedBaselineMode = params.baselineVerificationMode.trim().toUpperCase()
  const normalizedEmployeeCode = params.employeeCode.trim().toUpperCase()

  if (normalizedCaptureRef === normalizedBaselineRef) {
    score += 45
    reasons.push('capture sama persis dengan baseline referensi')
  } else if (
    normalizedCaptureRef.includes(normalizedBaselineRef) ||
    normalizedBaselineRef.includes(normalizedCaptureRef)
  ) {
    score += 30
    reasons.push('capture dan baseline punya referensi yang sangat mirip')
  }

  const captureTokens = tokenizeReference(captureRef)
  const baselineTokens = tokenizeReference(baselineReferenceRef)
  const sharedTokens = baselineTokens.filter((token) => captureTokens.includes(token))

  if (baselineTokens.length > 0) {
    const overlapRatio = sharedTokens.length / baselineTokens.length
    score += Math.round(overlapRatio * 25)
    if (sharedTokens.length > 0) {
      reasons.push(`token referensi cocok ${sharedTokens.length}/${baselineTokens.length}`)
    }
  }

  if (normalizedEmployeeCode && normalizedCaptureRef.includes(normalizedEmployeeCode) && normalizedBaselineRef.includes(normalizedEmployeeCode)) {
    score += 10
    reasons.push('capture dan baseline sama-sama memuat kode employee')
  }

  if (normalizedVerificationMode && normalizedVerificationMode === normalizedBaselineMode) {
    score += 10
    reasons.push('mode capture sesuai dengan mode baseline')
  }

  const lengthGap = Math.abs(captureRef.length - baselineReferenceRef.length)
  if (lengthGap <= 8) {
    score += 5
    reasons.push('panjang referensi relatif konsisten')
  } else if (lengthGap >= 20) {
    score -= 10
    reasons.push('panjang referensi terlalu berbeda')
  }

  const baselineMatchScore = clampScore(score)
  if (baselineMatchScore >= 75) {
    return {
      baselineMatchScore,
      baselineMatchBand: 'HIGH',
      baselineMatchOutcome: 'MATCH',
      baselineMatchReason: `${reasons.join(', ')}; capture cukup dekat dengan baseline employee.`,
    }
  }

  if (baselineMatchScore >= 45) {
    return {
      baselineMatchScore,
      baselineMatchBand: 'MEDIUM',
      baselineMatchOutcome: 'REVIEW_MANUAL',
      baselineMatchReason: `${reasons.join(', ')}; masih perlu review manual terhadap baseline employee.`,
    }
  }

  return {
    baselineMatchScore,
    baselineMatchBand: 'LOW',
    baselineMatchOutcome: 'RETAKE',
    baselineMatchReason: `${reasons.join(', ')}; capture terlalu lemah terhadap baseline dan lebih aman diulang.`,
  }
}

function buildPlaceholderFaceRecommendation(params: {
  verificationMode: string
  captureRef: string
  captureStatus: string
  employeeCode: string
  config: HrAttendanceFaceConfig | null
  baselineMatching: HrFaceBaselineMatching
}) {
  const status = params.captureStatus.trim().toUpperCase()
  const autoVerifyEnabled = Boolean(params.config?.autoVerifyHighConfidence)
  const autoVerifyMinScore = normalizeAutoVerifyMinScore(params.config?.autoVerifyMinScore)
  if (status === 'VERIFIED') {
    return {
      matchScore: 100,
      confidenceBand: 'HIGH' as const,
      recommendedDecision: 'VERIFIED' as const,
      recommendationReason: 'Capture ini sudah diverifikasi manual oleh operator HR.',
      autoReviewEligible: autoVerifyEnabled,
    }
  }

  if (status === 'REJECTED') {
    return {
      matchScore: 20,
      confidenceBand: 'LOW' as const,
      recommendedDecision: 'REJECTED' as const,
      recommendationReason: 'Capture ini sudah ditandai tidak layak atau perlu pengambilan ulang.',
      autoReviewEligible: false,
    }
  }

  let score = 20
  const reasons: string[] = []
  const captureRef = params.captureRef.trim()
  const verificationMode = params.verificationMode.trim().toUpperCase()
  const employeeCode = params.employeeCode.trim().toUpperCase()

  if (verificationMode === 'CAMERA_CAPTURE') {
    score += 35
    reasons.push('capture berasal dari kamera browser')
  } else {
    score += 15
    reasons.push('capture masih memakai mode manual review')
  }

  if (captureRef.startsWith('face-')) {
    score += 20
    reasons.push('format referensi capture mengikuti pola snapshot browser')
  }

  if (employeeCode && captureRef.toUpperCase().includes(employeeCode)) {
    score += 15
    reasons.push('referensi capture memuat kode employee')
  }

  if (captureRef.length >= 24) {
    score += 10
    reasons.push('referensi capture cukup detail untuk pelacakan')
  } else if (captureRef.length < 10) {
    score -= 15
    reasons.push('referensi capture terlalu pendek')
  }

  const matchScore = clampScore(score)
  if (params.baselineMatching.baselineMatchOutcome === 'MATCH') {
    const boostedScore = clampScore(Math.max(matchScore, params.baselineMatching.baselineMatchScore))
    return {
      matchScore: boostedScore,
      confidenceBand: boostedScore >= 80 ? ('HIGH' as const) : ('MEDIUM' as const),
      recommendedDecision: 'VERIFIED' as const,
      recommendationReason: `${reasons.join(', ')}; baseline cocok. ${params.baselineMatching.baselineMatchReason}`,
      autoReviewEligible: autoVerifyEnabled && boostedScore >= autoVerifyMinScore,
    }
  }

  if (params.baselineMatching.baselineMatchOutcome === 'REVIEW_MANUAL') {
    const moderatedScore = clampScore(Math.max(matchScore, params.baselineMatching.baselineMatchScore))
    return {
      matchScore: moderatedScore,
      confidenceBand: 'MEDIUM' as const,
      recommendedDecision: 'PENDING_REVIEW' as const,
      recommendationReason: `${reasons.join(', ')}; baseline belum cukup kuat untuk auto-verify. ${params.baselineMatching.baselineMatchReason}`,
      autoReviewEligible: false,
    }
  }

  if (params.baselineMatching.baselineMatchOutcome === 'RETAKE') {
    const reducedScore = clampScore(Math.min(matchScore, params.baselineMatching.baselineMatchScore))
    return {
      matchScore: reducedScore,
      confidenceBand: 'LOW' as const,
      recommendedDecision: 'REJECTED' as const,
      recommendationReason: `${reasons.join(', ')}; baseline menyarankan retake. ${params.baselineMatching.baselineMatchReason}`,
      autoReviewEligible: false,
    }
  }

  if (matchScore >= 80) {
    return {
      matchScore,
      confidenceBand: 'HIGH' as const,
      recommendedDecision: 'VERIFIED' as const,
      recommendationReason: `${reasons.join(', ')}; threshold auto-verify ${autoVerifyMinScore}.`,
      autoReviewEligible: autoVerifyEnabled && matchScore >= autoVerifyMinScore,
    }
  }

  if (matchScore >= 50) {
    return {
      matchScore,
      confidenceBand: 'MEDIUM' as const,
      recommendedDecision: 'PENDING_REVIEW' as const,
      recommendationReason: `${reasons.join(', ')}; masih layak ditinjau manual dan belum memenuhi threshold auto-verify ${autoVerifyMinScore}.`,
      autoReviewEligible: false,
    }
  }

  return {
    matchScore,
    confidenceBand: 'LOW' as const,
    recommendedDecision: 'REJECTED' as const,
      recommendationReason: `${reasons.join(', ')}; capture sebaiknya diulang dan tidak memenuhi threshold auto-verify ${autoVerifyMinScore}.`,
    autoReviewEligible: false,
  }
}


let faceTablesEnsured = false

export async function ensureHrAttendanceFaceTables() {
  if (faceTablesEnsured) {
    return
  }

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_attendance_face_settings (
      id TINYINT UNSIGNED NOT NULL,
      is_required TINYINT(1) NOT NULL DEFAULT 0,
      verification_mode VARCHAR(40) NOT NULL DEFAULT 'MANUAL_REVIEW',
      auto_verify_high_confidence TINYINT(1) NOT NULL DEFAULT 0,
      auto_verify_min_score SMALLINT UNSIGNED NOT NULL DEFAULT 85,
      notes TEXT NULL,
      updated_by VARCHAR(150) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    ALTER TABLE hr_attendance_face_settings
    ADD COLUMN IF NOT EXISTS auto_verify_high_confidence TINYINT(1) NOT NULL DEFAULT 0 AFTER verification_mode
  `)

  await runReviewDbExecute<ExecuteResult>(`
    ALTER TABLE hr_attendance_face_settings
    ADD COLUMN IF NOT EXISTS auto_verify_min_score SMALLINT UNSIGNED NOT NULL DEFAULT 85 AFTER auto_verify_high_confidence
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_attendance_face_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      attendance_id BIGINT UNSIGNED NOT NULL,
      employee_code VARCHAR(80) NOT NULL,
      attendance_date DATE NOT NULL,
      verification_mode VARCHAR(40) NOT NULL,
      capture_ref VARCHAR(255) NOT NULL,
      capture_status VARCHAR(40) NOT NULL DEFAULT 'CAPTURED',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_hr_attendance_face_logs_attendance (attendance_id),
      KEY idx_hr_attendance_face_logs_created (created_at)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_attendance_face_reviews (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      face_log_id BIGINT UNSIGNED NOT NULL,
      decision_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_REVIEW',
      review_notes TEXT NULL,
      reviewed_by VARCHAR(150) NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_attendance_face_reviews_log (face_log_id),
      KEY idx_hr_attendance_face_reviews_status (decision_status)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_employee_face_references (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_id BIGINT UNSIGNED NOT NULL,
      employee_code VARCHAR(80) NOT NULL,
      verification_mode VARCHAR(40) NOT NULL DEFAULT 'CAMERA_CAPTURE',
      reference_ref VARCHAR(255) NOT NULL,
      notes TEXT NULL,
      updated_by VARCHAR(150) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_employee_face_references_employee (employee_id),
      KEY idx_hr_employee_face_references_code (employee_code),
      KEY idx_hr_employee_face_references_updated (updated_at)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_employee_face_reference_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_id BIGINT UNSIGNED NOT NULL,
      employee_code VARCHAR(80) NOT NULL,
      verification_mode VARCHAR(40) NOT NULL DEFAULT 'CAMERA_CAPTURE',
      reference_ref VARCHAR(255) NOT NULL,
      score_snapshot SMALLINT UNSIGNED NULL,
      source_type VARCHAR(60) NOT NULL DEFAULT 'MANUAL_ENTRY',
      source_ref VARCHAR(180) NULL,
      notes TEXT NULL,
      updated_by VARCHAR(150) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_hr_employee_face_reference_history_employee (employee_id),
      KEY idx_hr_employee_face_reference_history_created (created_at)
    )
  `)

  await runReviewDbExecute<ExecuteResult>(`
    CREATE TABLE IF NOT EXISTS hr_attendance_face_retake_queue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      face_log_id BIGINT UNSIGNED NOT NULL,
      attendance_id BIGINT UNSIGNED NOT NULL,
      employee_code VARCHAR(80) NOT NULL,
      capture_ref VARCHAR(255) NOT NULL,
      queue_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
      reason_text TEXT NULL,
      queued_by VARCHAR(150) NULL,
      queued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_by VARCHAR(150) NULL,
      resolved_at DATETIME NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_hr_attendance_face_retake_queue_log (face_log_id),
      KEY idx_hr_attendance_face_retake_queue_status (queue_status),
      KEY idx_hr_attendance_face_retake_queue_employee (employee_code)
    )
  `)

  faceTablesEnsured = true
}

export async function getHrAttendanceFaceConfig(): Promise<HrAttendanceFaceConfig | null> {
  await ensureHrAttendanceFaceTables()

  const [row] = await runReviewDbQuery<HrAttendanceFaceConfigRow>(
    `
      SELECT
        id,
        is_required AS isRequired,
        verification_mode AS verificationMode,
        auto_verify_high_confidence AS autoVerifyHighConfidence,
        auto_verify_min_score AS autoVerifyMinScore,
        notes,
        updated_by AS updatedBy,
        CAST(updated_at AS CHAR) AS updatedAt
      FROM hr_attendance_face_settings
      WHERE id = 1
      LIMIT 1
    `,
  )

  if (!row) {
    return null
  }

  return {
    isRequired: Number(row.isRequired ?? 0) === 1,
    verificationMode: row.verificationMode?.trim() || 'MANUAL_REVIEW',
    autoVerifyHighConfidence: Number(row.autoVerifyHighConfidence ?? 0) === 1,
    autoVerifyMinScore: normalizeAutoVerifyMinScore(Number(row.autoVerifyMinScore ?? 85)),
    notes: row.notes?.trim() || '',
    updatedBy: row.updatedBy?.trim() || '-',
    updatedAt: String(row.updatedAt ?? ''),
  }
}

export async function upsertHrAttendanceFaceConfig(params: {
  isRequired: boolean
  verificationMode: string
  autoVerifyHighConfidence: boolean
  autoVerifyMinScore: number
  notes: string
  updatedBy: string
}) {
  await ensureHrAttendanceFaceTables()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_attendance_face_settings (
        id,
        is_required,
        verification_mode,
        auto_verify_high_confidence,
        auto_verify_min_score,
        notes,
        updated_by
      )
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        is_required = VALUES(is_required),
        verification_mode = VALUES(verification_mode),
        auto_verify_high_confidence = VALUES(auto_verify_high_confidence),
        auto_verify_min_score = VALUES(auto_verify_min_score),
        notes = VALUES(notes),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      params.isRequired ? 1 : 0,
      params.verificationMode,
      params.autoVerifyHighConfidence ? 1 : 0,
      normalizeAutoVerifyMinScore(params.autoVerifyMinScore),
      params.notes || null,
      params.updatedBy,
    ],
  )
}

export async function recordHrAttendanceFaceLog(params: {
  attendanceId: number
  employeeCode: string
  attendanceDate: string
  verificationMode: string
  captureRef: string
  captureStatus: string
}) {
  await ensureHrAttendanceFaceTables()

  const insertResult = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_attendance_face_logs (
        attendance_id,
        employee_code,
        attendance_date,
        verification_mode,
        capture_ref,
        capture_status
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      params.attendanceId,
      params.employeeCode,
      params.attendanceDate,
      params.verificationMode,
      params.captureRef,
      params.captureStatus,
    ],
  )

  if (insertResult.insertId) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO hr_attendance_face_reviews (
          face_log_id,
          decision_status
        )
        VALUES (?, 'PENDING_REVIEW')
      `,
      [insertResult.insertId],
    )
  }
}

export async function getRecentHrAttendanceFaceReviewItems(limit = 5): Promise<HrAttendanceFaceReviewItem[]> {
  await ensureHrAttendanceFaceTables()
  const config = await getHrAttendanceFaceConfig().catch(() => null)

  const rows = await runReviewDbQuery<HrAttendanceFaceReviewRow>(
    `
      SELECT
        fl.id AS faceLogId,
        fl.attendance_id AS attendanceId,
        he.id AS employeeId,
        fl.employee_code AS employeeCode,
        CAST(fl.attendance_date AS CHAR) AS attendanceDate,
        fl.verification_mode AS verificationMode,
        fl.capture_ref AS captureRef,
        COALESCE(fr.decision_status, fl.capture_status, 'PENDING_REVIEW') AS captureStatus,
        ref.reference_ref AS baselineReferenceRef,
        ref.verification_mode AS baselineVerificationMode,
        fr.review_notes AS reviewNotes,
        fr.reviewed_by AS reviewedBy,
        CAST(fr.reviewed_at AS CHAR) AS reviewedAt,
        CAST(fl.created_at AS CHAR) AS createdAt
      FROM hr_attendance_face_logs fl
      LEFT JOIN hr_employees he
        ON UPPER(he.employee_code) = UPPER(fl.employee_code)
      LEFT JOIN hr_employee_face_references ref
        ON ref.employee_id = he.id
      LEFT JOIN hr_attendance_face_reviews fr
        ON fr.face_log_id = fl.id
      ORDER BY fl.created_at DESC, fl.id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => {
    const baselineMatching = buildFaceBaselineMatching({
      captureRef: row.captureRef,
      verificationMode: row.verificationMode,
      employeeCode: row.employeeCode,
      baselineReferenceRef: row.baselineReferenceRef?.trim() || '',
      baselineVerificationMode: row.baselineVerificationMode?.trim() || '',
    })

    return {
      ...buildPlaceholderFaceRecommendation({
        verificationMode: row.verificationMode,
        captureRef: row.captureRef,
        captureStatus: row.captureStatus,
        employeeCode: row.employeeCode,
        config,
        baselineMatching,
      }),
      faceLogId: row.faceLogId,
      attendanceId: row.attendanceId,
      employeeId: Number(row.employeeId ?? 0),
      employeeCode: row.employeeCode,
      attendanceDate: String(row.attendanceDate ?? ''),
      verificationMode: row.verificationMode,
      captureRef: row.captureRef,
      captureStatus: row.captureStatus,
      baselineReferenceRef: row.baselineReferenceRef?.trim() || '',
      baselineVerificationMode: row.baselineVerificationMode?.trim() || '',
      baselineMatchScore: baselineMatching.baselineMatchScore,
      baselineMatchBand: baselineMatching.baselineMatchBand,
      baselineMatchOutcome: baselineMatching.baselineMatchOutcome,
      baselineMatchReason: baselineMatching.baselineMatchReason,
      reviewNotes: row.reviewNotes?.trim() || '',
      reviewedBy: row.reviewedBy?.trim() || '',
      reviewedAt: String(row.reviewedAt ?? ''),
      createdAt: String(row.createdAt ?? ''),
    }
  })
}

export async function getHrAttendanceFaceOutcomeAnalytics(sampleLimit = 200): Promise<HrAttendanceFaceOutcomeAnalytics> {
  await ensureHrAttendanceFaceTables()
  const config = await getHrAttendanceFaceConfig().catch(() => null)

  const [summary] = await runReviewDbQuery<HrAttendanceFaceAnalyticsSummaryRow>(
    `
      SELECT
        COUNT(*) AS totalLogs,
        SUM(
          CASE
            WHEN UPPER(TRIM(COALESCE(fr.decision_status, fl.capture_status, 'PENDING_REVIEW'))) = 'PENDING_REVIEW' THEN 1
            ELSE 0
          END
        ) AS pendingCount,
        SUM(
          CASE
            WHEN UPPER(TRIM(COALESCE(fr.decision_status, fl.capture_status, 'PENDING_REVIEW'))) = 'VERIFIED' THEN 1
            ELSE 0
          END
        ) AS verifiedCount,
        SUM(
          CASE
            WHEN UPPER(TRIM(COALESCE(fr.decision_status, fl.capture_status, 'PENDING_REVIEW'))) = 'REJECTED' THEN 1
            ELSE 0
          END
        ) AS rejectedCount,
        SUM(
          CASE
            WHEN UPPER(TRIM(COALESCE(fr.decision_status, fl.capture_status, 'PENDING_REVIEW'))) IN ('VERIFIED', 'REJECTED') THEN 1
            ELSE 0
          END
        ) AS reviewedCount,
        SUM(
          CASE
            WHEN UPPER(TRIM(fl.verification_mode)) = 'CAMERA_CAPTURE' THEN 1
            ELSE 0
          END
        ) AS cameraCaptureCount,
        SUM(
          CASE
            WHEN UPPER(TRIM(fl.verification_mode)) <> 'CAMERA_CAPTURE' THEN 1
            ELSE 0
          END
        ) AS manualReviewCount,
        CAST(MAX(fl.created_at) AS CHAR) AS latestCaptureAt,
        CAST(MAX(fr.reviewed_at) AS CHAR) AS latestReviewAt
      FROM hr_attendance_face_logs fl
      LEFT JOIN hr_attendance_face_reviews fr
        ON fr.face_log_id = fl.id
    `,
  )

  const sampleRows = await runReviewDbQuery<HrAttendanceFaceAnalyticsSampleRow>(
    `
      SELECT
        fl.employee_code AS employeeCode,
        fl.verification_mode AS verificationMode,
        fl.capture_ref AS captureRef,
        COALESCE(fr.decision_status, fl.capture_status, 'PENDING_REVIEW') AS captureStatus
      FROM hr_attendance_face_logs fl
      LEFT JOIN hr_attendance_face_reviews fr
        ON fr.face_log_id = fl.id
      ORDER BY fl.created_at DESC, fl.id DESC
      LIMIT ?
    `,
    [sampleLimit],
  )

  const sampledRecommendations = sampleRows.map((row) =>
    buildPlaceholderFaceRecommendation({
      verificationMode: row.verificationMode,
      captureRef: row.captureRef,
      captureStatus: row.captureStatus,
      employeeCode: row.employeeCode,
      config,
      baselineMatching: {
        baselineMatchScore: 0,
        baselineMatchBand: 'NO_BASELINE',
        baselineMatchOutcome: 'NO_BASELINE',
        baselineMatchReason: 'Analytics sample belum menghubungkan baseline employee secara detail.',
      },
    }),
  )

  const scoreSampleSize = sampledRecommendations.length
  const totalMatchScore = sampledRecommendations.reduce((sum, item) => sum + item.matchScore, 0)

  return {
    totalLogs: normalizeCount(summary?.totalLogs),
    pendingCount: normalizeCount(summary?.pendingCount),
    verifiedCount: normalizeCount(summary?.verifiedCount),
    rejectedCount: normalizeCount(summary?.rejectedCount),
    reviewedCount: normalizeCount(summary?.reviewedCount),
    cameraCaptureCount: normalizeCount(summary?.cameraCaptureCount),
    manualReviewCount: normalizeCount(summary?.manualReviewCount),
    averageMatchScore: scoreSampleSize > 0 ? Number((totalMatchScore / scoreSampleSize).toFixed(1)) : 0,
    highConfidenceCount: sampledRecommendations.filter((item) => item.confidenceBand === 'HIGH').length,
    mediumConfidenceCount: sampledRecommendations.filter((item) => item.confidenceBand === 'MEDIUM').length,
    lowConfidenceCount: sampledRecommendations.filter((item) => item.confidenceBand === 'LOW').length,
    autoReviewEligibleCount: sampledRecommendations.filter((item) => item.autoReviewEligible).length,
    recommendedVerifiedCount: sampledRecommendations.filter((item) => item.recommendedDecision === 'VERIFIED').length,
    recommendedPendingReviewCount: sampledRecommendations.filter((item) => item.recommendedDecision === 'PENDING_REVIEW').length,
    recommendedRejectedCount: sampledRecommendations.filter((item) => item.recommendedDecision === 'REJECTED').length,
    scoreSampleSize,
    latestCaptureAt: String(summary?.latestCaptureAt ?? ''),
    latestReviewAt: String(summary?.latestReviewAt ?? ''),
  }
}

export async function getRecentHrEmployeeFaceReferenceItems(limit = 5): Promise<HrEmployeeFaceReferenceItem[]> {
  await ensureHrAttendanceFaceTables()

  const rows = await runReviewDbQuery<HrEmployeeFaceReferenceRow>(
    `
      SELECT
        ref.id AS referenceId,
        ref.employee_id AS employeeId,
        ref.employee_code AS employeeCode,
        he.full_name AS employeeName,
        he.employment_status AS employmentStatus,
        ref.verification_mode AS verificationMode,
        ref.reference_ref AS referenceRef,
        ref.notes AS notes,
        ref.updated_by AS updatedBy,
        CAST(ref.updated_at AS CHAR) AS updatedAt
      FROM hr_employee_face_references ref
      JOIN hr_employees he
        ON he.id = ref.employee_id
      ORDER BY ref.updated_at DESC, ref.id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => ({
    referenceId: row.referenceId,
    employeeId: row.employeeId,
    employeeCode: row.employeeCode,
    employeeName: row.employeeName?.trim() || '-',
    employmentStatus: row.employmentStatus?.trim() || '-',
    verificationMode: row.verificationMode?.trim() || 'CAMERA_CAPTURE',
    referenceRef: row.referenceRef?.trim() || '',
    notes: row.notes?.trim() || '',
    updatedBy: row.updatedBy?.trim() || '-',
    updatedAt: String(row.updatedAt ?? ''),
  }))
}

export async function getRecentHrEmployeeFaceReferenceHistoryItems(
  limit = 8,
): Promise<HrEmployeeFaceReferenceHistoryItem[]> {
  await ensureHrAttendanceFaceTables()

  const rows = await runReviewDbQuery<HrEmployeeFaceReferenceHistoryRow>(
    `
      SELECT
        hist.id AS historyId,
        hist.employee_id AS employeeId,
        hist.employee_code AS employeeCode,
        he.full_name AS employeeName,
        hist.verification_mode AS verificationMode,
        hist.reference_ref AS referenceRef,
        hist.score_snapshot AS scoreSnapshot,
        hist.source_type AS sourceType,
        hist.source_ref AS sourceRef,
        hist.notes AS notes,
        hist.updated_by AS updatedBy,
        CAST(hist.created_at AS CHAR) AS createdAt
      FROM hr_employee_face_reference_history hist
      JOIN hr_employees he
        ON he.id = hist.employee_id
      ORDER BY hist.created_at DESC, hist.id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => ({
    historyId: row.historyId,
    employeeId: row.employeeId,
    employeeCode: row.employeeCode?.trim() || '-',
    employeeName: row.employeeName?.trim() || '-',
    verificationMode: row.verificationMode?.trim() || 'CAMERA_CAPTURE',
    referenceRef: row.referenceRef?.trim() || '',
    scoreSnapshot: normalizeCount(row.scoreSnapshot),
    sourceType: row.sourceType?.trim() || 'MANUAL_ENTRY',
    sourceRef: row.sourceRef?.trim() || '',
    notes: row.notes?.trim() || '',
    updatedBy: row.updatedBy?.trim() || '-',
    createdAt: String(row.createdAt ?? ''),
  }))
}

export async function getHrEmployeeFaceReferenceTrendItems(limit = 5): Promise<HrEmployeeFaceReferenceTrendItem[]> {
  await ensureHrAttendanceFaceTables()

  const rows = await runReviewDbQuery<HrEmployeeFaceReferenceTrendRow>(
    `
      SELECT
        latest.employee_id AS employeeId,
        latest.employee_code AS employeeCode,
        he.full_name AS employeeName,
        counts.history_count AS historyCount,
        counts.averageScore AS averageScore,
        latest.score_snapshot AS latestScore,
        counts.bestScore AS bestScore,
        latest.verification_mode AS latestVerificationMode,
        latest.source_type AS latestSourceType,
        latest.source_ref AS latestSourceRef,
        latest.updated_by AS latestUpdatedBy,
        CAST(latest.created_at AS CHAR) AS latestCreatedAt
      FROM (
        SELECT
          hist.employee_id,
          hist.employee_code,
          hist.verification_mode,
          hist.score_snapshot,
          hist.source_type,
          hist.source_ref,
          hist.updated_by,
          hist.created_at,
          hist.id
        FROM hr_employee_face_reference_history hist
        JOIN (
          SELECT
            employee_id,
            MAX(id) AS latestId
          FROM hr_employee_face_reference_history
          GROUP BY employee_id
        ) latest_hist
          ON latest_hist.latestId = hist.id
      ) latest
      JOIN hr_employees he
        ON he.id = latest.employee_id
      JOIN (
        SELECT
          employee_id,
          COUNT(*) AS history_count,
          AVG(COALESCE(score_snapshot, 0)) AS averageScore,
          MAX(COALESCE(score_snapshot, 0)) AS bestScore
        FROM hr_employee_face_reference_history
        GROUP BY employee_id
      ) counts
        ON counts.employee_id = latest.employee_id
      ORDER BY latest.created_at DESC, latest.id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => {
    const historyCount = normalizeCount(row.historyCount)
    const averageScore = Number((Number(row.averageScore ?? 0) || 0).toFixed(1))
    const latestScore = normalizeCount(row.latestScore)
    const bestScore = normalizeCount(row.bestScore)
    const driftSummary = buildFaceReferenceDriftSummary({
      historyCount,
      averageScore,
      latestScore,
      bestScore,
    })

    return {
      employeeId: row.employeeId,
      employeeCode: row.employeeCode?.trim() || '-',
      employeeName: row.employeeName?.trim() || '-',
      historyCount,
      averageScore,
      latestScore,
      bestScore,
      latestVerificationMode: row.latestVerificationMode?.trim() || 'CAMERA_CAPTURE',
      latestSourceType: row.latestSourceType?.trim() || 'MANUAL_ENTRY',
      latestSourceRef: row.latestSourceRef?.trim() || '',
      latestUpdatedBy: row.latestUpdatedBy?.trim() || '-',
      latestCreatedAt: String(row.latestCreatedAt ?? ''),
      driftStatus: driftSummary.driftStatus,
      driftGapFromAverage: driftSummary.driftGapFromAverage,
      driftGapFromBest: driftSummary.driftGapFromBest,
      driftReason: driftSummary.driftReason,
    }
  })
}

export async function getRecentHrAttendanceFaceRetakeQueueItems(limit = 5): Promise<HrAttendanceFaceRetakeQueueItem[]> {
  await ensureHrAttendanceFaceTables()

  const rows = await runReviewDbQuery<HrAttendanceFaceRetakeQueueRow>(
    `
      SELECT
        face_log_id AS faceLogId,
        attendance_id AS attendanceId,
        employee_code AS employeeCode,
        capture_ref AS captureRef,
        queue_status AS queueStatus,
        reason_text AS reasonText,
        queued_by AS queuedBy,
        CAST(queued_at AS CHAR) AS queuedAt,
        resolved_by AS resolvedBy,
        CAST(resolved_at AS CHAR) AS resolvedAt
      FROM hr_attendance_face_retake_queue
      ORDER BY
        CASE
          WHEN UPPER(TRIM(queue_status)) = 'PENDING' THEN 0
          ELSE 1
        END,
        queued_at DESC,
        face_log_id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => ({
    faceLogId: row.faceLogId,
    attendanceId: row.attendanceId,
    employeeCode: row.employeeCode?.trim() || '-',
    captureRef: row.captureRef?.trim() || '',
    queueStatus: row.queueStatus?.trim() || 'PENDING',
    reasonText: row.reasonText?.trim() || '',
    queuedBy: row.queuedBy?.trim() || '',
    queuedAt: String(row.queuedAt ?? ''),
    resolvedBy: row.resolvedBy?.trim() || '',
    resolvedAt: String(row.resolvedAt ?? ''),
  }))
}

export async function getHrAttendanceFacePriorityQueueItems(
  limit = 8,
): Promise<HrAttendanceFacePriorityQueueItem[]> {
  await ensureHrAttendanceFaceTables()

  const [trendItems, retakeItems, faceReferenceItems] = await Promise.all([
    getHrEmployeeFaceReferenceTrendItems(Math.max(limit * 2, 10)),
    getRecentHrAttendanceFaceRetakeQueueItems(Math.max(limit * 2, 10)),
    getRecentHrEmployeeFaceReferenceItems(Math.max(limit * 2, 10)),
  ])

  const referenceByEmployeeCode = new Map(faceReferenceItems.map((item) => [item.employeeCode.trim().toUpperCase(), item]))
  const trendByEmployeeCode = new Map(trendItems.map((item) => [item.employeeCode.trim().toUpperCase(), item]))
  const priorityItems: HrAttendanceFacePriorityQueueItem[] = []
  const seenKeys = new Set<string>()

  for (const retake of retakeItems) {
    if (retake.queueStatus.trim().toUpperCase() !== 'PENDING') {
      continue
    }

    const employeeCodeKey = retake.employeeCode.trim().toUpperCase()
    const trend = trendByEmployeeCode.get(employeeCodeKey)
    const reference = referenceByEmployeeCode.get(employeeCodeKey)
    const queueType =
      trend?.driftStatus === 'DRIFTING' ? ('DRIFTING' as const) : ('RETAKE' as const)
    const priorityScore = queueType === 'DRIFTING' ? 100 : trend?.driftStatus === 'WATCHLIST' ? 85 : 75
    const dedupeKey = `RETAKE:${retake.faceLogId}`

    seenKeys.add(dedupeKey)
    priorityItems.push({
      queueType,
      priorityScore,
      employeeId: reference?.employeeId ?? trend?.employeeId ?? 0,
      employeeCode: retake.employeeCode,
      employeeName: reference?.employeeName ?? trend?.employeeName ?? '-',
      referenceRef: reference?.referenceRef ?? '',
      attendanceId: retake.attendanceId,
      faceLogId: retake.faceLogId,
      captureRef: retake.captureRef,
      retakeStatus: retake.queueStatus,
      driftStatus: trend?.driftStatus ?? 'INSUFFICIENT_DATA',
      latestScore: trend?.latestScore ?? 0,
      averageScore: trend?.averageScore ?? 0,
      bestScore: trend?.bestScore ?? 0,
      driftGapFromAverage: trend?.driftGapFromAverage ?? 0,
      driftGapFromBest: trend?.driftGapFromBest ?? 0,
      detailReason:
        trend?.driftStatus === 'DRIFTING'
          ? `Retake masih pending dan baseline employee sedang drifting. ${trend.driftReason}`
          : retake.reasonText || 'Capture perlu diulang berdasarkan hasil review terakhir.',
      latestUpdatedBy: trend?.latestUpdatedBy ?? retake.queuedBy ?? '-',
      latestUpdatedAt: trend?.latestCreatedAt ?? retake.queuedAt,
    })
  }

  for (const trend of trendItems) {
    if (trend.driftStatus !== 'DRIFTING' && trend.driftStatus !== 'WATCHLIST') {
      continue
    }

    const pendingRetake = retakeItems.find(
      (item) =>
        item.employeeCode.trim().toUpperCase() === trend.employeeCode.trim().toUpperCase() &&
        item.queueStatus.trim().toUpperCase() === 'PENDING',
    )
    const dedupeKey = pendingRetake ? `RETAKE:${pendingRetake.faceLogId}` : `TREND:${trend.employeeId}`
    if (seenKeys.has(dedupeKey)) {
      continue
    }

    const reference = referenceByEmployeeCode.get(trend.employeeCode.trim().toUpperCase())
    seenKeys.add(dedupeKey)
    priorityItems.push({
      queueType: trend.driftStatus === 'DRIFTING' ? 'DRIFTING' : 'WATCHLIST',
      priorityScore: trend.driftStatus === 'DRIFTING' ? 90 : 60,
      employeeId: trend.employeeId,
      employeeCode: trend.employeeCode,
      employeeName: trend.employeeName,
      referenceRef: reference?.referenceRef ?? '',
      attendanceId: pendingRetake?.attendanceId ?? 0,
      faceLogId: pendingRetake?.faceLogId ?? 0,
      captureRef: pendingRetake?.captureRef ?? '',
      retakeStatus: pendingRetake?.queueStatus ?? 'NONE',
      driftStatus: trend.driftStatus,
      latestScore: trend.latestScore,
      averageScore: trend.averageScore,
      bestScore: trend.bestScore,
      driftGapFromAverage: trend.driftGapFromAverage,
      driftGapFromBest: trend.driftGapFromBest,
      detailReason: trend.driftReason,
      latestUpdatedBy: trend.latestUpdatedBy,
      latestUpdatedAt: trend.latestCreatedAt,
    })
  }

  return priorityItems
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore
      }
      return String(right.latestUpdatedAt).localeCompare(String(left.latestUpdatedAt))
    })
    .slice(0, limit)
}

export async function getVerifiedHrEmployeeFaceReferenceCandidates(
  limit = 5,
): Promise<HrVerifiedFaceReferenceCandidateItem[]> {
  await ensureHrAttendanceFaceTables()

  const rows = await runReviewDbQuery<HrVerifiedFaceReferenceCandidateRow>(
    `
      SELECT
        fl.id AS faceLogId,
        he.id AS employeeId,
        he.employee_code AS employeeCode,
        he.full_name AS employeeName,
        he.employment_status AS employmentStatus,
        fl.verification_mode AS verificationMode,
        fl.capture_ref AS captureRef,
        CAST(fr.reviewed_at AS CHAR) AS reviewedAt,
        ref.reference_ref AS currentReferenceRef,
        ref.verification_mode AS currentReferenceMode
      FROM hr_attendance_face_logs fl
      JOIN hr_attendance_face_reviews fr
        ON fr.face_log_id = fl.id
      JOIN hr_employees he
        ON UPPER(he.employee_code) = UPPER(fl.employee_code)
      LEFT JOIN hr_employee_face_references ref
        ON ref.employee_id = he.id
      WHERE UPPER(TRIM(fr.decision_status)) = 'VERIFIED'
        AND UPPER(TRIM(COALESCE(he.employment_status, ''))) <> 'ARCHIVED'
      ORDER BY COALESCE(fr.reviewed_at, fl.created_at) DESC, fl.id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => ({
    faceLogId: row.faceLogId,
    employeeId: row.employeeId,
    employeeCode: row.employeeCode?.trim() || '-',
    employeeName: row.employeeName?.trim() || '-',
    employmentStatus: row.employmentStatus?.trim() || '-',
    verificationMode: row.verificationMode?.trim() || 'CAMERA_CAPTURE',
    captureRef: row.captureRef?.trim() || '',
    reviewedAt: String(row.reviewedAt ?? ''),
    currentReferenceRef: row.currentReferenceRef?.trim() || '',
    currentReferenceMode: row.currentReferenceMode?.trim() || '',
  }))
}

export async function upsertHrEmployeeFaceReference(params: {
  employeeId: number
  employeeCode: string
  verificationMode: string
  referenceRef: string
  notes: string
  updatedBy: string
  scoreSnapshot?: number | null
  sourceType?: string
  sourceRef?: string
}) {
  await ensureHrAttendanceFaceTables()

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_employee_face_references (
        employee_id,
        employee_code,
        verification_mode,
        reference_ref,
        notes,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        employee_code = VALUES(employee_code),
        verification_mode = VALUES(verification_mode),
        reference_ref = VALUES(reference_ref),
        notes = VALUES(notes),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      params.employeeId,
      params.employeeCode,
      params.verificationMode,
      params.referenceRef,
      params.notes || null,
      params.updatedBy,
    ],
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_employee_face_reference_history (
        employee_id,
        employee_code,
        verification_mode,
        reference_ref,
        score_snapshot,
        source_type,
        source_ref,
        notes,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.employeeId,
      params.employeeCode,
      params.verificationMode,
      params.referenceRef,
      typeof params.scoreSnapshot === 'number' ? clampScore(params.scoreSnapshot) : null,
      params.sourceType?.trim() || 'MANUAL_ENTRY',
      params.sourceRef?.trim() || null,
      params.notes || null,
      params.updatedBy,
    ],
  )
}

async function getHrEmployeeByCode(employeeCode: string): Promise<HrEmployeeLookupRow | null> {
  const [row] = await runReviewDbQuery<HrEmployeeLookupRow>(
    `
      SELECT
        id AS employeeId,
        employee_code AS employeeCode,
        employment_status AS employmentStatus
      FROM hr_employees
      WHERE UPPER(employee_code) = UPPER(?)
      LIMIT 1
    `,
    [employeeCode],
  )

  if (!row) {
    return null
  }

  return {
    employeeId: row.employeeId,
    employeeCode: row.employeeCode?.trim() || employeeCode,
    employmentStatus: row.employmentStatus?.trim() || '',
  }
}

async function syncHrAttendanceFaceRetakeQueue(params: {
  faceLogId: number
  attendanceId: number
  employeeCode: string
  captureRef: string
  decisionStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  baselineMatchOutcome: HrAttendanceFaceReviewItem['baselineMatchOutcome']
  baselineMatchReason: string
  actedBy: string
}) {
  const shouldQueue = params.decisionStatus === 'REJECTED' && params.baselineMatchOutcome === 'RETAKE'

  if (shouldQueue) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO hr_attendance_face_retake_queue (
          face_log_id,
          attendance_id,
          employee_code,
          capture_ref,
          queue_status,
          reason_text,
          queued_by,
          queued_at,
          resolved_by,
          resolved_at
        )
        VALUES (?, ?, ?, ?, 'PENDING', ?, ?, CURRENT_TIMESTAMP, NULL, NULL)
        ON DUPLICATE KEY UPDATE
          attendance_id = VALUES(attendance_id),
          employee_code = VALUES(employee_code),
          capture_ref = VALUES(capture_ref),
          queue_status = 'PENDING',
          reason_text = VALUES(reason_text),
          queued_by = VALUES(queued_by),
          queued_at = CURRENT_TIMESTAMP,
          resolved_by = NULL,
          resolved_at = NULL
      `,
      [
        params.faceLogId,
        params.attendanceId,
        params.employeeCode,
        params.captureRef,
        params.baselineMatchReason,
        params.actedBy,
      ],
    )

    return 'PENDING' as const
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_attendance_face_retake_queue
      SET
        queue_status = CASE
          WHEN ? = 'VERIFIED' THEN 'RESOLVED'
          ELSE 'CANCELLED'
        END,
        resolved_by = ?,
        resolved_at = CURRENT_TIMESTAMP
      WHERE face_log_id = ?
        AND UPPER(TRIM(queue_status)) = 'PENDING'
    `,
    [params.decisionStatus, params.actedBy, params.faceLogId],
  )

  return null
}

export async function processHrAttendanceFaceReviewFeedback(params: {
  item: HrAttendanceFaceReviewItem
  decisionStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  actedBy: string
  applyBaselineFeedback: boolean
}) {
  await ensureHrAttendanceFaceTables()

  let baselineReinforced = false
  let retakeQueued = false

  if (params.applyBaselineFeedback && params.decisionStatus === 'VERIFIED' && params.item.baselineMatchOutcome === 'MATCH') {
    const employee = await getHrEmployeeByCode(params.item.employeeCode)
    const normalizedStatus = employee?.employmentStatus.trim().toUpperCase() || ''

    if (employee && normalizedStatus !== 'ARCHIVED') {
      await upsertHrEmployeeFaceReference({
        employeeId: employee.employeeId,
        employeeCode: employee.employeeCode,
        verificationMode: params.item.verificationMode,
        referenceRef: params.item.captureRef,
        notes: `Baseline diperkuat dari review attendance FACE-${params.item.faceLogId} yang berstatus VERIFIED + MATCH.`,
        updatedBy: params.actedBy,
        scoreSnapshot: params.item.matchScore,
        sourceType: 'FACE_REVIEW',
        sourceRef: `FACE-${params.item.faceLogId}`,
      })
      baselineReinforced = true
    }
  }

  const retakeStatus = await syncHrAttendanceFaceRetakeQueue({
    faceLogId: params.item.faceLogId,
    attendanceId: params.item.attendanceId,
    employeeCode: params.item.employeeCode,
    captureRef: params.item.captureRef,
    decisionStatus: params.decisionStatus,
    baselineMatchOutcome: params.item.baselineMatchOutcome,
    baselineMatchReason: params.item.baselineMatchReason,
    actedBy: params.actedBy,
  })

  if (retakeStatus === 'PENDING') {
    retakeQueued = true
  }

  return {
    baselineReinforced,
    retakeQueued,
  }
}

export async function reviewHrAttendanceFaceLog(params: {
  faceLogId: number
  decisionStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  reviewNotes: string
  reviewedBy: string
}) {
  await ensureHrAttendanceFaceTables()

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE hr_attendance_face_logs
      SET capture_status = ?
      WHERE id = ?
    `,
    [params.decisionStatus, params.faceLogId],
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO hr_attendance_face_reviews (
        face_log_id,
        decision_status,
        review_notes,
        reviewed_by,
        reviewed_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        decision_status = VALUES(decision_status),
        review_notes = VALUES(review_notes),
        reviewed_by = VALUES(reviewed_by),
        reviewed_at = CURRENT_TIMESTAMP
    `,
    [params.faceLogId, params.decisionStatus, params.reviewNotes || null, params.reviewedBy],
  )
}
