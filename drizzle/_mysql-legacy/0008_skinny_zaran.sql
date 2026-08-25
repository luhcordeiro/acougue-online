ALTER TABLE `orders` ADD `paymentMethod` enum('card','pix','cash') DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `changeFor` int;