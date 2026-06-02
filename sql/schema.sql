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

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  level ENUM('L0','L1','L2') NOT NULL,
  parent_id INT UNSIGNED NULL,
  l0_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_parent_id (parent_id),
  KEY idx_l0_id (l0_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plp_seo_blocks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED NOT NULL,
  category_slug VARCHAR(200) NOT NULL,
  markdown_content LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;