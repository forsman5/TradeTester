competition
  - id text
  - name text
  - join_password blob
  - admin_password blob
  - starting_capital int
  - start_date text
  - end_date text

team
  - id text
  - competition_id text
  - name text
  - password blob
  - current_capital int

portfolio
  - symbol text (together with team_id is primary key)
  - team_id text
  - count int
