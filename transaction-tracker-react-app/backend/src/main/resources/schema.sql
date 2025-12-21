CREATE TABLE IF NOT EXISTS categories (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            name VARCHAR(100) NOT NULL UNIQUE,
                            description TEXT
);

-- Create the subcategories table with a foreign key constraint
CREATE TABLE IF NOT EXISTS subcategories (
                               id INT AUTO_INCREMENT PRIMARY KEY,
                               category_id INT NOT NULL,
                               name VARCHAR(100) NOT NULL,
                               description TEXT,
    -- This constraint links subcategories back to the primary categories table
                               FOREIGN KEY (category_id) REFERENCES categories(id)
                                   ON DELETE CASCADE -- If a main category is deleted, its subcategories are also deleted
                                   ON UPDATE CASCADE -- If a main category ID is updated, the subcategory ID updates automatically
);


CREATE TABLE IF NOT EXISTS payee_category_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payee_name VARCHAR(255) NOT NULL,

    category_id INT NOT NULL,
    subcategory_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pcm_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

    CONSTRAINT fk_pcm_subcategory
    FOREIGN KEY (subcategory_id)
    REFERENCES subcategories(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

    CONSTRAINT uq_payee UNIQUE (payee_name)
    );

CREATE TABLE IF NOT EXISTS transactions (
      transaction_id VARCHAR(50) PRIMARY KEY,
      txn_date DATE NOT NULL,
      txn_date_str VARCHAR2(255) NOT NULL,
      payee VARCHAR(255) NOT NULL,
      payee_full_name VARCHAR(500),
      amount DECIMAL(15, 2) NOT NULL,
      txn_type VARCHAR(50) NOT NULL,

      category_id BIGINT,        -- FK to categories(id)
      subcategory_id BIGINT,     -- FK to subcategories(id)

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);

