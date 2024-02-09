function createGame(event) {
  event.preventDefault();

  const playerName = document.querySelector('input[name="playername"]').value;
  const timer = document.querySelector('input[name="timer"]').value;
  const totalletters = document.querySelector(
    'input[name="totalLetters"]'
  ).value;
  var wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  var wsConnectionUrl = wsProtocol + "wordsnatch.pharmascroll.com/ws";
  var socket = new WebSocket(wsConnectionUrl);

  ws.onopen = () => {
    console.log("WebSocket connection established");
    // Send a message to the server to create a new game
    ws.send(
      JSON.stringify({
        action: "createGame",
        playerName: playerName,
        timer: timer,
        total: totalletters,
      })
    );
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Message from server: ", data);

    if (data.type === "gameCreated") {
      console.log("Game created: ", data.gameId);
      localStorage.setItem("playerName", playerName);
      // Redirect to the lobby page with the game ID and a flag indicating this is the creator
      window.location.href = `./game.html?gameId=${data.gameId}`;
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };
}
