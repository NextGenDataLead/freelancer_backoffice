-- Check total time entries for tenant
SELECT 
  COUNT(*) as total_entries,
  COUNT(CASE WHEN billable = true AND invoiced = false THEN 1 END) as unbilled_billable,
  COUNT(CASE WHEN invoiced = true THEN 1 END) as invoiced,
  COUNT(CASE WHEN billable = false THEN 1 END) as non_billable
FROM time_entries
WHERE tenant_id = (
  SELECT tenant_id FROM profiles WHERE email = 'imre.iddatasolutions@gmail.com' LIMIT 1
);
