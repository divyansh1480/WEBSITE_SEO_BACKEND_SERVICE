CREATE DATABASE IF NOT EXISTS seo_service_db;
USE seo_service_db;

CREATE TABLE IF NOT EXISTS pdp_seo_content (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id VARCHAR(100) NOT NULL,
  short_description TEXT NULL,
  long_description LONGTEXT NULL,
  specifications JSON NULL,
  ingredients TEXT NULL,
  nutrition JSON NULL,
  features JSON NULL,
  faqs JSON NULL,
  size_guide TEXT NULL,
  regulatory_info TEXT NULL,
  disclaimer TEXT NULL,
  box_contents JSON NULL,
  meta_title VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  meta_keywords TEXT NULL,
  schema_json JSON NULL,
  images JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
