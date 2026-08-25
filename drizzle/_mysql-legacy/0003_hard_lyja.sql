ALTER TABLE `orders` MODIFY COLUMN `deliveryAddress` text NOT NULL;
--> statement-breakpoint
ALTER TABLE `orders` DROP FOREIGN KEY `orders_addressId_addresses_id_fk`;
--> statement-breakpoint
ALTER TABLE `orders` DROP COLUMN `addressId`;
