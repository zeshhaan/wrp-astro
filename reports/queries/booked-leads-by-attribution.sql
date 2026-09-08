-- Compact aggregate-only outcome report. No customer fields leave D1.
WITH booked_touches AS (
  SELECT
    'first' AS attribution_position,
    COALESCE(json_extract(attribution_json, '$.first.source'), 'unknown') AS source,
    COALESCE(json_extract(attribution_json, '$.first.medium'), 'unknown') AS medium
  FROM leads
  WHERE outcome = 'booked'

  UNION ALL

  SELECT
    'latest' AS attribution_position,
    COALESCE(json_extract(attribution_json, '$.last.source'), 'unknown') AS source,
    COALESCE(json_extract(attribution_json, '$.last.medium'), 'unknown') AS medium
  FROM leads
  WHERE outcome = 'booked'
)
SELECT attribution_position, source, medium, COUNT(*) AS booked_leads
FROM booked_touches
GROUP BY attribution_position, source, medium
ORDER BY attribution_position, booked_leads DESC, source, medium;
