-- Backfill position for existing gifts based on created_at order
WITH numbered_gifts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) as row_num
  FROM gifts
  WHERE position IS NULL
)
UPDATE gifts
SET position = numbered_gifts.row_num
FROM numbered_gifts
WHERE gifts.id = numbered_gifts.id;
