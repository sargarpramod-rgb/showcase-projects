-- Create the main categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Create the subcategories table with a foreign key constraint
CREATE TABLE subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    -- This constraint links subcategories back to the primary categories table
    FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE CASCADE -- If a main category is deleted, its subcategories are also deleted
        ON UPDATE CASCADE -- If a main category ID is updated, the subcategory ID updates automatically
);


update trn_dbo.categories
set name='Quick Commerce'
where name='Restaurants/Dine In'

-- Household & Utilities (updated subcategories)
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Groceries(offline)'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Vegetables/Fruits(offline)'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Utilities'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Society Maintenance'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'House Help'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Transport'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Service/Repairs'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Household & Utilities'), 'Adhoc');

-- EMI, Investments, Miscellaneous (single entry categories)
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'EMI'), 'EMI'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Investments'), 'Investments'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Miscellaneous'), 'Others');

-- Health & Personal Care
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'Health & Personal Care'), 'Medicial'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Health & Personal Care'), 'Saloon'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Health & Personal Care'), 'Skin Care products'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Health & Personal Care'), 'Doctor Visits'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Health & Personal Care'), 'Vaccination');

-- Education
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'Education'), 'Stationary'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Education'), 'School Activities Fees'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Education'), 'School fees'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Education'), 'Tuition fees');

-- Quick Commerce (NEW Category)
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'Quick Commerce'), 'Zepto'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Quick Commerce'), 'Swiggy'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Quick Commerce'), 'BBDaily'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Quick Commerce'), 'Others');

-- Food (updated subcategories)
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'Food'), 'Zomato'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Food'), 'Prashant Corner'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Food'), 'Restaurants/Dine In');

-- Lifestyle & Entertainment
INSERT INTO trn_dbo.subcategories (category_id, name) VALUES
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Clothes'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Electronics'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Accessories'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Entertainment'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Travel (Domestic, International)'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Hotel Stay'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Car Service'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Car Maintenance'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Bike Repairs'),
((SELECT id FROM trn_dbo.categories WHERE name = 'Lifestyle & Entertainment'), 'Fuel');
