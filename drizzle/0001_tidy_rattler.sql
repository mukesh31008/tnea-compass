CREATE TABLE `round_cutoffs` (
	`college_branch_id` integer NOT NULL,
	`year` integer NOT NULL,
	`community` text NOT NULL,
	`round` integer NOT NULL,
	`cutoff_mark` real,
	`general_rank` integer,
	`rank_suffix` text,
	`candidate_count` integer,
	`source_document_id` text,
	`source_page` integer,
	`source_round` integer,
	PRIMARY KEY(`college_branch_id`, `year`, `community`, `round`),
	FOREIGN KEY (`college_branch_id`) REFERENCES `college_branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `round_cutoffs_year_community_idx` ON `round_cutoffs` (`year`,`community`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`authority` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`retrieved_at` text NOT NULL,
	`published_at` text,
	`sha256` text NOT NULL,
	`page_count` integer NOT NULL,
	`document_type` text NOT NULL,
	`year` integer NOT NULL,
	`round` integer,
	`status` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `source_documents_year_idx` ON `source_documents` (`year`);--> statement-breakpoint
CREATE INDEX `source_documents_type_idx` ON `source_documents` (`document_type`);--> statement-breakpoint
CREATE TABLE `vacancies` (
	`college_branch_id` integer NOT NULL,
	`year` integer NOT NULL,
	`community` text NOT NULL,
	`vacant_seats` integer NOT NULL,
	`source_document_id` text,
	`source_page` integer,
	PRIMARY KEY(`college_branch_id`, `year`, `community`),
	FOREIGN KEY (`college_branch_id`) REFERENCES `college_branches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `vacancies_year_community_idx` ON `vacancies` (`year`,`community`);--> statement-breakpoint
ALTER TABLE `branches` ADD `source_document_id` text REFERENCES source_documents(id);--> statement-breakpoint
ALTER TABLE `colleges` ADD `source_document_id` text REFERENCES source_documents(id);--> statement-breakpoint
ALTER TABLE `cutoffs` ADD `rank_suffix` text;--> statement-breakpoint
ALTER TABLE `cutoffs` ADD `candidate_count` integer;--> statement-breakpoint
ALTER TABLE `cutoffs` ADD `method` text;--> statement-breakpoint
ALTER TABLE `cutoffs` ADD `source_document_id` text REFERENCES source_documents(id);--> statement-breakpoint
ALTER TABLE `cutoffs` ADD `source_page` integer;--> statement-breakpoint
ALTER TABLE `cutoffs` ADD `source_round` integer;--> statement-breakpoint
ALTER TABLE `seat_matrix` ADD `source_document_id` text REFERENCES source_documents(id);--> statement-breakpoint
ALTER TABLE `seat_matrix` ADD `source_page` integer;