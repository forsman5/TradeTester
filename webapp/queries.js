module.exports = {
  getAccountByUsername: 'SELECT * FROM accounts WHERE username = ?',
  getAccountById: 'SELECT * FROM accounts WHERE id = ?',
  insertAccount: 'INSERT INTO accounts(username, pass, api_key) VALUES(?, ?, ?)',

  // take in everything but the id (because autoincrement) of this new competition
  // order of parameters is as given in the create table statement
  insertCompetition: 'INSERT INTO competitions(creator_id, start_date, end_date, starting_capital, name) VALUES(?, ?, ?, ?, ?)',
  getCompetitionById: 'SELECT * FROM competitions WHERE id = ?',

  // get all competitions that have the creator id of the paramater
  getAccountsCompetitions: 'SELECT * FROM competitions WHERE creator_id = ?',

  // get all user data (not just ids) that are participants of the given competition id
  getParticipantsOfCompetition: 'SELECT id, username, pass, api_key FROM (accounts a INNER JOIN competition_members cm ON a.id = cm.account_id) WHERE competition_id = ?',

  // given a user id and a new api_key, set the user's api key to the new value
  updateApiKeyOfAccount: 'UPDATE accounts SET api_key = ? WHERE id = ?',

  // get all the data (*) of every competition that this user_id (parameter) is competing in
  getAllParticipatingCompetitions: 'SELECT id, creator_id, start_date, end_date, starting_capital, name FROM competitions c INNER JOIN competition_members m ON m.competition_id = c.id WHERE account_id = ?'
};
