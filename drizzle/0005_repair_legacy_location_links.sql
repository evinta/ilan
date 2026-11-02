-- Repair only the derived relation; keep all listing rows and original text intact.
UPDATE `listings` AS `listing`
LEFT JOIN `locations` AS `location` ON `location`.`id` = `listing`.`locationId`
SET `listing`.`locationId` = NULL
WHERE `listing`.`locationId` IS NOT NULL
  AND (
    `location`.`id` IS NULL
    OR `location`.`isActive` <> true
    OR NOT (
      LOWER(TRIM(`listing`.`location`)) = LOWER(TRIM(`location`.`city`))
      OR LOWER(TRIM(`listing`.`location`)) = CONCAT(LOWER(TRIM(`location`.`city`)), ', ', LOWER(TRIM(`location`.`district`)))
    )
    OR LOWER(TRIM(`listing`.`district`)) <> LOWER(TRIM(`location`.`district`))
  );
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
