-- Update Transfer Order Priority Levels to be Consistent
-- This script updates the priority enum to use consistent urgency levels

-- First, update any existing 'urgent' priorities to 'critical'
UPDATE transfer_orders 
SET priority = 'critical' 
WHERE priority = 'urgent';

-- Drop the old enum constraint and create new one
-- Note: This requires careful handling in production
-- You may need to do this in steps depending on your PostgreSQL version

-- Step 1: Add a temporary column with new enum
ALTER TABLE transfer_orders 
ADD COLUMN priority_new VARCHAR(10) DEFAULT 'medium';

-- Step 2: Copy data with mapping
UPDATE transfer_orders 
SET priority_new = CASE 
    WHEN priority = 'urgent' THEN 'critical'
    ELSE priority::text
END;

-- Step 3: Drop old column and rename new one
ALTER TABLE transfer_orders DROP COLUMN priority;
ALTER TABLE transfer_orders RENAME COLUMN priority_new TO priority;

-- Step 4: Add proper enum constraint
ALTER TABLE transfer_orders 
ADD CONSTRAINT transfer_orders_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Set default value
ALTER TABLE transfer_orders 
ALTER COLUMN priority SET DEFAULT 'medium';

-- Add comment for documentation
COMMENT ON COLUMN transfer_orders.priority IS 'Transfer order priority: low, medium, high, critical (consistent with urgency levels)';