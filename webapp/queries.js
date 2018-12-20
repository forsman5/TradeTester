module.exports = {
  getAccountByUsername: 'SELECT * FROM accounts WHERE username = ?',
  getAccountById: 'SELECT * FROM accounts WHERE id = ?',
  insertAccount: 'INSERT INTO accounts(username, pass, api_key) VALUES(?, ?, ?)',

  // todo

  // take in everything but the id (because autoincrement) of this new competition
  insertCompetition: '',
  getCompetitionById: '',

  // get all competitions (*) that have the creator id of the paramater
  getAccountsCompetitions: '',

  // get all user data (not just ids) that are participants of the given competition id
  getParticipantsOfCompetition: '',
};
