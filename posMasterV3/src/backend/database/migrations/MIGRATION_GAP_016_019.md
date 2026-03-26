# Migration Gap: 016–019

Migrations 016, 017, 018, and 019 do not exist in this codebase.

## Why

These numbers were reserved or skipped during early development. The schema evolved
through migrations 013–015 and then jumped to 020. No migrations were accidentally
deleted — this is an intentional gap from the initial development phase.

## Schema completeness

All schema changes that would have gone into 016–019 were incorporated into later
migrations (020 onward). The database schema is complete and consistent; the
numbering gap is cosmetic only.

## If you need to add a new migration

Always use the next sequential number after the highest existing migration.
As of writing, the latest migration is **042**. The next should be **043**.
