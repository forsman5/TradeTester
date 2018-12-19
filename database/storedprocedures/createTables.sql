DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS portfolios;

CREATE TABLE "competitions" (
	"id"	TEXT,
	"start_date"	TEXT NOT NULL,
	"end_date"	TEXT,
	"starting_capital"	INTEGER NOT NULL DEFAULT 1000000,
	"name"	TEXT,
	"admin_password"	BLOB NOT NULL,
	"join_password"	BLOB,
	PRIMARY KEY("id")
);

/*
teams
  - id text
  - competition_id text
  - username text
  - password blob
  - api_key text
  - current_capital int

portfolios
  - symbol text (together with team_id is primary key)
  - team_id text
  - count int
*/
