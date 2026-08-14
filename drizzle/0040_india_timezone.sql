UPDATE `organizations`
SET `timezone` = 'Asia/Kolkata'
WHERE `timezone` IS NULL OR `timezone` <> 'Asia/Kolkata';
