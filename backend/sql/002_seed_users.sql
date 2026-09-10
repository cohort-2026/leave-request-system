-- backend/sql/002_seed_users.sql

INSERT INTO users (email, password_hash, role, display_name, status)
VALUES
    ('staff@acme.test', '$2b$10$e8p24sA/a5HhC9fBq0W8Ye/4p8R0N7xY3QJ5tL1M0N1O2P3Q4R5S6', 'staff', 'Demo Staff', 'active'),
    ('manager@acme.test', '$2b$10$e8p24sA/a5HhC9fBq0W8Ye/4p8R0N7xY3QJ5tL1M0N1O2P3Q4R5S6', 'manager', 'Demo Manager', 'active'),
    ('admin@acme.test', '$2b$10$e8p24sA/a5HhC9fBq0W8Ye/4p8R0N7xY3QJ5tL1M0N1O2P3Q4R5S6', 'company_admin', 'Demo Company Admin', 'active'),
    ('platform@acme.test', '$2b$10$e8p24sA/a5HhC9fBq0W8Ye/4p8R0N7xY3QJ5tL1M0N1O2P3Q4R5S6', 'platform', 'Demo Platform Admin', 'active')
ON CONFLICT (email) DO NOTHING;