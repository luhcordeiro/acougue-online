CREATE TABLE `printJobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lastError` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`printedAt` integer,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `printJobs_status_idx` ON `printJobs` (`status`,`id`);
