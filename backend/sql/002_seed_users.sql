-- Seed one login per role (Week 4 Member 1.3).
-- Hashes were generated with bcrypt.hash(..., 10). The password is not in
-- this file; see sql/README.md.

WITH seed_users (email, password_hash, role, display_name, status, company_name) AS (
    VALUES
        (
            'staff@leave.local',
            '$2b$10$Tj45LBbHoGpdS1UECk96VeiZg6sYUccLHBfZxQUA2T5KAIMUdvlnG',
            'staff',
            'Staff',
            'active',
            'Acme'
        ),
        (
            'manager@leave.local',
            '$2b$10$Tj45LBbHoGpdS1UECk96VeiZg6sYUccLHBfZxQUA2T5KAIMUdvlnG',
            'manager',
            'Manager',
            'active',
            'Acme'
        ),
        (
            'admin@leave.local',
            '$2b$10$Tj45LBbHoGpdS1UECk96VeiZg6sYUccLHBfZxQUA2T5KAIMUdvlnG',
            'company_admin',
            'Company admin',
            'active',
            'Acme'
        ),
        (
            'platform@leave.local',
            '$2b$10$Tj45LBbHoGpdS1UECk96VeiZg6sYUccLHBfZxQUA2T5KAIMUdvlnG',
            'platform',
            'Platform',
            'active',
            NULL
        )
)
INSERT INTO users (email, password_hash, role, display_name, status, company_name)
SELECT seed.email, seed.password_hash, seed.role, seed.display_name, seed.status, seed.company_name
FROM seed_users AS seed
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE lower(users.email) = lower(seed.email)
);

UPDATE users
SET company_name = 'Acme'
WHERE email IN (
    'staff@leave.local',
    'manager@leave.local',
    'admin@leave.local'
)
AND company_name IS NULL;
