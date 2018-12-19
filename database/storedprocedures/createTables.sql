CREATE TABLE "competition" (
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
team
  - id text
  - competition_id text
  - name text
  - password blob
  - api_key text
  - current_capital int

portfolio
  - symbol text (together with team_id is primary key)
  - team_id text
  - count int
*/
