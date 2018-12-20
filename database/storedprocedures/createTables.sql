DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS competitions;
DROP TABLE IF EXISTS portfolios;
DROP TABLE IF EXISTS competition_members;

CREATE TABLE accounts (
	id INTEGER PRIMARY KEY,
	username TEXT UNIQUE,
	pass BLOB NOT NULL,
	api_key TEXT UNIQUE
);

CREATE TABLE competitions (
	id INTEGER PRIMARY KEY,
  creator_id TEXT,
	start_date	TEXT NOT NULL,
	end_date	TEXT,
	starting_capital	INTEGER NOT NULL DEFAULT 1000000,
	name	TEXT,
  FOREIGN KEY (creator_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE competition_members (
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  competition_id INTEGER NOT NULL REFERENCES competitions(id),
  capital INTEGER NOT NULL,
  PRIMARY KEY(account_id, competition_id)
);

CREATE TABLE portfolios (
	symbol TEXT NOT NULL,
	account_id INTEGER NOT NULL REFERENCES accounts(id),
  competition_id INTEGER NOT NULL REFERENCES competitions(id),
	shares  INTEGER NOT NULL,
	PRIMARY KEY(account_id, symbol, competition_id)
);
