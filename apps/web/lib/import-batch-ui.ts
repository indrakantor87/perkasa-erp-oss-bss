export function deriveHasExistingRows(batch: { totalRows: number }, detail: { rows: unknown[] }) {
  return batch.totalRows > 0 || detail.rows.length > 0
}
