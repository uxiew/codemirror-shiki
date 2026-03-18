const e=`CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR(40) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, username, email)
VALUES
  (1, 'alice', 'alice@example.com'),
  (2, 'bob', 'bob@example.com');

SELECT id, username, email
FROM users
WHERE username LIKE 'a%';
`;export{e as default};
