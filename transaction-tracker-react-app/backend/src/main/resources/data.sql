INSERT INTO categories (name) VALUES ('Household & Utilities'),('EMI'),('Investments'),('Miscellaneous'),
                                             ('Health & Personal Care'),('Education'),('Quick Commerce'),('Food'),
                                             ('Lifestyle & Entertainment'),('Credit');

-- Household & Utilities (updated subcategories)
    INSERT INTO subcategories (category_id, name) VALUES
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Groceries(offline)'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Vegetables/Fruits(offline)'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Utilities'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Society Maintenance'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'House Help'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Transport'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Service/Repairs'),
    ((SELECT id FROM categories WHERE name = 'Household & Utilities'), 'Adhoc');

-- EMI, Investments, Miscellaneous (single entry categories)
INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'EMI'), 'EMI'),
      ((SELECT id FROM categories WHERE name = 'Investments'), 'Investments'),
      ((SELECT id FROM categories WHERE name = 'Miscellaneous'), 'Others');

-- Health & Personal Care
INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'Health & Personal Care'), 'Medicial'),
      ((SELECT id FROM categories WHERE name = 'Health & Personal Care'), 'Saloon'),
      ((SELECT id FROM categories WHERE name = 'Health & Personal Care'), 'Skin Care products'),
      ((SELECT id FROM categories WHERE name = 'Health & Personal Care'), 'Doctor Visits'),
      ((SELECT id FROM categories WHERE name = 'Health & Personal Care'), 'Vaccination');

-- Education
INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'Education'), 'Stationary'),
      ((SELECT id FROM categories WHERE name = 'Education'), 'School Activities Fees'),
      ((SELECT id FROM categories WHERE name = 'Education'), 'School fees'),
      ((SELECT id FROM categories WHERE name = 'Education'), 'Tuition fees');

-- Quick Commerce (NEW Category)
INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'Quick Commerce'), 'Zepto'),
      ((SELECT id FROM categories WHERE name = 'Quick Commerce'), 'Swiggy'),
      ((SELECT id FROM categories WHERE name = 'Quick Commerce'), 'BBDaily'),
      ((SELECT id FROM categories WHERE name = 'Quick Commerce'), 'Others');

-- Food (updated subcategories)
INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'Food'), 'Zomato/Swiggy'),
      ((SELECT id FROM categories WHERE name = 'Food'), 'Prashant Corner'),
      ((SELECT id FROM categories WHERE name = 'Food'), 'Restaurants/Dine In'),
      ((SELECT id FROM categories WHERE name = 'Food'), 'Egg/Mutton');

-- Lifestyle & Entertainment
INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Clothes'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Electronics'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Accessories'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Entertainment'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Travel (Domestic, International)'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Hotel Stay'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Car Service'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Car Maintenance'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Bike Repairs'),
      ((SELECT id FROM categories WHERE name = 'Lifestyle & Entertainment'), 'Fuel');

INSERT INTO subcategories (category_id, name) VALUES
      ((SELECT id FROM categories WHERE name = 'Credit'), 'Salary'),
      ((SELECT id FROM categories WHERE name = 'Credit'), 'Dividends from stocks'),
      ((SELECT id FROM categories WHERE name = 'Credit'), 'FD Sweeps'),
      ((SELECT id FROM categories WHERE name = 'Credit'), 'Other Income');

INSERT INTO payee_category_mapping (payee_name, category_id, subcategory_id)
VALUES ('SWIGGY', 8, 1);

INSERT INTO payee_category_mapping (payee_name, category_id, subcategory_id)
VALUES ('ZOMATO', 8, 1);

INSERT INTO payee_category_mapping (payee_name, category_id, subcategory_id)
VALUES ('AMAZON', 9, 3);

INSERT INTO payee_category_mapping (payee_name, category_id, subcategory_id)
VALUES ('RASECC THANE', 2, 1);

// important queries
-- investment
SELECT *
FROM transactions
WHERE MONTH(txn_date) = 10
  AND YEAR(txn_date) = 2025
  and category_id=3;

-- Income

SELECT *
FROM transactions
WHERE MONTH(txn_date) = 10
  AND YEAR(txn_date) = 2025
  and category_id=10;
