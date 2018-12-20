module.exports = {
  getAccountByUsername: 'SELECT * FROM accounts WHERE username = ?',
  getAccountById: 'SELECT * FROM accounts WHERE id = ?',
  insertAccount: 'INSERT INTO accounts(username, pass, api_key) VALUES(?, ?, ?)',

  // todo

  // take in everything but the id (because autoincrement) of this new competition
  // order of parameters is as given in the create table statement
  insertCompetition: 'INSERT INTO competitions(creator_id, start_date, end_date, starting_capital, name) VALUES(?, ?, ?, ?, ?)',
  getCompetitionById: 'SELECT * FROM competitions WHERE id = ?',

  // get all competitions (*) that have the creator id of the paramater
  getAccountsCompetitions: 'SELECT * FROM accounts WHERE creator_id = ?',

  // get all user data (not just ids) that are participants of the given competition id
  getParticipantsOfCompetition: 'SELECT * FROM competition_members WHERE competition_id = ?',
};
