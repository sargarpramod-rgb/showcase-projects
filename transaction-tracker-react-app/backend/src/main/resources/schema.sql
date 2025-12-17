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
