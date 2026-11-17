from pathlib import Path
from pglast import parse_sql

for path in sorted(Path("supabase/migrations").glob("*.sql")):
    parse_sql(path.read_text(encoding="utf-8"))
    print(f"PostgreSQL syntax parsed: {path}")
