const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 8080;
const cors = require("cors");
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors());

const games = {};

function createGameId(length = 6) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let gameId = "";
  for (let i = 0; i < length; i++) {
    gameId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return gameId;
}

// Function to start the timer for a game
function startTimer(timer, game) {
  var timerInSeconds = timer * 60;
  var interval = setInterval(function () {
    var minutes = Math.floor(timerInSeconds / 60);
    var seconds = timerInSeconds - minutes * 60;
    game.timer = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    Object.values(game.connections).forEach((playerWs) => {
      playerWs.send(
        JSON.stringify({
          type: "timer",
          timer: game.timer,
        })
      );
    });

    if (--timerInSeconds < 0) {
      clearInterval(interval);
      game.state = "gameOver";
      Object.values(game.connections).forEach((playerWs) => {
        playerWs.send(
          JSON.stringify({
            type: "gameOver",
            players: game.players,
            letters: game.letters,
            state: game.state,
          })
        );
      });
    }
  }, 1000);
}

wss.on("connection", (ws) => {
  let currentGameId;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.action) {
      case "createGame":
        const gameId = createGameId();
        const playerName = data.playerName;
        // Initialize the game with player info and set the initial score
        games[gameId] = {
          players: [],
          state: "waiting",
          creator: playerName,
          letters: [],
          connections: {},
          total: data.total,
          timer: data.timer,
        };
        // Notify the game creator that the game has been created
        ws.send(
          JSON.stringify({
            type: "gameCreated",
            gameId: gameId,
            playerName: playerName,
          })
        );
        console.log(`Game created by ${playerName} with ID ${gameId}`);
        break;

      case "join":
        const joinGameId = data.gameId;
        const joinPlayerName = data.playerName;

        if (games[joinGameId]) {
          var game = games[joinGameId];
          if (game.players.some((p) => p.name === joinPlayerName)) {
            // Player is already in the game, update their WebSocket connection
            game.connections[joinPlayerName] = ws;

            // Send current game state to the reconnected player
            ws.send(
              JSON.stringify({
                type: "playerJoined",
                players: game.players,
                state: game.state,
                creator: game.creator,
                letters: game.letters,
              })
            );

            // Optionally, notify other players about the reconnection if needed
          } else {
            // Player is not already in the game, add them as a new player
            game.players.push({ name: joinPlayerName, score: 0, words: [] });
            game.connections[joinPlayerName] = ws;

            // Notify all players in the game about the new player
            Object.values(game.connections).forEach((playerWs) => {
              playerWs.send(
                JSON.stringify({
                  type: "playerJoined",
                  players: game.players,
                  state: game.state,
                  creator: game.creator,
                })
              );
            });
            console.log(`${joinPlayerName} joined game ${joinGameId}`);
          }
        } else {
          // Handle case where game does not exist
          ws.send(JSON.stringify({ error: "Game does not exist." }));
        }
        break;

      case "startGame":
        console.log("Starting game");
        const startGameId = data.gameId;
        var game = games[startGameId];
        if (game.creator === data.playerName) {
          game.state = "inProgress";
          startTimer(game.timer, game);
          // Notify all players in the game that the game has started
          Object.values(game.connections).forEach((playerWs) => {
            playerWs.send(
              JSON.stringify({
                type: "gameStarted",
                state: game.state,
                players: game.players,
                creator: game.creator,
                letters: game.letters,
              })
            );
          });
          console.log(`Game ${startGameId} has started`);
        }
        break;

      case "getletter":
        var game = games[data.gameId];
        if (game.state === "inProgress") {
          const letter = getRandomLetter();
          game.letters.push(letter);
          game.total -= 1;
          Object.values(game.connections).forEach((playerWs) => {
            playerWs.send(
              JSON.stringify({
                type: "letter",
                players: game.players,
                letters: game.letters,
                total: game.total,
              })
            );
          });
          console.log(`New letter: ${letter}`);
        }
        break;

      case "snatch":
        var game = games[data.gameId];
        if (game.state === "inProgress") {
          data.ids.forEach((id) => {
            const index = game.letters.findIndex((letter) => letter.id === id);
            if (index > -1) {
              game.letters.splice(index, 1);
            }
          });
          let score = data.word.length;
          game.players[
            game.players.findIndex((player) => player.name === data.playerName)
          ].score += score;
          game.players[
            game.players.findIndex((player) => player.name === data.playerName)
          ].words.push(data.word);
          Object.values(game.connections).forEach((playerWs) => {
            playerWs.send(
              JSON.stringify({
                type: "snatch",
                letters: game.letters,
                playerName: data.playerName,
                word: data.word,
                players: game.players,
                ids: data.ids,
              })
            );
          });
        }
        break;
    }
  });
});

let letterIdCounter = 0;

function getRandomLetter() {
  // Include more instances of vowels to increase their selection probability
  const vowels = "aeiou";
  const consonants = "bcdfghjklmnpqrstvwxyz";
  const enhancedAlphabet = vowels.repeat(5) + consonants; // Adjust repetition to favor vowels
  const letter = enhancedAlphabet.charAt(
    Math.floor(Math.random() * enhancedAlphabet.length)
  );
  // Increment the counter to ensure uniqueness
  letterIdCounter++;
  // Return both the letter and its unique ID
  return { letter, id: `letter${letterIdCounter}` };
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
