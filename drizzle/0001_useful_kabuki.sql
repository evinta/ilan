CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(180) NOT NULL,
	`name` varchar(120) NOT NULL,
	`age` int NOT NULL,
	`district` varchar(80) NOT NULL,
	`location` varchar(160) NOT NULL,
	`summary` varchar(420) NOT NULL,
	`about` text NOT NULL,
	`height` varchar(32) NOT NULL DEFAULT 'Belirtilmedi',
	`languagesJson` text NOT NULL,
	`tagsJson` text NOT NULL,
	`imageKeysJson` text NOT NULL,
	`contactPhone` varchar(40),
	`contactVisible` boolean NOT NULL DEFAULT false,
	`isVerified` boolean NOT NULL DEFAULT false,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`adultConfirmed` boolean NOT NULL DEFAULT false,
	`imageRightsConfirmed` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`),
	CONSTRAINT `listings_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `listings_status_published_idx` ON `listings` (`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `listings_district_status_idx` ON `listings` (`district`,`status`);