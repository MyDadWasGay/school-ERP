CREATE UNIQUE INDEX IF NOT EXISTS `staff_attendance_org_employee_date_unique`
ON `staff_attendance_records` (`organization_id`, `reference_id`, `effective_at`)
WHERE `status` <> 'archived';
