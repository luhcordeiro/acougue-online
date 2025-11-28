ALTER TABLE `orders` MODIFY COLUMN `deliveryAddress` text NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `addressId`;
