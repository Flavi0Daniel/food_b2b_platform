-- =====================================================================
-- PLATAFORMA B2B DE INTERMEDIAÇÃO E LOGÍSTICA ALIMENTAR
-- Script de criação da base de dados (MySQL 8.x / MySQL Workbench)
-- =====================================================================
-- Convenções:
--   - InnoDB em todas as tabelas (suporte a FKs e transações)
--   - utf8mb4 para suportar acentos e emojis
--   - Chaves primárias BIGINT UNSIGNED AUTO_INCREMENT
--   - Todas as tabelas têm created_at / updated_at para auditoria
--   - ENUMs usados para estados finitos e bem definidos do negócio
-- =====================================================================

CREATE DATABASE IF NOT EXISTS food_b2b_platform
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE food_b2b_platform;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. UTILIZADORES E ACESSOS (Auth & RBAC)
-- =====================================================================

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150)        NOT NULL,
    email           VARCHAR(150)        NOT NULL,
    password_hash   VARCHAR(255)        NOT NULL,
    phone           VARCHAR(30)         NULL,
    -- ADMIN = intermediário/dono do sistema | OPERATOR = sub-admin
    -- CLIENT = restaurantes/compradores | SUPPLIER = fornecedores | CARRIER = transportadoras
    role            ENUM('ADMIN','OPERATOR','CLIENT','SUPPLIER','CARRIER') NOT NULL,
    status          ENUM('ACTIVE','INACTIVE','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    -- Nome fiscal/comercial (útil para Fornecedores, Transportadoras e Clientes empresa)
    company_name    VARCHAR(150)        NULL,
    tax_id          VARCHAR(50)         NULL COMMENT 'NIF / Número de contribuinte',
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role_status (role, status)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS addresses;
CREATE TABLE addresses (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED     NOT NULL,
    label           VARCHAR(100)        NULL COMMENT 'Ex: Sede, Armazém Viana, Restaurante Talatona',
    street          VARCHAR(255)        NOT NULL,
    city            VARCHAR(100)        NOT NULL,
    municipality    VARCHAR(100)        NULL,
    reference_point VARCHAR(255)        NULL,
    latitude        DECIMAL(10,7)       NULL,
    longitude       DECIMAL(10,7)       NULL,
    is_default      BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_addresses_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS refresh_tokens;
CREATE TABLE refresh_tokens (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED     NOT NULL,
    token_hash      VARCHAR(255)        NOT NULL,
    expires_at      DATETIME            NOT NULL,
    revoked         BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_refresh_tokens_user (user_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 2. CATÁLOGO DE PRODUTOS
-- =====================================================================

DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)        NOT NULL COMMENT 'Ex: Peixes, Hortaliças, Carnes, Legumes',
    slug            VARCHAR(120)        NOT NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id     BIGINT UNSIGNED     NOT NULL,
    name            VARCHAR(150)        NOT NULL,
    description     TEXT                NULL,
    base_unit       ENUM('KG','CAIXA','BALDE','SACO','UNIDADE') NOT NULL,
    image_url       VARCHAR(500)        NULL,
    -- Disponibilidade lógica (modelo zero stock próprio) - NÃO é contagem numérica
    is_available    BOOLEAN             NOT NULL DEFAULT FALSE,
    -- Preço de venda ao cliente final (definido pelo Admin: custo médio + margem)
    sell_price      DECIMAL(12,2)       NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_available (is_available)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS supplier_products;
CREATE TABLE supplier_products (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id     BIGINT UNSIGNED     NOT NULL,
    product_id      BIGINT UNSIGNED     NOT NULL,
    -- Preço de custo acordado entre o Admin e este fornecedor específico
    cost_price      DECIMAL(12,2)       NOT NULL,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_supplier_products_supplier
        FOREIGN KEY (supplier_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_supplier_products_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE,
    UNIQUE KEY uq_supplier_product (supplier_id, product_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. ENCOMENDAS (CLIENTE)
-- =====================================================================

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number            VARCHAR(20)     NOT NULL COMMENT 'Ex: ORD-2026-000123',
    client_id               BIGINT UNSIGNED NOT NULL,
    delivery_address_id     BIGINT UNSIGNED NOT NULL,
    requested_delivery_date DATE            NULL,
    delivery_window         VARCHAR(50)     NULL COMMENT 'Ex: 08h-10h',
    subtotal_amount         DECIMAL(14,2)   NOT NULL DEFAULT 0,
    total_amount            DECIMAL(14,2)   NOT NULL DEFAULT 0,
    payment_status          ENUM('PENDING','PROOF_SUBMITTED','VALIDATED','REJECTED')
                                            NOT NULL DEFAULT 'PENDING',
    order_status            ENUM('PENDING_PAYMENT','AWAITING_APPROVAL','PROCESSING',
                                  'IN_TRANSIT','DELIVERED','CANCELLED')
                                            NOT NULL DEFAULT 'PENDING_PAYMENT',
    notes                   TEXT            NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_orders_number (order_number),
    CONSTRAINT fk_orders_client
        FOREIGN KEY (client_id) REFERENCES users(id),
    CONSTRAINT fk_orders_address
        FOREIGN KEY (delivery_address_id) REFERENCES addresses(id),
    INDEX idx_orders_client (client_id),
    INDEX idx_orders_status (order_status),
    INDEX idx_orders_payment_status (payment_status)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED     NOT NULL,
    product_id      BIGINT UNSIGNED     NOT NULL,
    -- Fornecedor atribuído pelo Admin a este item (pode ser NULL até à aprovação)
    supplier_id     BIGINT UNSIGNED     NULL,
    unit            ENUM('KG','CAIXA','BALDE','SACO','UNIDADE') NOT NULL,
    quantity        DECIMAL(10,2)       NOT NULL,
    unit_price      DECIMAL(12,2)       NOT NULL,
    subtotal        DECIMAL(14,2)       GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_order_items_supplier
        FOREIGN KEY (supplier_id) REFERENCES users(id),
    INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS order_status_history;
CREATE TABLE order_status_history (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED     NOT NULL,
    status          VARCHAR(50)         NOT NULL,
    changed_by      BIGINT UNSIGNED     NULL COMMENT 'Utilizador (normalmente Admin) que alterou o estado',
    note            TEXT                NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_status_history_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_status_history_user
        FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_status_history_order (order_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PAGAMENTOS (Validação Manual)
-- =====================================================================

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT UNSIGNED     NOT NULL,
    method          ENUM('MULTICAIXA_EXPRESS','TRANSFERENCIA') NOT NULL,
    amount          DECIMAL(14,2)       NOT NULL,
    proof_url       VARCHAR(500)        NULL COMMENT 'Comprovativo enviado pelo cliente',
    transaction_ref VARCHAR(100)        NULL,
    status          ENUM('PENDING','VALIDATED','REJECTED') NOT NULL DEFAULT 'PENDING',
    validated_by    BIGINT UNSIGNED     NULL COMMENT 'Admin que validou manualmente',
    validated_at    DATETIME            NULL,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_payments_validator
        FOREIGN KEY (validated_by) REFERENCES users(id),
    INDEX idx_payments_order (order_id),
    INDEX idx_payments_status (status)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. ORDENS DE COMPRA (FORNECEDOR)
-- =====================================================================

DROP TABLE IF EXISTS purchase_orders;
CREATE TABLE purchase_orders (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number           VARCHAR(20)     NOT NULL COMMENT 'Ex: PO-2026-000045',
    order_id            BIGINT UNSIGNED NOT NULL,
    supplier_id         BIGINT UNSIGNED NOT NULL,
    status              ENUM('PENDING','RECEIVED','IN_PREPARATION','READY_FOR_PICKUP',
                              'COLLECTED','CANCELLED')
                                        NOT NULL DEFAULT 'PENDING',
    pickup_scheduled_at DATETIME        NULL,
    notes               TEXT            NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_purchase_orders_number (po_number),
    CONSTRAINT fk_po_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_po_supplier
        FOREIGN KEY (supplier_id) REFERENCES users(id),
    INDEX idx_po_order (order_id),
    INDEX idx_po_supplier (supplier_id),
    INDEX idx_po_status (status)
) ENGINE=InnoDB;

DROP TABLE IF EXISTS purchase_order_items;
CREATE TABLE purchase_order_items (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id   BIGINT UNSIGNED NOT NULL,
    order_item_id       BIGINT UNSIGNED NOT NULL,
    quantity            DECIMAL(10,2)   NOT NULL,
    unit                ENUM('KG','CAIXA','BALDE','SACO','UNIDADE') NOT NULL,
    cost_price          DECIMAL(12,2)   NOT NULL,
    CONSTRAINT fk_po_items_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_po_items_order_item
        FOREIGN KEY (order_item_id) REFERENCES order_items(id),
    INDEX idx_po_items_po (purchase_order_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. LOGÍSTICA (TRANSPORTADORA)
-- =====================================================================

DROP TABLE IF EXISTS shipments;
CREATE TABLE shipments (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id            BIGINT UNSIGNED NOT NULL,
    purchase_order_id   BIGINT UNSIGNED NULL COMMENT 'NULL quando o frete cobre a encomenda inteira',
    carrier_id          BIGINT UNSIGNED NOT NULL,
    pickup_address_id   BIGINT UNSIGNED NOT NULL COMMENT 'Morada do Fornecedor (Ponto A)',
    delivery_address_id BIGINT UNSIGNED NOT NULL COMMENT 'Morada do Cliente (Ponto B)',
    shipment_status     ENUM('PENDING_ASSIGNMENT','TO_PICKUP','COLLECTED','IN_TRANSIT',
                              'DELIVERED','FAILED')
                                        NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    pod_photo_url       VARCHAR(500)    NULL COMMENT 'Foto da carga entregue (Proof of Delivery)',
    pod_signature_url   VARCHAR(500)    NULL COMMENT 'Assinatura digital do recetor',
    scheduled_pickup_at DATETIME        NULL,
    picked_up_at        DATETIME        NULL,
    delivered_at        DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_shipments_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_shipments_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    CONSTRAINT fk_shipments_carrier
        FOREIGN KEY (carrier_id) REFERENCES users(id),
    CONSTRAINT fk_shipments_pickup_address
        FOREIGN KEY (pickup_address_id) REFERENCES addresses(id),
    CONSTRAINT fk_shipments_delivery_address
        FOREIGN KEY (delivery_address_id) REFERENCES addresses(id),
    INDEX idx_shipments_order (order_id),
    INDEX idx_shipments_carrier (carrier_id),
    INDEX idx_shipments_status (shipment_status)
) ENGINE=InnoDB;

-- =====================================================================
-- 7. NOTIFICAÇÕES
-- =====================================================================

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED     NOT NULL,
    title           VARCHAR(150)        NOT NULL,
    message         TEXT                NOT NULL,
    type            VARCHAR(50)         NULL COMMENT 'Ex: NEW_ORDER, PAYMENT_VALIDATED, PO_ASSIGNED',
    related_order_id BIGINT UNSIGNED    NULL,
    is_read         BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notifications_order
        FOREIGN KEY (related_order_id) REFERENCES orders(id),
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
