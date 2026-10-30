-- NOIRÉ demo — isolated database + least-privilege application user.
-- Run ONCE as a MySQL administrator, after replacing CHANGE_ME with a strong password:
--   mysql -u root -p -e "source backend/database/setup/create-database.sql"
-- It only touches noire_ecommerce and noire_ecommerce_test (used by the automated tests).

CREATE DATABASE IF NOT EXISTS noire_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS noire_ecommerce_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'noire_app'@'localhost' IDENTIFIED BY 'CHANGE_ME';
CREATE USER IF NOT EXISTS 'noire_app'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME';

GRANT ALL PRIVILEGES ON noire_ecommerce.* TO 'noire_app'@'localhost';
GRANT ALL PRIVILEGES ON noire_ecommerce.* TO 'noire_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON noire_ecommerce_test.* TO 'noire_app'@'localhost';
GRANT ALL PRIVILEGES ON noire_ecommerce_test.* TO 'noire_app'@'127.0.0.1';
FLUSH PRIVILEGES;
