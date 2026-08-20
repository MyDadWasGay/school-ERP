CREATE TABLE `transport_boarding_events` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `route_id` text NOT NULL,
  `student_id` text NOT NULL,
  `stop_id` text NOT NULL,
  `event_date` integer NOT NULL,
  `trip_type` text DEFAULT 'morning' NOT NULL,
  `event_type` text NOT NULL,
  `note` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transport_boarding_event_unique` ON `transport_boarding_events` (`organization_id`,`route_id`,`student_id`,`event_date`,`trip_type`);
--> statement-breakpoint
CREATE INDEX `transport_boarding_event_route_idx` ON `transport_boarding_events` (`organization_id`,`route_id`,`event_date`);
--> statement-breakpoint
CREATE TABLE `transport_location_updates` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL,
  `campus_id` text,
  `route_id` text NOT NULL,
  `latitude` real NOT NULL,
  `longitude` real NOT NULL,
  `accuracy_meters` real,
  `recorded_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `created_by` text,
  `updated_by` text,
  `status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `transport_location_route_idx` ON `transport_location_updates` (`organization_id`,`route_id`,`recorded_at`);
