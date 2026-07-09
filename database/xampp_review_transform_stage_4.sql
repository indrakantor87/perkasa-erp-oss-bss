-- Jalankan file ini setelah transform tahap 3.
-- Transform tahap 4 ini fokus pada domain billing:
-- 1. billing_invoices
-- 2. billing_invoice_items
-- 3. billing_payments
-- 4. billing_collection_actions

USE erp_isp_review;

-- 1) Samakan target subscription invoice dari staging order/customer
UPDATE staging_legacy_billing_invoice_records bi
JOIN (
  SELECT
    source_system,
    legacy_id,
    MAX(target_subscription_id) AS target_subscription_id
  FROM staging_legacy_order_records
  WHERE target_subscription_id IS NOT NULL
    AND legacy_id IS NOT NULL
    AND TRIM(legacy_id) <> ''
  GROUP BY source_system, legacy_id
) so
  ON so.source_system = bi.source_system
  AND so.legacy_id = bi.legacy_subscription_ref
SET bi.target_subscription_id = so.target_subscription_id,
    bi.updated_at = CURRENT_TIMESTAMP
WHERE bi.target_subscription_id IS NULL
  AND bi.batch_id = @batch_id;

UPDATE staging_legacy_billing_invoice_records bi
JOIN (
  SELECT
    source_system,
    legacy_customer_id,
    MAX(target_subscription_id) AS target_subscription_id
  FROM staging_legacy_order_records
  WHERE target_subscription_id IS NOT NULL
    AND legacy_customer_id IS NOT NULL
    AND TRIM(legacy_customer_id) <> ''
  GROUP BY source_system, legacy_customer_id
) so
  ON so.source_system = bi.source_system
  AND so.legacy_customer_id = bi.legacy_customer_id
SET bi.target_subscription_id = so.target_subscription_id,
    bi.updated_at = CURRENT_TIMESTAMP
WHERE bi.target_subscription_id IS NULL
  AND bi.batch_id = @batch_id;

-- 2) Transform invoice ke billing_invoices
INSERT INTO billing_invoices (
  subscription_id,
  invoice_no,
  invoice_type,
  billing_month,
  billing_year,
  period_start,
  period_end,
  issue_date,
  due_date,
  subtotal,
  penalty_amount,
  discount_amount,
  total_amount,
  paid_amount,
  invoice_status,
  collection_status,
  suspend_candidate,
  notes
)
SELECT
  bi.target_subscription_id,
  COALESCE(NULLIF(TRIM(bi.invoice_no), ''), CONCAT('INV-LEGACY-', bi.id)),
  CASE
    WHEN UPPER(TRIM(bi.invoice_type)) = 'INSTALLATION' THEN 'INSTALLATION'
    WHEN UPPER(TRIM(bi.invoice_type)) = 'ADJUSTMENT' THEN 'ADJUSTMENT'
    WHEN UPPER(TRIM(bi.invoice_type)) = 'TERMINATION' THEN 'TERMINATION'
    ELSE 'RECURRING'
  END,
  bi.billing_month,
  bi.billing_year,
  bi.period_start,
  bi.period_end,
  COALESCE(bi.issue_date, CURRENT_DATE),
  COALESCE(bi.due_date, bi.issue_date, CURRENT_DATE),
  COALESCE(bi.subtotal, 0),
  COALESCE(bi.penalty_amount, 0),
  COALESCE(bi.discount_amount, 0),
  COALESCE(bi.total_amount, 0),
  COALESCE(bi.paid_amount, 0),
  CASE
    WHEN UPPER(TRIM(bi.invoice_status)) = 'ISSUED' THEN 'ISSUED'
    WHEN UPPER(TRIM(bi.invoice_status)) = 'PARTIAL' THEN 'PARTIAL'
    WHEN UPPER(TRIM(bi.invoice_status)) = 'PAID' THEN 'PAID'
    WHEN UPPER(TRIM(bi.invoice_status)) = 'OVERDUE' THEN 'OVERDUE'
    WHEN UPPER(TRIM(bi.invoice_status)) = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'DRAFT'
  END,
  CASE
    WHEN UPPER(TRIM(bi.collection_status)) = 'REMINDER' THEN 'REMINDER'
    WHEN UPPER(TRIM(bi.collection_status)) = 'PROMISE_TO_PAY' THEN 'PROMISE_TO_PAY'
    WHEN UPPER(TRIM(bi.collection_status)) = 'SUSPEND' THEN 'SUSPEND'
    WHEN UPPER(TRIM(bi.collection_status)) = 'FIELD_VISIT' THEN 'FIELD_VISIT'
    WHEN UPPER(TRIM(bi.collection_status)) = 'CLOSED' THEN 'CLOSED'
    ELSE 'NORMAL'
  END,
  COALESCE(bi.suspend_candidate, 0),
  bi.notes
FROM staging_legacy_billing_invoice_records bi
WHERE bi.import_status IN ('MAPPED', 'VALID')
  AND bi.batch_id = @batch_id
  AND bi.target_invoice_id IS NULL
  AND bi.target_subscription_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM billing_invoices i
    WHERE i.invoice_no = COALESCE(NULLIF(TRIM(bi.invoice_no), ''), CONCAT('INV-LEGACY-', bi.id))
  );

UPDATE staging_legacy_billing_invoice_records bi
JOIN billing_invoices i
  ON i.invoice_no = COALESCE(NULLIF(TRIM(bi.invoice_no), ''), CONCAT('INV-LEGACY-', bi.id))
SET bi.target_invoice_id = i.id,
    bi.import_status = 'IMPORTED',
    bi.imported_at = COALESCE(bi.imported_at, CURRENT_TIMESTAMP),
    bi.updated_at = CURRENT_TIMESTAMP
WHERE bi.import_status IN ('MAPPED', 'VALID')
  AND bi.batch_id = @batch_id
  AND bi.target_invoice_id IS NULL;

-- 3) Samakan target invoice pada staging item, payment, dan collection
UPDATE staging_legacy_billing_item_records ii
JOIN staging_legacy_billing_invoice_records bi
  ON bi.source_system = ii.source_system
  AND bi.legacy_id = ii.legacy_invoice_id
SET ii.target_invoice_id = bi.target_invoice_id,
    ii.updated_at = CURRENT_TIMESTAMP
WHERE ii.target_invoice_id IS NULL
  AND ii.batch_id = @batch_id
  AND bi.target_invoice_id IS NOT NULL;

UPDATE staging_legacy_billing_payment_records bp
JOIN staging_legacy_billing_invoice_records bi
  ON bi.source_system = bp.source_system
  AND bi.legacy_id = bp.legacy_invoice_id
SET bp.target_invoice_id = bi.target_invoice_id,
    bp.updated_at = CURRENT_TIMESTAMP
WHERE bp.target_invoice_id IS NULL
  AND bp.batch_id = @batch_id
  AND bi.target_invoice_id IS NOT NULL;

UPDATE staging_legacy_billing_collection_records bc
JOIN staging_legacy_billing_invoice_records bi
  ON bi.source_system = bc.source_system
  AND bi.legacy_id = bc.legacy_invoice_id
SET bc.target_invoice_id = bi.target_invoice_id,
    bc.updated_at = CURRENT_TIMESTAMP
WHERE bc.target_invoice_id IS NULL
  AND bc.batch_id = @batch_id
  AND bi.target_invoice_id IS NOT NULL;

-- 4) Transform invoice items
INSERT INTO billing_invoice_items (
  invoice_id,
  item_type,
  description,
  qty,
  unit_price,
  line_total
)
SELECT
  ii.target_invoice_id,
  CASE
    WHEN UPPER(TRIM(ii.item_type)) = 'INSTALLATION' THEN 'INSTALLATION'
    WHEN UPPER(TRIM(ii.item_type)) = 'DEVICE' THEN 'DEVICE'
    WHEN UPPER(TRIM(ii.item_type)) = 'PENALTY' THEN 'PENALTY'
    WHEN UPPER(TRIM(ii.item_type)) = 'DISCOUNT' THEN 'DISCOUNT'
    WHEN UPPER(TRIM(ii.item_type)) = 'OTHER' THEN 'OTHER'
    ELSE 'SUBSCRIPTION'
  END,
  COALESCE(NULLIF(TRIM(ii.description), ''), 'Legacy billing item'),
  COALESCE(ii.qty, 1),
  COALESCE(ii.unit_price, 0),
  COALESCE(ii.line_total, COALESCE(ii.qty, 1) * COALESCE(ii.unit_price, 0))
FROM staging_legacy_billing_item_records ii
WHERE ii.import_status IN ('MAPPED', 'VALID')
  AND ii.batch_id = @batch_id
  AND ii.target_item_id IS NULL
  AND ii.target_invoice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM billing_invoice_items it
    WHERE it.invoice_id = ii.target_invoice_id
      AND it.description = COALESCE(NULLIF(TRIM(ii.description), ''), 'Legacy billing item')
      AND it.line_total = COALESCE(ii.line_total, COALESCE(ii.qty, 1) * COALESCE(ii.unit_price, 0))
  );

UPDATE staging_legacy_billing_item_records ii
JOIN billing_invoice_items it
  ON it.invoice_id = ii.target_invoice_id
  AND it.description = COALESCE(NULLIF(TRIM(ii.description), ''), 'Legacy billing item')
  AND it.line_total = COALESCE(ii.line_total, COALESCE(ii.qty, 1) * COALESCE(ii.unit_price, 0))
SET ii.target_item_id = it.id,
    ii.import_status = 'IMPORTED',
    ii.imported_at = COALESCE(ii.imported_at, CURRENT_TIMESTAMP),
    ii.updated_at = CURRENT_TIMESTAMP
WHERE ii.import_status IN ('MAPPED', 'VALID')
  AND ii.batch_id = @batch_id
  AND ii.target_item_id IS NULL;

-- 5) Transform payments
INSERT INTO billing_payments (
  invoice_id,
  payment_no,
  payment_date,
  amount,
  payment_method,
  reference_no,
  received_by_user_id,
  notes
)
SELECT
  bp.target_invoice_id,
  NULLIF(TRIM(bp.payment_no), ''),
  COALESCE(bp.payment_date, CURRENT_TIMESTAMP),
  COALESCE(bp.amount, 0),
  CASE
    WHEN UPPER(TRIM(bp.payment_method)) = 'CASH' THEN 'CASH'
    WHEN UPPER(TRIM(bp.payment_method)) = 'EWALLET' THEN 'EWALLET'
    WHEN UPPER(TRIM(bp.payment_method)) = 'VA' THEN 'VA'
    WHEN UPPER(TRIM(bp.payment_method)) = 'OTHER' THEN 'OTHER'
    ELSE 'TRANSFER'
  END,
  NULLIF(TRIM(bp.reference_no), ''),
  au.id,
  bp.notes
FROM staging_legacy_billing_payment_records bp
LEFT JOIN staging_legacy_user_records su
  ON su.source_system = bp.source_system
  AND su.legacy_id = bp.received_by_legacy_user
LEFT JOIN auth_users au
  ON au.id = su.target_user_id
WHERE bp.import_status IN ('MAPPED', 'VALID')
  AND bp.batch_id = @batch_id
  AND bp.target_payment_id IS NULL
  AND bp.target_invoice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM billing_payments p
    WHERE COALESCE(p.payment_no, '') = COALESCE(NULLIF(TRIM(bp.payment_no), ''), '')
      AND p.invoice_id = bp.target_invoice_id
      AND p.amount = COALESCE(bp.amount, 0)
  );

UPDATE staging_legacy_billing_payment_records bp
JOIN billing_payments p
  ON COALESCE(p.payment_no, '') = COALESCE(NULLIF(TRIM(bp.payment_no), ''), '')
  AND p.invoice_id = bp.target_invoice_id
  AND p.amount = COALESCE(bp.amount, 0)
SET bp.target_payment_id = p.id,
    bp.import_status = 'IMPORTED',
    bp.imported_at = COALESCE(bp.imported_at, CURRENT_TIMESTAMP),
    bp.updated_at = CURRENT_TIMESTAMP
WHERE bp.import_status IN ('MAPPED', 'VALID')
  AND bp.batch_id = @batch_id
  AND bp.target_payment_id IS NULL;

-- 6) Transform collection actions
INSERT INTO billing_collection_actions (
  invoice_id,
  action_type,
  action_status,
  action_at,
  due_follow_up_at,
  handled_by_user_id,
  notes
)
SELECT
  bc.target_invoice_id,
  CASE
    WHEN UPPER(TRIM(bc.action_type)) = 'CALL' THEN 'CALL'
    WHEN UPPER(TRIM(bc.action_type)) = 'VISIT' THEN 'VISIT'
    WHEN UPPER(TRIM(bc.action_type)) = 'PROMISE_TO_PAY' THEN 'PROMISE_TO_PAY'
    WHEN UPPER(TRIM(bc.action_type)) = 'SUSPEND' THEN 'SUSPEND'
    WHEN UPPER(TRIM(bc.action_type)) = 'RECONNECT' THEN 'RECONNECT'
    WHEN UPPER(TRIM(bc.action_type)) = 'WRITE_OFF' THEN 'WRITE_OFF'
    ELSE 'REMINDER'
  END,
  CASE
    WHEN UPPER(TRIM(bc.action_status)) = 'DONE' THEN 'DONE'
    WHEN UPPER(TRIM(bc.action_status)) = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'OPEN'
  END,
  COALESCE(bc.action_at, CURRENT_TIMESTAMP),
  bc.due_follow_up_at,
  au.id,
  bc.notes
FROM staging_legacy_billing_collection_records bc
LEFT JOIN staging_legacy_user_records su
  ON su.source_system = bc.source_system
  AND su.legacy_id = bc.handled_by_legacy_user
LEFT JOIN auth_users au
  ON au.id = su.target_user_id
WHERE bc.import_status IN ('MAPPED', 'VALID')
  AND bc.batch_id = @batch_id
  AND bc.target_collection_action_id IS NULL
  AND bc.target_invoice_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM billing_collection_actions ca
    WHERE ca.invoice_id = bc.target_invoice_id
      AND ca.action_at = COALESCE(bc.action_at, CURRENT_TIMESTAMP)
      AND ca.action_type = CASE
        WHEN UPPER(TRIM(bc.action_type)) = 'CALL' THEN 'CALL'
        WHEN UPPER(TRIM(bc.action_type)) = 'VISIT' THEN 'VISIT'
        WHEN UPPER(TRIM(bc.action_type)) = 'PROMISE_TO_PAY' THEN 'PROMISE_TO_PAY'
        WHEN UPPER(TRIM(bc.action_type)) = 'SUSPEND' THEN 'SUSPEND'
        WHEN UPPER(TRIM(bc.action_type)) = 'RECONNECT' THEN 'RECONNECT'
        WHEN UPPER(TRIM(bc.action_type)) = 'WRITE_OFF' THEN 'WRITE_OFF'
        ELSE 'REMINDER'
      END
  );

UPDATE staging_legacy_billing_collection_records bc
JOIN billing_collection_actions ca
  ON ca.invoice_id = bc.target_invoice_id
  AND ca.action_at = COALESCE(bc.action_at, CURRENT_TIMESTAMP)
  AND ca.action_type = CASE
    WHEN UPPER(TRIM(bc.action_type)) = 'CALL' THEN 'CALL'
    WHEN UPPER(TRIM(bc.action_type)) = 'VISIT' THEN 'VISIT'
    WHEN UPPER(TRIM(bc.action_type)) = 'PROMISE_TO_PAY' THEN 'PROMISE_TO_PAY'
    WHEN UPPER(TRIM(bc.action_type)) = 'SUSPEND' THEN 'SUSPEND'
    WHEN UPPER(TRIM(bc.action_type)) = 'RECONNECT' THEN 'RECONNECT'
    WHEN UPPER(TRIM(bc.action_type)) = 'WRITE_OFF' THEN 'WRITE_OFF'
    ELSE 'REMINDER'
  END
SET bc.target_collection_action_id = ca.id,
    bc.import_status = 'IMPORTED',
    bc.imported_at = COALESCE(bc.imported_at, CURRENT_TIMESTAMP),
    bc.updated_at = CURRENT_TIMESTAMP
WHERE bc.import_status IN ('MAPPED', 'VALID')
  AND bc.batch_id = @batch_id
  AND bc.target_collection_action_id IS NULL;
