-- Add partial unique index for default templates
-- This ensures we don't create duplicate default templates with the same name
-- The index only applies to rows where is_default = true AND user_id IS NULL

CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_name 
ON templates (name) 
WHERE is_default = true AND user_id IS NULL;

-- Also add an index for template type to ensure unique default templates per type
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_template_type 
ON templates (type) 
WHERE is_default = true AND user_id IS NULL;