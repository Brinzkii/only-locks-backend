\echo 'Delete and recreate OnlyLocks db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE only_locks;
CREATE DATABASE only_locks;
\connect only_locks

\i only-locks-schema.sql

\echo 'Delete and recreate only_locks_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE only_locks_test;
CREATE DATABASE only_locks_test;
\connect only_locks_test

\i only-locks-schema.sql