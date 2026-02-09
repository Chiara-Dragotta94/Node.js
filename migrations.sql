-- ============================================
-- MeditActive - Schema del Database
-- File di migrazione MySQL
--
-- Creo tutte le tabelle necessarie e inserisco 
-- gli obiettivi predefiniti di partenza.
-- ============================================

-- Creo il database se non esiste
CREATE DATABASE IF NOT EXISTS meditactive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE meditactive;

-- ============================================
-- TABELLA UTENTI
-- Dati principali degli utenti registrati
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    coins INT DEFAULT 0,
    preferred_meditation_time ENUM('morning', 'midday', 'afternoon', 'evening') DEFAULT NULL,
    daily_goal_minutes INT DEFAULT 10,
    reminder_enabled TINYINT(1) DEFAULT 1,
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB;

-- ============================================
-- TABELLA OBIETTIVI
-- Obiettivi predefiniti che gli utenti possono selezionare
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('daily', 'monthly', 'yearly') NOT NULL,
    coins_reward INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB;

-- ============================================
-- TABELLA INTERVALLI OBIETTIVI
-- Periodi temporali (giornaliero, mensile, annuale) di un utente
-- ============================================
CREATE TABLE IF NOT EXISTS goal_intervals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    interval_type ENUM('daily', 'monthly', 'yearly') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_dates (user_id, start_date, end_date)
) ENGINE=InnoDB;

-- ============================================
-- TABELLA ASSOCIAZIONE INTERVALLI-OBIETTIVI
-- Collega gli obiettivi agli intervalli, con stato di completamento
-- ============================================
CREATE TABLE IF NOT EXISTS interval_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    interval_id INT NOT NULL,
    goal_id INT NOT NULL,
    completed TINYINT(1) DEFAULT 0,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (interval_id) REFERENCES goal_intervals(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    UNIQUE KEY unique_interval_goal (interval_id, goal_id),
    INDEX idx_interval (interval_id),
    INDEX idx_goal (goal_id)
) ENGINE=InnoDB;

-- ============================================
-- TABELLA VOCI DEL DIARIO
-- Diario personale dell'utente
-- ============================================
CREATE TABLE IF NOT EXISTS diary_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT '',
    content TEXT NOT NULL,
    mood VARCHAR(50) DEFAULT NULL,
    meditation_minutes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB;

-- ============================================
-- TABELLA SESSIONI DI MEDITAZIONE
-- Storico delle sessioni di meditazione completate
-- ============================================
CREATE TABLE IF NOT EXISTS meditation_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    duration_minutes INT NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, completed_at)
) ENGINE=InnoDB;

-- ============================================
-- TABELLA DONAZIONI
-- Storico delle donazioni e degli alberi piantati
-- ============================================
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('tree', 'donation') NOT NULL,
    coins_spent INT NOT NULL,
    project_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_type (type)
) ENGINE=InnoDB;

-- ============================================
-- INSERIMENTO OBIETTIVI PREDEFINITI
-- ============================================

-- Obiettivi giornalieri
INSERT INTO goals (name, description, category, coins_reward) VALUES
('Meditazione mattutina', 'Completa una sessione di meditazione al mattino', 'daily', 10),
('Respiro consapevole', 'Pratica 5 minuti di respirazione consapevole', 'daily', 5),
('Gratitudine', 'Scrivi 3 cose per cui sei grato/a', 'daily', 5),
('Disconnessione digitale', 'Passa 1 ora senza dispositivi elettronici', 'daily', 10),
('Camminata mindful', 'Fai una camminata di 15 minuti in consapevolezza', 'daily', 10),
('Journaling serale', 'Scrivi nel tuo diario prima di dormire', 'daily', 5);

-- Obiettivi mensili
INSERT INTO goals (name, description, category, coins_reward) VALUES
('Maratona meditazione', 'Medita ogni giorno per un mese', 'monthly', 100),
('Esplorazione tecniche', 'Prova 4 tecniche di meditazione diverse', 'monthly', 50),
('Condivisione', 'Condividi la tua pratica con un amico', 'monthly', 30),
('Lettura mindful', 'Leggi un libro sulla crescita personale', 'monthly', 40),
('Sfida silenzio', 'Pratica un giorno di silenzio', 'monthly', 50);

-- Obiettivi annuali
INSERT INTO goals (name, description, category, coins_reward) VALUES
('Maestro Zen', 'Completa 365 sessioni di meditazione', 'yearly', 500),
('Trasformazione', 'Mantieni una routine di meditazione per un anno', 'yearly', 1000),
('Mentore', 'Aiuta 5 persone ad iniziare la meditazione', 'yearly', 300),
('Ritiro spirituale', 'Partecipa a un ritiro di meditazione', 'yearly', 200);
