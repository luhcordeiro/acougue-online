ALTER TABLE `orders` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `customerName` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `customerPhone` varchar(20) NOT NULL;