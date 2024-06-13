const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./election.db');

// Create users table
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, firstName TEXT, lastName TEXT, idNumber TEXT UNIQUE, email TEXT UNIQUE, password TEXT, hasVoted BOOLEAN, address TEXT UNIQUE)");
  console.log('Successfully created users table');
});

// Create candidates table
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS candidates (id INTEGER PRIMARY KEY AUTOINCREMENT, CfirstName TEXT, ClastName TEXT, CidNumber TEXT UNIQUE, voteCount INTEGER DEFAULT 0)");
  console.log('Successfully created candidates table');
});

const createUser = (firstName, lastName, idNumber, email, password, address, callback) => {
  const stmt = db.prepare("INSERT INTO users (firstName, lastName, idNumber, email, password, hasVoted, address) VALUES (?, ?, ?, ?, ?, ?, ?)");
  stmt.run(firstName, lastName, idNumber, email, password, false, address, function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        callback(new Error('ID number or email already exists'), null);
      } else {
        callback(err, null);
      }
    } else {
      callback(null, this.lastID);
    }
  });
  stmt.finalize();
};


const createCandidate = (CfirstName, ClastName, CidNumber, callback) => {
    const stmt = db.prepare("INSERT INTO candidates (CfirstName, ClastName, CidNumber, voteCount) VALUES (?, ?, ?, ?)");
    stmt.run(CfirstName, ClastName, CidNumber, 0, function(err) { // Set voteCount to 0
      callback(err, this.lastID);
    });
    stmt.finalize();
  };

const checkUserExists = (email, idNumber) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) AS count FROM users WHERE email = ? OR idNumber = ?", [email, idNumber], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count > 0);
        }
      });
    });
  };

  const signIn = (email, password, callback) => {
    db.get("SELECT id FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
      if (err) {
        callback(err, null);
      } else {
        if (row) {
          callback(null, row.id); // Return the user ID if the credentials match
        } else {
          callback(null, null); // Return null if no user found with the provided credentials
        }
      }
    });
  };

  const checkIfUserHasVoted = (idNumber, callback) => {
    db.get("SELECT hasVoted FROM users WHERE idNumber = ?", [idNumber], (err, row) => {
      if (err) {
        callback(err, null);
      } else {
        if (row) {
          callback(null, row.hasVoted); // Return hasVoted status
        } else {
          callback(null, null); // Return null if no user found with the provided idNumber
        }
      }
    });
  };
  
  const getAllVotedUsers = (callback) => {
    db.all("SELECT id, firstName, lastName, idNumber, email, hasVoted, address FROM users WHERE hasVoted = 1", (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, rows); // Return all users who have voted, excluding password
      }
    });
  };

  const voteByIdNumber = (address, callback) => {
    db.run("UPDATE users SET hasVoted = 1 WHERE address = ?", [address], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, this.changes); // Return the number of rows affected
      }
    });
  };

  const increaseVoteCount = (CidNumber, callback) => {
    db.run("UPDATE candidates SET voteCount = voteCount + 1 WHERE CidNumber = ?", [CidNumber], function(err) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, this.changes); // Return the number of rows affected
      }
    });
  };

module.exports = {
  createUser,
  createCandidate,
  checkUserExists,
  signIn,
  checkIfUserHasVoted,
  getAllVotedUsers,
  voteByIdNumber ,
  increaseVoteCount
};
