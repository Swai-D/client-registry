-- Client Registry Database Schema
-- Endesha script hii kwenye phpMyAdmin (XAMPP) au mysql CLI

CREATE DATABASE IF NOT EXISTS client_registry;
USE client_registry;

CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    nida_number VARCHAR(30) NOT NULL,
    business_type VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    -- Eneo/Mahali pa Biashara (kwa ajili ya Uthibitisho wa Eneo)
    premise_region VARCHAR(150),
    premise_district VARCHAR(150),
    premise_ward VARCHAR(150),
    premise_street VARCHAR(150),
    premise_plot_number VARCHAR(100),
    premise_ownership VARCHAR(20),
    landlord_name VARCHAR(200),
    landlord_phone VARCHAR(30),
    lease_period VARCHAR(150),

    -- Maswali ya msingi (ziada)
    mother_full_name VARCHAR(200),
    birth_place VARCHAR(200),
    std7_info VARCHAR(200),
    registered_phone_numbers VARCHAR(255),
    permanent_residence VARCHAR(200),
    nida_registration_place VARCHAR(150),

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS client_checklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    step_key VARCHAR(80) NOT NULL,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_client_step (client_id, step_key),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Kama tayari una database iliyoundwa awali, tumia ALTER hii badala ya CREATE TABLE:
-- ALTER TABLE clients
--   ADD COLUMN email VARCHAR(255),
--   ADD COLUMN password VARCHAR(255),
--   ADD COLUMN mother_full_name VARCHAR(200),
--   ADD COLUMN birth_place VARCHAR(200),
--   ADD COLUMN std7_info VARCHAR(200),
--   ADD COLUMN registered_phone_numbers VARCHAR(255),
--   ADD COLUMN permanent_residence VARCHAR(200),
--   ADD COLUMN nida_registration_place VARCHAR(150);
--
-- CREATE TABLE IF NOT EXISTS client_documents (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   client_id INT NOT NULL,
--   document_type VARCHAR(100) NOT NULL,
--   display_name VARCHAR(255) NOT NULL,
--   stored_name VARCHAR(255) NOT NULL,
--   file_path VARCHAR(500) NOT NULL,
--   mime_type VARCHAR(120) NOT NULL,
--   file_size INT NOT NULL DEFAULT 0,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
-- );
