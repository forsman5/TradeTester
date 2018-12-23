module.exports = {
  getAccountByUsername: 'SELECT * FROM accounts WHERE username = ?',
  getAccountById: 'SELECT * FROM accounts WHERE id = ?',
  getCompetitionById: 'SELECT * FROM competitions WHERE id = ?',

  // order of parameters is as given in the create table statement
  insertCompetition: 'INSERT INTO competitions(creator_id, start_date, end_date, starting_capital, name) VALUES(?, ?, ?, ?, ?)',
  insertAccount: 'INSERT INTO accounts(username, pass, api_key) VALUES(?, ?, ?)',
  insertCompetitionMember: 'INSERT INTO competition_members(account_id, competition_id, capital, active_state) VALUES (?, ?, ?, ?)',

  // this always buys! buy negative to sell
  updatePortfolio: 'INSERT OR REPLACE INTO portfolios(competition_id, account_id, symbol, shares) ' +
                    'VALUES ($competition, $account, $symbol, (' +
                    'coalesce((SELECT shares FROM portfolios WHERE account_id = $account AND competition_id = $competition AND symbol = $symbol), 0) + $quantity))',

  updateCapital: 'UPDATE competition_members SET capital = ? WHERE competition_id = ? AND account_id = ?',

  getActiveState: 'SELECT active_state, capital FROM competition_members WHERE competition_id = ? AND account_id = ?',

  // TODO also delete portfolios
  deleteCompetitionMember: 'DELETE FROM competition_members WHERE competition_id = ? and account_id = ?',

  // get all competitions that have the creator id of the paramater
  getAccountsCompetitions: 'SELECT * FROM competitions WHERE creator_id = ?',

  // get all user data (not just ids) that are participants of the given competition id
  getParticipantsOfCompetition: 'SELECT id, username, pass, api_key, active_state FROM (accounts a INNER JOIN competition_members cm ON a.id = cm.account_id) WHERE competition_id = ?',

  // given a user id and a new api_key, set the user's api key to the new value
  updateApiKeyOfAccount: 'UPDATE accounts SET api_key = ? WHERE id = ?',

  // get all the data (*) of every competition that this user_id (parameter) is competing in
  getAllParticipatingCompetitions: 'SELECT id, creator_id, start_date, end_date, starting_capital, name, active_state FROM competitions c INNER JOIN competition_members m ON m.competition_id = c.id ' +
                                   ' WHERE account_id = ?',

  activateMember: 'UPDATE competition_members SET active_state = 1 WHERE competition_id = ? and account_id = ?',

  getPortfolio: 'SELECT * FROM portfolios WHERE competition_id = ? AND account_id = ?',

  // these are used for searching
  // where the second param is not already a competitor
  getCompetitionsByUsername: 'SELECT competitions.id, username, start_date, end_date, starting_capital, name ' +
                             'FROM competitions INNER JOIN accounts on creator_id = accounts.id WHERE username LIKE ? ' +
                             'AND competitions.id NOT IN (SELECT competition_id FROM competition_members WHERE account_id = ?)',
  getCompetitionsByCompName: 'SELECT competitions.id, username, start_date, end_date, starting_capital, name ' +
                             'FROM competitions INNER JOIN accounts on creator_id = accounts.id WHERE name LIKE ? ' +
                             'AND competitions.id NOT IN (SELECT competition_id FROM competition_members WHERE account_id = ?)'
};
