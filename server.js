const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createUser, createCandidate ,checkUserExists,checkIfUserHasVoted,getAllVotedUsers,voteByIdNumber} = require('./database'); // Import database function

const PORT = process.env.PORT || 3001;

const hashPassword = (password, pepper) => {
  return crypto.createHash('sha256').update(password + pepper).digest('hex');
};


const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    if (req.url === '/create-user') {
      // Handle create user route
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { firstName, lastName, idNumber, email, password,address } = JSON.parse(body);
        const hashedPassword = hashPassword(password, lastName);
        createUser(firstName, lastName, idNumber, email, hashedPassword,address, (err, id) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Internal Server Error' }));
          } else {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'User created successfully', userId: id }));
          }
        });
      });
    } else if (req.url === '/create-candidate') {
      // Handle create candidate route
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { CfirstName, ClastName, CidNumber } = JSON.parse(body);

        createCandidate(CfirstName, ClastName, CidNumber, (err, id) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Internal Server Error' }));
          } else {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Candidate created successfully', candidateId: id }));
          }
        });
      });
    }
    else if (req.url === '/check-user') {
      // Handle check user route
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        const { email, idNumber } = JSON.parse(body);

        try {
          const userExists = await checkUserExists(email, idNumber);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ exists: userExists }));
        } catch (error) {
          console.error('Error checking user:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Internal Server Error' }));
        }
      });
    }
    else if (req.url === '/check-if-user-has-voted') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { idNumber } = JSON.parse(body);

        checkIfUserHasVoted(idNumber, (err, hasVoted) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Internal Server Error' }));
          } else if (hasVoted === null) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'User not found' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ hasVoted }));
          }
        });
      });
    } 
    else if (req.url === '/get-all-voted-users') {
      getAllVotedUsers((err) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Internal Server Error' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ users }));
        }
      });
    }
    else if (req.url === '/vote-by-id-number') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { address } = JSON.parse(body);

        voteByIdNumber(address, (err, changes) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Internal Server Error' }));
          } else if (changes === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'User not found' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'User voted successfully' }));
          }
        });
      });
    }
    else if (req.url === '/increase-vote-count') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { CidNumber } = JSON.parse(body);
  
        increaseVoteCount(CidNumber, (err, changes) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Internal Server Error' }));
          } else if (changes === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Candidate not found' }));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Vote count increased successfully' }));
          }
        });
      });
    } 
    else {
      // Unsupported route
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Not Found' }));
    }
  }
   else {
    // Handle GET requests
    let filePath = '.' + req.url;
    if (filePath === './') {
      filePath = './src/index.html';
    } else {
      filePath = './src' + req.url;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          fs.readFile('./src/404.html', (error, content) => {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          });
        } else {
          res.writeHead(500);
          res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
          res.end();
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

module.exports = server;
