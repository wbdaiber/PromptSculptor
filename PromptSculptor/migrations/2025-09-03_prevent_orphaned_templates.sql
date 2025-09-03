-- Add CHECK constraint to prevent orphaned templates
-- This ensures that templates with user_id=NULL must have is_default=TRUE
-- This prevents the invalid state that was causing duplicate templates

-- Add the CHECK constraint
ALTER TABLE templates 
ADD CONSTRAINT chk_no_orphaned_templates 
CHECK (NOT (user_id IS NULL AND is_default = FALSE));

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT chk_no_orphaned_templates ON templates IS 
'Prevents orphaned templates: if user_id is NULL, is_default must be TRUE';

-- Rollback procedure (if needed):
-- ALTER TABLE templates DROP CONSTRAINT chk_no_orphaned_templates;