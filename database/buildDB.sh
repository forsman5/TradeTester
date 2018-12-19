#!/bin/sh
sqlite3 tradetester.db << END_SQL
.read ./storedprocedures/createTables.sql
END_SQL
