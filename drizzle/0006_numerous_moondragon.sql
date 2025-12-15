CREATE TABLE `productQuickQuantities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`quickQuantityId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productQuickQuantities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quickQuantities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`valueGrams` int NOT NULL,
	`label` varchar(50) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quickQuantities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `productQuickQuantities` ADD CONSTRAINT `productQuickQuantities_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productQuickQuantities` ADD CONSTRAINT `productQuickQuantities_quickQuantityId_quickQuantities_id_fk` FOREIGN KEY (`quickQuantityId`) REFERENCES `quickQuantities`(`id`) ON DELETE no action ON UPDATE no action;