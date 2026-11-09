-- Migration: 013_leave_types.sql
-- Description: Create leave_types table and seed default leave types for existing companies.

-- 1. Create table leave_types
CREATE TABLE IF NOT EXISTS leave_types (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    default_days INT NOT NULL,
    allowance_period TEXT DEFAULT 'annual',
    is_active BOOLEAN DEFAULT true,
    allow_backdate BOOLEAN NOT NULL DEFAULT false,
    requires_document_after_days INT NULL,
    CONSTRAINT uq_company_leave_type_name UNIQUE (company_id, name)
);

-- 2. Seed default leave types for all existing companies
INSERT INTO leave_types (
    company_id,
    name,
    default_days,
    allowance_period,
    is_active,
    allow_backdate,
    requires_document_after_days
)
SELECT 
    c.id AS company_id,
    lt.name,
    lt.default_days,
    'annual' AS allowance_period,
    true AS is_active,
    lt.allow_backdate,
    lt.requires_document_after_days
FROM companies c
CROSS JOIN (
    VALUES 
        ('Annual', 15, false, NULL::INT),
        ('Sick', 10, true, 2),
        ('Family responsibility', 3, true, NULL::INT),
        ('Unpaid', 0, false, NULL::INT),
        ('Study', 5, false, NULL::INT)
) AS lt(name, default_days, allow_backdate, requires_document_after_days)
ON CONFLICT (company_id, name) DO NOTHING;