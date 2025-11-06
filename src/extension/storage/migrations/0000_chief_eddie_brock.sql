CREATE TABLE `flow_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`file_hash` text NOT NULL,
	`code_hash` text NOT NULL,
	`language` text NOT NULL,
	`start_line` integer,
	`end_line` integer,
	`flow_chart_json` text NOT NULL,
	`code_snippet` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_accessed` integer NOT NULL,
	`access_count` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_file_code` ON `flow_cache` (`file_path`,`code_hash`);--> statement-breakpoint
CREATE INDEX `idx_file_hash` ON `flow_cache` (`file_path`,`file_hash`);--> statement-breakpoint
CREATE INDEX `idx_code_hash` ON `flow_cache` (`code_hash`);--> statement-breakpoint
CREATE INDEX `idx_last_accessed` ON `flow_cache` (`last_accessed`);