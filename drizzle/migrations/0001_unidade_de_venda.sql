-- Produtos passam a poder ser vendidos por peça, não só a peso.
--
-- Escrita à mão em vez de gerada: o drizzle-kit não distingue renomear de
-- (dropar + criar) sem confirmação interativa, e dropar apagaria os preços.
-- RENAME COLUMN preserva os dados.

ALTER TABLE `products` RENAME COLUMN `pricePerKg` TO `price`;
--> statement-breakpoint
ALTER TABLE `products` ADD `unit` text DEFAULT 'kg' NOT NULL;
--> statement-breakpoint
ALTER TABLE `orderItems` RENAME COLUMN `pricePerKg` TO `price`;
--> statement-breakpoint
ALTER TABLE `orderItems` RENAME COLUMN `quantityGrams` TO `quantity`;
--> statement-breakpoint
ALTER TABLE `orderItems` ADD `unit` text DEFAULT 'kg' NOT NULL;
