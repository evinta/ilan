CREATE INDEX `listings_category_status_idx` ON `listings` (`categoryId`,`status`);--> statement-breakpoint
CREATE INDEX `listings_location_status_idx` ON `listings` (`locationId`,`status`);