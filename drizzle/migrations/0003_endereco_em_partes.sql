-- O endereço passa a ser preenchido em três campos no checkout.
-- As colunas são opcionais porque os pedidos já feitos não têm as partes,
-- só o endereço montado em deliveryAddress.

ALTER TABLE `orders` ADD `deliveryStreet` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryNumber` text;
--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryNeighborhood` text;
