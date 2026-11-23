-- South African public holidays for 2026–2030 on every company.
-- Matches backend/leave/zaHolidays.ts. Sunday holidays are stored on the
-- following Monday with actual_date set to the Sunday. Existing dates stay.

BEGIN;

INSERT INTO public_holidays (company_id, holiday_date, name, source, actual_date)
SELECT
    companies.id,
    seeded.holiday_date,
    seeded.name,
    'za',
    seeded.actual_date
FROM companies
CROSS JOIN (
    VALUES
        ('2026-01-01'::date, 'New Year''s Day', NULL::date),
        ('2026-03-21', 'Human Rights Day', NULL),
        ('2026-04-03', 'Good Friday', NULL),
        ('2026-04-06', 'Family Day', NULL),
        ('2026-04-27', 'Freedom Day', NULL),
        ('2026-05-01', 'Workers'' Day', NULL),
        ('2026-06-16', 'Youth Day', NULL),
        ('2026-08-10', 'Women''s Day', '2026-08-09'),
        ('2026-09-24', 'Heritage Day', NULL),
        ('2026-12-16', 'Day of Reconciliation', NULL),
        ('2026-12-25', 'Christmas Day', NULL),
        ('2026-12-26', 'Day of Goodwill', NULL),
        ('2027-01-01', 'New Year''s Day', NULL),
        ('2027-03-22', 'Human Rights Day', '2027-03-21'),
        ('2027-03-26', 'Good Friday', NULL),
        ('2027-03-29', 'Family Day', NULL),
        ('2027-04-27', 'Freedom Day', NULL),
        ('2027-05-01', 'Workers'' Day', NULL),
        ('2027-06-16', 'Youth Day', NULL),
        ('2027-08-09', 'Women''s Day', NULL),
        ('2027-09-24', 'Heritage Day', NULL),
        ('2027-12-16', 'Day of Reconciliation', NULL),
        ('2027-12-25', 'Christmas Day', NULL),
        ('2027-12-27', 'Day of Goodwill', '2027-12-26'),
        ('2028-01-01', 'New Year''s Day', NULL),
        ('2028-03-21', 'Human Rights Day', NULL),
        ('2028-04-14', 'Good Friday', NULL),
        ('2028-04-17', 'Family Day', NULL),
        ('2028-04-27', 'Freedom Day', NULL),
        ('2028-05-01', 'Workers'' Day', NULL),
        ('2028-06-16', 'Youth Day', NULL),
        ('2028-08-09', 'Women''s Day', NULL),
        ('2028-09-25', 'Heritage Day', '2028-09-24'),
        ('2028-12-16', 'Day of Reconciliation', NULL),
        ('2028-12-25', 'Christmas Day', NULL),
        ('2028-12-26', 'Day of Goodwill', NULL),
        ('2029-01-01', 'New Year''s Day', NULL),
        ('2029-03-21', 'Human Rights Day', NULL),
        ('2029-03-30', 'Good Friday', NULL),
        ('2029-04-02', 'Family Day', NULL),
        ('2029-04-27', 'Freedom Day', NULL),
        ('2029-05-01', 'Workers'' Day', NULL),
        ('2029-06-16', 'Youth Day', NULL),
        ('2029-08-09', 'Women''s Day', NULL),
        ('2029-09-24', 'Heritage Day', NULL),
        ('2029-12-17', 'Day of Reconciliation', '2029-12-16'),
        ('2029-12-25', 'Christmas Day', NULL),
        ('2029-12-26', 'Day of Goodwill', NULL),
        ('2030-01-01', 'New Year''s Day', NULL),
        ('2030-03-21', 'Human Rights Day', NULL),
        ('2030-04-19', 'Good Friday', NULL),
        ('2030-04-22', 'Family Day', NULL),
        ('2030-04-27', 'Freedom Day', NULL),
        ('2030-05-01', 'Workers'' Day', NULL),
        ('2030-06-17', 'Youth Day', '2030-06-16'),
        ('2030-08-09', 'Women''s Day', NULL),
        ('2030-09-24', 'Heritage Day', NULL),
        ('2030-12-16', 'Day of Reconciliation', NULL),
        ('2030-12-25', 'Christmas Day', NULL),
        ('2030-12-26', 'Day of Goodwill', NULL)
) AS seeded(holiday_date, name, actual_date)
ON CONFLICT (company_id, holiday_date) DO NOTHING;

COMMIT;
