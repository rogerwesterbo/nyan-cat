const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8090;

app.use(express.static(path.join(__dirname, './src')));

app.listen(port);
console.log('Server started at http://localhost:' + port);
