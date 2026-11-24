from pathlib import Path
from pglast import parse_sql

for folder in (Path("supabase/migrations"), Path("supabase/tests")):
    for path in sorted(folder.glob("*.sql")):
        parse_sql(path.read_text(encoding="utf-8"))
        print(f"PostgreSQL syntax parsed: {path}", flush=True)
