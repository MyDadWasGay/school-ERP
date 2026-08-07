ALTER TABLE `hostel_rooms` ADD COLUMN `floor` text;
--> statement-breakpoint
ALTER TABLE `hostel_allotments` ADD COLUMN `bed_id` text;
--> statement-breakpoint
ALTER TABLE `hostel_allotments` ADD COLUMN `checked_out_on` integer;
--> statement-breakpoint
CREATE INDEX `hostel_allotments_room_idx` ON `hostel_allotments` (`organization_id`,`room_id`,`status`);
--> statement-breakpoint
CREATE INDEX `hostel_allotments_bed_idx` ON `hostel_allotments` (`organization_id`,`bed_id`,`status`);
--> statement-breakpoint
CREATE UNIQUE INDEX `hostel_active_student_unique` ON `hostel_allotments` (`organization_id`,`student_id`) WHERE `status` = 'active';
--> statement-breakpoint
CREATE UNIQUE INDEX `hostel_active_bed_unique` ON `hostel_allotments` (`organization_id`,`bed_id`) WHERE `status` = 'active' AND `bed_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `hostel_beds_scope_guard`
BEFORE INSERT ON `hostel_beds`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `hostel_rooms`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'hostel bed scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `hostel_beds_scope_update_guard`
BEFORE UPDATE ON `hostel_beds`
WHEN NEW.organization_id <> OLD.organization_id
  OR NEW.reference_id IS NULL
  OR NOT EXISTS (
    SELECT 1 FROM `hostel_rooms`
    WHERE id = NEW.reference_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
BEGIN SELECT RAISE(ABORT, 'hostel bed scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `hostel_allotments_scope_guard`
BEFORE INSERT ON `hostel_allotments`
WHEN NOT EXISTS (SELECT 1 FROM `organizations` WHERE id = NEW.organization_id)
  OR NOT EXISTS (
    SELECT 1 FROM `hostel_rooms`
    WHERE id = NEW.room_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR (NEW.bed_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `hostel_beds` WHERE id = NEW.bed_id AND organization_id = NEW.organization_id AND reference_id = NEW.room_id AND status = 'active'))
  OR NEW.status = 'active' AND EXISTS (SELECT 1 FROM `hostel_allotments` WHERE organization_id = NEW.organization_id AND student_id = NEW.student_id AND status = 'active')
  OR NEW.status = 'active' AND NEW.bed_id IS NOT NULL AND EXISTS (SELECT 1 FROM `hostel_allotments` WHERE organization_id = NEW.organization_id AND bed_id = NEW.bed_id AND status = 'active')
  OR NEW.status = 'active' AND (SELECT COUNT(*) FROM `hostel_allotments` WHERE organization_id = NEW.organization_id AND room_id = NEW.room_id AND status = 'active') >= (SELECT capacity FROM `hostel_rooms` WHERE id = NEW.room_id)
BEGIN SELECT RAISE(ABORT, 'hostel allotment capacity or scope is invalid'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `hostel_allotments_scope_update_guard`
BEFORE UPDATE ON `hostel_allotments`
WHEN NEW.organization_id <> OLD.organization_id
  OR NOT EXISTS (
    SELECT 1 FROM `hostel_rooms`
    WHERE id = NEW.room_id
      AND organization_id = NEW.organization_id
      AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL))
  )
  OR NOT EXISTS (SELECT 1 FROM `students` WHERE id = NEW.student_id AND organization_id = NEW.organization_id AND (campus_id = NEW.campus_id OR (campus_id IS NULL AND NEW.campus_id IS NULL)))
  OR (NEW.bed_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `hostel_beds` WHERE id = NEW.bed_id AND organization_id = NEW.organization_id AND reference_id = NEW.room_id AND status = 'active'))
  OR NEW.status = 'active' AND NOT (OLD.status = 'active' AND OLD.student_id = NEW.student_id) AND EXISTS (SELECT 1 FROM `hostel_allotments` WHERE organization_id = NEW.organization_id AND student_id = NEW.student_id AND status = 'active' AND id <> OLD.id)
  OR NEW.status = 'active' AND NEW.bed_id IS NOT NULL AND NOT (OLD.status = 'active' AND OLD.bed_id = NEW.bed_id) AND EXISTS (SELECT 1 FROM `hostel_allotments` WHERE organization_id = NEW.organization_id AND bed_id = NEW.bed_id AND status = 'active' AND id <> OLD.id)
  OR NEW.status = 'active' AND NOT (OLD.status = 'active' AND OLD.room_id = NEW.room_id) AND (SELECT COUNT(*) FROM `hostel_allotments` WHERE organization_id = NEW.organization_id AND room_id = NEW.room_id AND status = 'active' AND id <> OLD.id) >= (SELECT capacity FROM `hostel_rooms` WHERE id = NEW.room_id)
BEGIN SELECT RAISE(ABORT, 'hostel allotment capacity or scope is invalid'); END;
