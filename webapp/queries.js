module.exports = {
  getAccountByUsername: 'SELECT * FROM accounts WHERE username = ?',
  getAccountById: 'SELECT * FROM accounts WHERE id = ?',
  insertAccount: 'INSERT INTO accounts(username, pass, api_key) VALUES(?, ?, ?)',

  // todo

  // take in everything but the id (because autoincrement) of this new competition
  // order of parameters is as given in the create table statement
  insertCompetition: '',
  getCompetitionById: '',

  // given a user id and a new api_key, set the user's api key to the new value
  updateApiKeyOfAccount: '',

  // get all competitions (*) that have the creator id of the paramater
  getAccountsCompetitions: '',

  // get all user data (not just ids) that are participants of the given competition id
  getParticipantsOfCompetition: '',

  // get all the data (*) of every competition that this user_id (parameter) is competing in
  getAllParticipatingCompetitions: ''
};
