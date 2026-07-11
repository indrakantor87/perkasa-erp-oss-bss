-- Jalankan file ini setelah loader production support inti Web PSB selesai.
-- Transform ini fokus pada:
-- 1. Isolation -> support_isolations
-- 2. TroubleTicket -> support_trouble_tickets
-- 3. DismantleHistory -> support_dismantle_history
-- 4. DismantleTickets -> support_dismantle_queue

USE erp_isp_review;

SET @support_batch_id = (
  SELECT id
  FROM staging_import_batches
  WHERE batch_code = 'PROD-WEBPSB-SUPPORT-CORE-001'
  ORDER BY id DESC
  LIMIT 1
);

-- 1) Hubungkan staging support ke subscription final berbasis customer name + phone.
UPDATE staging_legacy_support_records ss
JOIN crm_customers c
  ON UPPER(TRIM(c.full_name)) = UPPER(TRIM(COALESCE(ss.customer_name, '')))
  AND (
    NULLIF(TRIM(ss.customer_phone), '') IS NULL
    OR NULLIF(TRIM(c.phone), '') = NULLIF(TRIM(ss.customer_phone), '')
  )
JOIN service_subscriptions sub
  ON sub.id = (
    SELECT sub_pick.id
    FROM service_subscriptions sub_pick
    WHERE sub_pick.customer_id = c.id
    ORDER BY CASE sub_pick.status
      WHEN 'ACTIVE' THEN 0
      WHEN 'SUSPENDED' THEN 1
      WHEN 'PENDING' THEN 2
      WHEN 'TERMINATED' THEN 3
      ELSE 9
    END,
    COALESCE(sub_pick.activated_at, sub_pick.created_at) DESC,
    sub_pick.id DESC
    LIMIT 1
  )
SET ss.target_subscription_id = sub.id,
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @support_batch_id
  AND ss.target_subscription_id IS NULL
  AND ss.support_type IN ('ISOLATION', 'TROUBLE_TICKET');

-- 2) Transform TroubleTicket ke final support_trouble_tickets.
INSERT INTO support_trouble_tickets (
  subscription_id,
  ticket_code,
  customer_name,
  customer_user,
  category,
  type,
  status,
  problem_category,
  resolution_action,
  opened_at,
  closed_at,
  notes,
  close_notes
)
SELECT
  ss.target_subscription_id,
  COALESCE(NULLIF(TRIM(ss.ticket_code), ''), CONCAT('PROD-TT-', LPAD(ss.id, 8, '0'))),
  COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer'),
  NULLIF(TRIM(ss.customer_user), ''),
  COALESCE(NULLIF(TRIM(ss.category), ''), 'TT'),
  COALESCE(NULLIF(TRIM(ss.trouble_type), ''), 'GENERAL'),
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL THEN 'CLOSED'
    ELSE 'OPEN'
  END,
  NULLIF(TRIM(ss.problem_category), ''),
  NULLIF(TRIM(ss.resolution_action), ''),
  COALESCE(ss.opened_at, CURRENT_TIMESTAMP),
  ss.closed_at,
  COALESCE(NULLIF(TRIM(ss.reason_text), ''), NULLIF(TRIM(ss.note_text), '')),
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL
      THEN COALESCE(NULLIF(TRIM(ss.note_text), ''), NULLIF(TRIM(ss.reason_text), ''))
    ELSE NULL
  END
FROM staging_legacy_support_records ss
WHERE ss.batch_id = @support_batch_id
  AND ss.support_type = 'TROUBLE_TICKET'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_trouble_tickets tt
    WHERE tt.ticket_code = COALESCE(NULLIF(TRIM(ss.ticket_code), ''), CONCAT('PROD-TT-', LPAD(ss.id, 8, '0')))
  );

UPDATE staging_legacy_support_records ss
JOIN support_trouble_tickets tt
  ON tt.ticket_code = COALESCE(NULLIF(TRIM(ss.ticket_code), ''), CONCAT('PROD-TT-', LPAD(ss.id, 8, '0')))
SET ss.target_trouble_ticket_id = tt.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @support_batch_id
  AND ss.support_type = 'TROUBLE_TICKET'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_trouble_ticket_id IS NULL;

-- 3) Transform Isolation ke final support_isolations.
INSERT INTO support_isolations (
  subscription_id,
  customer_name,
  customer_address,
  customer_phone,
  marketing_name,
  radbox_name,
  package_price,
  isolation_date,
  reason,
  status,
  restoration_date,
  close_note,
  is_archived,
  archived_at
)
SELECT
  ss.target_subscription_id,
  COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer'),
  NULLIF(TRIM(ss.customer_address), ''),
  NULLIF(TRIM(ss.customer_phone), ''),
  NULLIF(TRIM(ss.marketing_name), ''),
  NULLIF(TRIM(ss.radbox_name), ''),
  CASE
    WHEN JSON_VALID(ss.raw_payload) THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.price')) AS DECIMAL(15,2))
    ELSE NULL
  END,
  COALESCE(ss.opened_at, CURRENT_TIMESTAMP),
  COALESCE(NULLIF(TRIM(ss.reason_text), ''), NULLIF(TRIM(ss.note_text), '')),
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL THEN 'CLOSED'
    ELSE 'OPEN'
  END,
  ss.closed_at,
  CASE
    WHEN UPPER(TRIM(ss.support_status)) IN ('CLOSE', 'CLOSED') OR ss.closed_at IS NOT NULL
      THEN COALESCE(NULLIF(TRIM(ss.note_text), ''), NULLIF(TRIM(ss.reason_text), ''))
    ELSE NULL
  END,
  CASE
    WHEN JSON_VALID(ss.raw_payload) AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.isArchived')), 'false') IN ('true', '1')
      THEN 1
    ELSE 0
  END,
  CASE
    WHEN JSON_VALID(ss.raw_payload) THEN
      CASE
        WHEN JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.archivedAt')) IS NOT NULL
          AND JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.archivedAt')) <> ''
          AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.archivedAt'))) <> 'null'
        THEN STR_TO_DATE(
          REPLACE(
            REPLACE(
              SUBSTRING(JSON_UNQUOTE(JSON_EXTRACT(ss.raw_payload, '$.archivedAt')), 1, 19),
              'T',
              ' '
            ),
            'Z',
            ''
          ),
          '%Y-%m-%d %H:%i:%s'
        )
        ELSE NULL
      END
    ELSE NULL
  END
FROM staging_legacy_support_records ss
WHERE ss.batch_id = @support_batch_id
  AND ss.support_type = 'ISOLATION'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_isolation_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_isolations si
    WHERE si.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
      AND si.isolation_date = COALESCE(ss.opened_at, CURRENT_TIMESTAMP)
  );

UPDATE staging_legacy_support_records ss
JOIN support_isolations si
  ON si.customer_name = COALESCE(NULLIF(TRIM(ss.customer_name), ''), 'Legacy Customer')
  AND si.isolation_date = COALESCE(ss.opened_at, CURRENT_TIMESTAMP)
SET ss.target_isolation_id = si.id,
    ss.import_status = 'IMPORTED',
    ss.imported_at = COALESCE(ss.imported_at, CURRENT_TIMESTAMP),
    ss.updated_at = CURRENT_TIMESTAMP
WHERE ss.batch_id = @support_batch_id
  AND ss.support_type = 'ISOLATION'
  AND ss.import_status IN ('MAPPED', 'VALID')
  AND ss.target_isolation_id IS NULL;

-- 4) Hubungkan queue dismantle ke isolation final melalui sourceIsolationId.
UPDATE staging_legacy_support_records dq
JOIN staging_legacy_support_records iso
  ON iso.batch_id = dq.batch_id
  AND iso.support_type = 'ISOLATION'
  AND iso.legacy_id = dq.legacy_parent_id
  AND iso.target_isolation_id IS NOT NULL
SET dq.target_isolation_id = iso.target_isolation_id,
    dq.updated_at = CURRENT_TIMESTAMP
WHERE dq.batch_id = @support_batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.import_status IN ('MAPPED', 'VALID')
  AND dq.target_isolation_id IS NULL;

-- 5) Fallback queue dismantle ke isolation melalui customer + tanggal isolasi.
UPDATE staging_legacy_support_records dq
JOIN support_isolations si
  ON si.customer_name = COALESCE(NULLIF(TRIM(dq.customer_name), ''), 'Legacy Customer')
  AND si.isolation_date = COALESCE(dq.opened_at, si.isolation_date)
SET dq.target_isolation_id = si.id,
    dq.updated_at = CURRENT_TIMESTAMP
WHERE dq.batch_id = @support_batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.import_status IN ('MAPPED', 'VALID')
  AND dq.target_isolation_id IS NULL;

-- 5b) Bila queue production tidak punya row Isolation asal, buat isolation sintetis minimum
-- agar queue tetap bisa dimigrasikan tanpa melanggar FK support_dismantle_queue.
INSERT INTO support_isolations (
  subscription_id,
  customer_name,
  customer_address,
  customer_phone,
  marketing_name,
  radbox_name,
  package_price,
  isolation_date,
  reason,
  status,
  restoration_date,
  close_note,
  is_archived,
  archived_at
)
SELECT
  NULL,
  COALESCE(NULLIF(TRIM(dq.customer_name), ''), 'Legacy Customer'),
  NULLIF(TRIM(dq.customer_address), ''),
  NULLIF(TRIM(dq.customer_phone), ''),
  NULLIF(TRIM(dq.marketing_name), ''),
  NULLIF(TRIM(dq.radbox_name), ''),
  NULL,
  COALESCE(dq.opened_at, CURRENT_TIMESTAMP),
  COALESCE(NULLIF(TRIM(dq.reason_text), ''), 'Synthetic isolation from production dismantle queue'),
  CASE
    WHEN UPPER(TRIM(dq.support_status)) IN ('CLOSE', 'CLOSED') OR dq.closed_at IS NOT NULL THEN 'CLOSED'
    ELSE 'OPEN'
  END,
  dq.closed_at,
  NULLIF(TRIM(dq.note_text), ''),
  0,
  NULL
FROM staging_legacy_support_records dq
WHERE dq.batch_id = @support_batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.import_status IN ('MAPPED', 'VALID')
  AND dq.target_isolation_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_isolations si
    WHERE si.customer_name = COALESCE(NULLIF(TRIM(dq.customer_name), ''), 'Legacy Customer')
      AND si.isolation_date = COALESCE(dq.opened_at, CURRENT_TIMESTAMP)
  );

UPDATE staging_legacy_support_records dq
JOIN support_isolations si
  ON si.customer_name = COALESCE(NULLIF(TRIM(dq.customer_name), ''), 'Legacy Customer')
  AND si.isolation_date = COALESCE(dq.opened_at, CURRENT_TIMESTAMP)
SET dq.target_isolation_id = si.id,
    dq.updated_at = CURRENT_TIMESTAMP
WHERE dq.batch_id = @support_batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.import_status IN ('MAPPED', 'VALID')
  AND dq.target_isolation_id IS NULL;

-- 6) Transform DismantleTickets ke support_dismantle_queue.
INSERT INTO support_dismantle_queue (
  isolation_id,
  transfer_note,
  transferred_by_username,
  transferred_at,
  reopened_note
)
SELECT
  dq.target_isolation_id,
  NULLIF(
    TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(TRIM(dq.note_text), ''),
        CASE
          WHEN NULLIF(TRIM(dq.reason_text), '') IS NOT NULL
            AND NULLIF(TRIM(dq.reason_text), '') <> NULLIF(TRIM(dq.note_text), '')
          THEN CONCAT('Reason: ', TRIM(dq.reason_text))
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(TRIM(dq.legacy_reference_code), '') IS NOT NULL
          THEN CONCAT('Legacy Ticket: ', TRIM(dq.legacy_reference_code))
          ELSE NULL
        END
      )
    ),
    ''
  ),
  COALESCE(NULLIF(TRIM(dq.actor_name), ''), 'legacy-import'),
  COALESCE(dq.opened_at, CURRENT_TIMESTAMP),
  NULL
FROM staging_legacy_support_records dq
WHERE dq.batch_id = @support_batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.import_status IN ('MAPPED', 'VALID')
  AND dq.target_dismantle_queue_id IS NULL
  AND dq.target_isolation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_dismantle_queue final_dq
    WHERE final_dq.isolation_id = dq.target_isolation_id
  );

UPDATE staging_legacy_support_records dq
JOIN support_dismantle_queue final_dq
  ON final_dq.isolation_id = dq.target_isolation_id
SET dq.target_dismantle_queue_id = final_dq.id,
    dq.import_status = 'IMPORTED',
    dq.imported_at = COALESCE(dq.imported_at, CURRENT_TIMESTAMP),
    dq.updated_at = CURRENT_TIMESTAMP
WHERE dq.batch_id = @support_batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.import_status IN ('MAPPED', 'VALID')
  AND dq.target_dismantle_queue_id IS NULL
  AND dq.target_isolation_id IS NOT NULL;

-- 7) Hubungkan history ke isolation final melalui sourceIsolationId bila tersedia.
UPDATE staging_legacy_support_records dh
JOIN staging_legacy_support_records iso
  ON iso.batch_id = dh.batch_id
  AND iso.support_type = 'ISOLATION'
  AND iso.legacy_id = dh.legacy_parent_id
  AND iso.target_isolation_id IS NOT NULL
SET dh.target_isolation_id = iso.target_isolation_id,
    dh.updated_at = CURRENT_TIMESTAMP
WHERE dh.batch_id = @support_batch_id
  AND dh.support_type = 'DISMANTLE_HISTORY'
  AND dh.import_status IN ('MAPPED', 'VALID')
  AND dh.target_isolation_id IS NULL;

-- 8) Fallback history ke isolation melalui ticketDismantle yang sama pada queue.
UPDATE staging_legacy_support_records dh
JOIN staging_legacy_support_records dq
  ON dq.batch_id = dh.batch_id
  AND dq.support_type = 'DISMANTLE_QUEUE'
  AND dq.legacy_reference_code = dh.legacy_reference_code
  AND dq.target_isolation_id IS NOT NULL
SET dh.target_isolation_id = dq.target_isolation_id,
    dh.updated_at = CURRENT_TIMESTAMP
WHERE dh.batch_id = @support_batch_id
  AND dh.support_type = 'DISMANTLE_HISTORY'
  AND dh.import_status IN ('MAPPED', 'VALID')
  AND dh.target_isolation_id IS NULL;

-- 9) Fallback terakhir history ke isolation melalui customer name.
UPDATE staging_legacy_support_records dh
JOIN support_isolations si
  ON si.customer_name = COALESCE(NULLIF(TRIM(dh.customer_name), ''), 'Legacy Customer')
SET dh.target_isolation_id = si.id,
    dh.updated_at = CURRENT_TIMESTAMP
WHERE dh.batch_id = @support_batch_id
  AND dh.support_type = 'DISMANTLE_HISTORY'
  AND dh.import_status IN ('MAPPED', 'VALID')
  AND dh.target_isolation_id IS NULL;

-- 10) Transform DismantleHistory ke support_dismantle_history.
INSERT INTO support_dismantle_history (
  isolation_id,
  customer_name,
  customer_address,
  customer_phone,
  marketing_name,
  radbox_name,
  closed_at,
  close_note
)
SELECT
  dh.target_isolation_id,
  COALESCE(NULLIF(TRIM(dh.customer_name), ''), 'Legacy Customer'),
  NULLIF(TRIM(dh.customer_address), ''),
  NULLIF(TRIM(dh.customer_phone), ''),
  NULLIF(TRIM(dh.marketing_name), ''),
  NULLIF(TRIM(dh.radbox_name), ''),
  COALESCE(dh.closed_at, dh.opened_at, CURRENT_TIMESTAMP),
  NULLIF(
    TRIM(
      CONCAT_WS(
        ' | ',
        NULLIF(TRIM(dh.note_text), ''),
        CASE
          WHEN NULLIF(TRIM(dh.actor_name), '') IS NOT NULL
          THEN CONCAT('Closed By: ', TRIM(dh.actor_name))
          ELSE NULL
        END
      )
    ),
    ''
  )
FROM staging_legacy_support_records dh
JOIN (
  SELECT
    batch_id,
    COALESCE(NULLIF(TRIM(customer_name), ''), 'Legacy Customer') AS dedupe_customer_name,
    COALESCE(closed_at, opened_at) AS dedupe_closed_at,
    MIN(id) AS picked_id
  FROM staging_legacy_support_records
  WHERE batch_id = @support_batch_id
    AND support_type = 'DISMANTLE_HISTORY'
    AND import_status IN ('MAPPED', 'VALID')
  GROUP BY
    batch_id,
    COALESCE(NULLIF(TRIM(customer_name), ''), 'Legacy Customer'),
    COALESCE(closed_at, opened_at)
) dh_pick
  ON dh_pick.batch_id = dh.batch_id
  AND dh_pick.picked_id = dh.id
WHERE dh.batch_id = @support_batch_id
  AND dh.support_type = 'DISMANTLE_HISTORY'
  AND dh.import_status IN ('MAPPED', 'VALID')
  AND dh.target_dismantle_history_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM support_dismantle_history final_dh
    WHERE final_dh.customer_name = COALESCE(NULLIF(TRIM(dh.customer_name), ''), 'Legacy Customer')
      AND final_dh.closed_at = COALESCE(dh.closed_at, dh.opened_at, CURRENT_TIMESTAMP)
  );

UPDATE staging_legacy_support_records dh
JOIN support_dismantle_history final_dh
  ON final_dh.customer_name = COALESCE(NULLIF(TRIM(dh.customer_name), ''), 'Legacy Customer')
  AND final_dh.closed_at = COALESCE(dh.closed_at, dh.opened_at, CURRENT_TIMESTAMP)
SET dh.target_dismantle_history_id = final_dh.id,
    dh.import_status = 'IMPORTED',
    dh.imported_at = COALESCE(dh.imported_at, CURRENT_TIMESTAMP),
    dh.updated_at = CURRENT_TIMESTAMP
WHERE dh.batch_id = @support_batch_id
  AND dh.support_type = 'DISMANTLE_HISTORY'
  AND dh.import_status IN ('MAPPED', 'VALID')
  AND dh.target_dismantle_history_id IS NULL;
