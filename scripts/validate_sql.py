from collections import defaultdict
from pathlib import Path
from pglast import parse_sql

migration_versions = defaultdict(list)
for migration in Path("supabase/migrations").glob("*.sql"):
    version = migration.name.split("_", 1)[0]
    migration_versions[version].append(migration.name)

# Migration filenames have been reconciled to the production ledger; all versions must be unique.
legacy_duplicate_versions = {}
actual_duplicates = {
    version: set(names)
    for version, names in migration_versions.items()
    if len(names) > 1
}
if actual_duplicates != legacy_duplicate_versions:
    raise SystemExit(f"Unexpected duplicate migration versions: {actual_duplicates}")

for folder in (Path("supabase/migrations"), Path("supabase/tests")):
    for path in sorted(folder.glob("*.sql")):
        parse_sql(path.read_text(encoding="utf-8"))
        print(f"PostgreSQL syntax parsed: {path}")
