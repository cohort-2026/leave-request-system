-- Seed one login per role (Week 4 Member 1.3).
-- Hashes were generated with bcrypt.hash(..., 10). The password is not in
-- this file; see sql/README.md.

INSERT INTO users (email, password_hash, role, display_name, status, company_name)
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
ON CONFLICT (email) DO NOTHING;

UPDATE users
SET company_name = 'Acme'
WHERE email IN (
    'staff@leave.local',
    'manager@leave.local',
    'admin@leave.local'
)
AND company_name IS NULL;
