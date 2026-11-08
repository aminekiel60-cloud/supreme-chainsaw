# Database privacy tests

`rls_test.sql` checks the Row Level Security rules with three test users:
friends see each other's posts, strangers don't, nobody can read another
user's private data or edit another user's points.

Run against a throwaway local Postgres (not your real project):

```bash
createdb lockedin_test
psql -d lockedin_test -f supabase_shim.sql     # fake Supabase auth schema + roles
psql -d lockedin_test -f ../migrations/20261108000000_init.sql
psql -d lockedin_test -f rls_test.sql          # each line prints the expected value in ()
```
