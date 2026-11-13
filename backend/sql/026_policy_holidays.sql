-- Leave-type colour tokens and holiday source/observed-date metadata.

BEGIN;

ALTER TABLE leave_types
    ADD COLUMN IF NOT EXISTS colour TEXT;

UPDATE leave_types AS leave_type
SET colour = seeded.colour
FROM (
    VALUES
        ('Annual', 'violet'),
        ('Sick', 'rose'),
        ('Family responsibility', 'amber'),
        ('Unpaid', 'slate'),
        ('Study', 'sky')
) AS seeded(name, colour)
WHERE leave_type.name = seeded.name
  AND leave_type.colour IS NULL;

ALTER TABLE public_holidays
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'custom',
    ADD COLUMN IF NOT EXISTS actual_date DATE NULL;

COMMIT;
