CREATE TABLE `branches` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `college_branches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`college_code` text NOT NULL,
	`branch_code` text NOT NULL,
	`branch_name` text NOT NULL,
	`approved_intake` integer,
	`year_started` integer,
	`nba` integer,
	`nba_valid_upto` integer,
	FOREIGN KEY (`college_code`) REFERENCES `colleges`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_code`) REFERENCES `branches`(`code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `college_branches_unique_idx` ON `college_branches` (`college_code`,`branch_code`,`branch_name`);--> statement-breakpoint
CREATE INDEX `college_branches_college_idx` ON `college_branches` (`college_code`);--> statement-breakpoint
CREATE INDEX `college_branches_branch_idx` ON `college_branches` (`branch_code`);--> statement-breakpoint
CREATE TABLE `colleges` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`district` text,
	`type` text NOT NULL,
	`autonomous` integer,
	`minority` integer,
	`address` text,
	`taluk` text,
	`pincode` text,
	`phone` text,
	`email` text,
	`website` text,
	`established_year` integer,
	`transport_available` integer
);
--> statement-breakpoint
CREATE INDEX `colleges_district_idx` ON `colleges` (`district`);--> statement-breakpoint
CREATE INDEX `colleges_type_idx` ON `colleges` (`type`);--> statement-breakpoint
CREATE INDEX `colleges_name_idx` ON `colleges` (`name`);--> statement-breakpoint
CREATE TABLE `cutoffs` (
	`college_branch_id` integer NOT NULL,
	`year` integer NOT NULL,
	`community` text NOT NULL,
	`cutoff_mark` real,
	`general_rank` integer,
	PRIMARY KEY(`college_branch_id`, `year`, `community`),
	FOREIGN KEY (`college_branch_id`) REFERENCES `college_branches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cutoffs_year_community_idx` ON `cutoffs` (`year`,`community`);--> statement-breakpoint
CREATE INDEX `cutoffs_mark_idx` ON `cutoffs` (`cutoff_mark`);--> statement-breakpoint
CREATE INDEX `cutoffs_rank_idx` ON `cutoffs` (`general_rank`);--> statement-breakpoint
CREATE TABLE `fees` (
	`college_code` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`tuition_fee` integer,
	`admission_fee` integer,
	`establishment_fee` integer,
	`hostel_fee` integer,
	`transport_min_fee` integer,
	`transport_max_fee` integer,
	FOREIGN KEY (`college_code`) REFERENCES `colleges`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `hostels` (
	`college_code` text PRIMARY KEY NOT NULL,
	`boys_available` integer,
	`girls_available` integer,
	FOREIGN KEY (`college_code`) REFERENCES `colleges`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seat_matrix` (
	`college_branch_id` integer NOT NULL,
	`year` integer NOT NULL,
	`total_seats` integer NOT NULL,
	`allotted` integer,
	`vacant` integer,
	PRIMARY KEY(`college_branch_id`, `year`),
	FOREIGN KEY (`college_branch_id`) REFERENCES `college_branches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `seat_matrix_year_idx` ON `seat_matrix` (`year`);