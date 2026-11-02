CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`seoTitle` varchar(180),
	`seoDescription` varchar(320),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `content_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(180) NOT NULL,
	`summary` varchar(320) NOT NULL,
	`body` text NOT NULL,
	`seoTitle` varchar(180),
	`seoDescription` varchar(320),
	`allowIndexing` boolean NOT NULL DEFAULT true,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`city` varchar(120) NOT NULL,
	`citySlug` varchar(140) NOT NULL,
	`district` varchar(120) NOT NULL,
	`districtSlug` varchar(140) NOT NULL,
	`description` text NOT NULL,
	`seoTitle` varchar(180),
	`seoDescription` varchar(320),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_city_district_slug_unique` UNIQUE(`citySlug`,`districtSlug`)
);
--> statement-breakpoint
CREATE TABLE `navigation_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`placement` enum('header','footer') NOT NULL,
	`label` varchar(100) NOT NULL,
	`href` varchar(500) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `navigation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int NOT NULL,
	`siteName` varchar(120) NOT NULL,
	`homeTitle` varchar(180) NOT NULL,
	`homeDescription` text NOT NULL,
	`heroEyebrow` varchar(80) NOT NULL,
	`heroHeading` varchar(220) NOT NULL,
	`heroBody` text NOT NULL,
	`defaultSeoTitle` varchar(180) NOT NULL,
	`defaultSeoDescription` varchar(320) NOT NULL,
	`defaultSocialImage` varchar(500),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `listings` ADD `categoryId` int;--> statement-breakpoint
ALTER TABLE `listings` ADD `locationId` int;--> statement-breakpoint
ALTER TABLE `listings` ADD `seoTitle` varchar(180);--> statement-breakpoint
ALTER TABLE `listings` ADD `seoDescription` varchar(320);--> statement-breakpoint
ALTER TABLE `listings` ADD `allowIndexing` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `categories_active_order_idx` ON `categories` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `content_pages_status_published_idx` ON `content_pages` (`status`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `locations_active_order_idx` ON `locations` (`isActive`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `navigation_placement_order_idx` ON `navigation_items` (`placement`,`sortOrder`);

--> statement-breakpoint
INSERT INTO `site_settings` (`id`, `siteName`, `homeTitle`, `homeDescription`, `heroEyebrow`, `heroHeading`, `heroBody`, `defaultSeoTitle`, `defaultSeoDescription`, `defaultSocialImage`)
SELECT 1, 'VIP İlan', 'Antalya''dan seçkiler | VIP İlan', 'Antalya''daki seçilmiş profilleri özenli ve güven odaklı bir vitrinde keşfet.', 'ANTALYA''DAN SEÇKİLER', 'Şehrin ritminde, özenle keşfet.', 'Antalya''nın farklı noktalarından seçilmiş profilleri tek bir yerde incele. Açık bilgi, özenli sunum ve saygılı iletişim.', 'VIP İlan — Antalya''dan Seçkiler', 'Antalya''daki seçilmiş profilleri özenli ve güven odaklı bir vitrinde keşfet. VIP İlan — 18+ yetişkin ziyaretçiler içindir.', NULL
WHERE NOT EXISTS (SELECT 1 FROM `site_settings` WHERE `id` = 1);
--> statement-breakpoint
INSERT INTO `locations` (`city`, `citySlug`, `district`, `districtSlug`, `description`, `seoTitle`, `seoDescription`, `sortOrder`, `isActive`)
SELECT 'Antalya', 'antalya', 'Merkez', 'merkez', 'Antalya merkez bölgesindeki yayındaki ilanları keşfedin.', NULL, NULL, 10, true
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE `citySlug` = 'antalya' AND `districtSlug` = 'merkez');
--> statement-breakpoint
INSERT INTO `locations` (`city`, `citySlug`, `district`, `districtSlug`, `description`, `seoTitle`, `seoDescription`, `sortOrder`, `isActive`)
SELECT 'Antalya', 'antalya', 'Lara', 'lara', 'Antalya Lara bölgesindeki yayındaki ilanları keşfedin.', NULL, NULL, 20, true
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE `citySlug` = 'antalya' AND `districtSlug` = 'lara');
--> statement-breakpoint
INSERT INTO `locations` (`city`, `citySlug`, `district`, `districtSlug`, `description`, `seoTitle`, `seoDescription`, `sortOrder`, `isActive`)
SELECT 'Antalya', 'antalya', 'Konyaaltı', 'konyaalti', 'Antalya Konyaaltı bölgesindeki yayındaki ilanları keşfedin.', NULL, NULL, 30, true
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE `citySlug` = 'antalya' AND `districtSlug` = 'konyaalti');
--> statement-breakpoint
INSERT INTO `locations` (`city`, `citySlug`, `district`, `districtSlug`, `description`, `seoTitle`, `seoDescription`, `sortOrder`, `isActive`)
SELECT 'Antalya', 'antalya', 'Muratpaşa', 'muratpasa', 'Antalya Muratpaşa bölgesindeki yayındaki ilanları keşfedin.', NULL, NULL, 40, true
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE `citySlug` = 'antalya' AND `districtSlug` = 'muratpasa');
--> statement-breakpoint
INSERT INTO `locations` (`city`, `citySlug`, `district`, `districtSlug`, `description`, `seoTitle`, `seoDescription`, `sortOrder`, `isActive`)
SELECT 'Antalya', 'antalya', 'Kepez', 'kepez', 'Antalya Kepez bölgesindeki yayındaki ilanları keşfedin.', NULL, NULL, 50, true
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE `citySlug` = 'antalya' AND `districtSlug` = 'kepez');
--> statement-breakpoint
INSERT INTO `locations` (`city`, `citySlug`, `district`, `districtSlug`, `description`, `seoTitle`, `seoDescription`, `sortOrder`, `isActive`)
SELECT 'Antalya', 'antalya', 'Diğer', 'diger', 'Antalya çevresindeki yayındaki ilanları keşfedin.', NULL, NULL, 60, true
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE `citySlug` = 'antalya' AND `districtSlug` = 'diger');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'header', 'Tümü', '/#profiles', 10, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'header' AND `label` = 'Tümü');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'header', 'Onaylı', '/#verified', 20, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'header' AND `label` = 'Onaylı');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'header', 'VIP', '/#featured', 30, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'header' AND `label` = 'VIP');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'header', 'Merkez', '/bolge/antalya/merkez', 40, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'header' AND `label` = 'Merkez');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'header', 'Lara', '/bolge/antalya/lara', 50, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'header' AND `label` = 'Lara');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'header', 'Konyaaltı', '/bolge/antalya/konyaalti', 60, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'header' AND `label` = 'Konyaaltı');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'footer', 'Tüm profiller', '/#profiles', 10, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'footer' AND `label` = 'Tüm profiller');
--> statement-breakpoint
INSERT INTO `navigation_items` (`placement`, `label`, `href`, `sortOrder`, `isActive`)
SELECT 'footer', 'Yayın ilkeleri', '/#community', 20, true WHERE NOT EXISTS (SELECT 1 FROM `navigation_items` WHERE `placement` = 'footer' AND `label` = 'Yayın ilkeleri');
--> statement-breakpoint
UPDATE `listings` AS `listing`
JOIN (
  SELECT MIN(`id`) AS `id`, LOWER(TRIM(`city`)) AS `cityKey`, LOWER(TRIM(`district`)) AS `districtKey`
  FROM `locations` WHERE `isActive` = true
  GROUP BY LOWER(TRIM(`city`)), LOWER(TRIM(`district`)) HAVING COUNT(*) = 1
) AS `uniqueLocation`
  ON (
    LOWER(TRIM(`listing`.`location`)) = `uniqueLocation`.`cityKey`
    OR LOWER(TRIM(`listing`.`location`)) = CONCAT(`uniqueLocation`.`cityKey`, ', ', `uniqueLocation`.`districtKey`)
  )
  AND LOWER(TRIM(`listing`.`district`)) = `uniqueLocation`.`districtKey`
SET `listing`.`locationId` = `uniqueLocation`.`id`
WHERE `listing`.`locationId` IS NULL;
