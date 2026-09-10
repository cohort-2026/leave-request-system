# Backend database setup

This backend uses PostgreSQL and reads its connection string from `DATABASE_URL`.

## 1. Create a database

Create an empty local database (replace `fhulu` if you prefer another name):

```sh
createdb fhulu
```

If `createdb` is unavailable, connect as a PostgreSQL administrator and run:

```sql
CREATE DATABASE fhulu;
```

## 2. Configure the connection

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the connection string for the database you created. For example:

```text
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/fhulu
```

Do not commit `.env.local` or any file containing real credentials.

## 3. Install the PostgreSQL client library

From `backend/`, install dependencies:

```sh
npm install
```

The server can import `./database`, which exports a `pg` connection pool configured from `DATABASE_URL`.

## 4. Create the users table

Run the schema against the database:

```sh
psql "$DATABASE_URL" -f sql/001_users.sql
```

Verify the empty table exists:

```sh
psql "$DATABASE_URL" -c "SELECT * FROM users;"
```

`users.email` has a database `UNIQUE` constraint, so PostgreSQL rejects duplicate email addresses. `users.role` is restricted to `staff`, `manager`, `company_admin`, and `platform` by a `CHECK` constraint.
