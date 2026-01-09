WITH category_totals AS (
    SELECT
        c.id AS category_id,
        c.name AS category_name,
        SUM(ABS(t.amount)) AS total_spent
    FROM transactions t
             JOIN categories c ON t.category_id = c.id
    GROUP BY c.id, c.name
)
SELECT *
FROM (
         SELECT
             *,
             ROW_NUMBER() OVER (
            ORDER BY total_spent DESC
        ) AS rn
         FROM category_totals
     ) AS ranked
ORDER BY total_spent DESC;



--------- below query gives summary by category and subcategory ------------

-- Step 1: Aggregate total spent per category
WITH category_totals AS (
    SELECT
        c.id AS category_id,
        c.name AS category_name,
        SUM(ABS(t.amount)) AS total_spent
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    GROUP BY c.id, c.name
),
top_categories AS (
    SELECT *,
           ROW_NUMBER() OVER (ORDER BY total_spent DESC) AS rn
    FROM category_totals
)
-- Step 2: Aggregate total spent per subcategory within top categories
SELECT *
FROM (
         SELECT
             tc.category_id,
             tc.category_name,
             tc.total_spent AS category_total_spent,  -- carry total_spent here
             sc.id AS subcategory_id,
             sc.name AS subcategory_name,
             SUM(ABS(t.amount)) AS sub_total_spent,
             ROW_NUMBER() OVER (
            PARTITION BY tc.category_id
            ORDER BY SUM(ABS(t.amount)) DESC
        ) AS sub_rn
         FROM transactions t
                  JOIN top_categories tc ON t.category_id = tc.category_id
                  JOIN subcategories sc ON t.subcategory_id = sc.id
         WHERE tc.rn <= 3  -- only top 3 categories globally, change this as required
         GROUP BY tc.category_id, tc.category_name, tc.total_spent, sc.id, sc.name
     ) AS ranked_sub
WHERE sub_rn <= 3  -- top 3 subcategories within each top category
ORDER BY category_total_spent DESC, sub_total_spent DESC;
