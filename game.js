
/**
 *
 * [client vs client]
 * > node game.js
 *
 * [client vs ai]
 * > node game.js ai
 *
 * [cancel the game]
 * > node game.js cancel
 *
 **/

var Client = require('./client');

client = new Client();
client.login();
client.connect();
