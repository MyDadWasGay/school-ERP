WITH role_keys(key) AS (
  VALUES
    ('super_admin'), ('management'), ('principal'), ('office_staff'),
    ('teacher'), ('accountant'), ('librarian'), ('transport_staff'),
    ('hostel_warden'), ('parent'), ('student'), ('alumni')
)
INSERT INTO `roles` (
  `id`, `organization_id`, `key`, `name`, `is_system`,
  `created_at`, `updated_at`, `created_by`, `updated_by`, `status`
)
SELECT
  'role-' || organizations.`id` || '-' || role_keys.`key`,
  organizations.`id`,
  role_keys.`key`,
  replace(role_keys.`key`, '_', ' '),
  1,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  'migration-0005',
  'migration-0005',
  'active'
FROM organizations
CROSS JOIN role_keys
WHERE NOT EXISTS (
  SELECT 1
  FROM `roles` existing_roles
  WHERE existing_roles.`organization_id` = organizations.`id`
    AND existing_roles.`key` = role_keys.`key`
);
