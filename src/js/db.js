const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
Dba ={
 initDatabase:function () {
    db.serialize(() => {
        db.run(`CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            idNumber TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            address TEXT NOT NULL
        )`);

        console.log('Successfully created users table');

        db.run(`CREATE TABLE candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            idNumber TEXT UNIQUE NOT NULL,
            voteCount INTEGER DEFAULT 0
        )`);

        console.log('Successfully created candidates table');
    });
}

}