CREATE TABLE `cutTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cutTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productCutTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`cutTypeId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productCutTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orderItems` ADD `cutTypeName` varchar(100);--> statement-breakpoint
ALTER TABLE `productCutTypes` ADD CONSTRAINT `productCutTypes_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productCutTypes` ADD CONSTRAINT `productCutTypes_cutTypeId_cutTypes_id_fk` FOREIGN KEY (`cutTypeId`) REFERENCES `cutTypes`(`id`) ON DELETE no action ON UPDATE no action;