document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get("gameId");
  var wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  var wsConnectionUrl = wsProtocol + "wordsnatch.pharmascroll.com/ws";
  var ws = new WebSocket("ws://localhost:8080");

  var game;

  let playerName = localStorage.getItem("playerName");

  if (playerName == null || playerName == "") {
    playerName = prompt("Please enter your name");
    localStorage.setItem("playerName", playerName);
  }

  document.getElementById("gameId").innerText = `Game ID: ${gameId}`;

  ws.onopen = () => {
    console.log("Connected to WebSocket");

    ws.send(
      JSON.stringify({
        action: "join",
        gameId: gameId,
        playerName: playerName,
      })
    );
  };

  ws.onmessage = (event) => {
    console.log("Message from server ", event.data);
    game = JSON.parse(event.data);
    // Update player list for both game creation and player joining
    if (game.creator === playerName) {
      document.getElementById("startGame").style.display = "block";
    }

    if (game.type === "playerJoined") {
      updatePlayerList(game.players);
    }

    if (game.state === "inProgress") {
      document.querySelector(".waiting").style.display = "none";
      document.querySelector(".game").style.display = "flex";
      game.letters.forEach((letter) => {
        const letterElement = document.createElement("div");
        letterElement.classList.add("letter");
        letterElement.innerText = letter.letter;
        letterElement.id = letter.id;
        letterElement.addEventListener("click", (event) =>
          selectLetter(event.target)
        );
        document.getElementById("letters").appendChild(letterElement);
      });
    }

    if (game.type === "timer") {
      document.getElementById("timer").innerText = `Time Left: ${game.timer}`;
    }

    if (game.type === "letter") {
      let letter = game.letters[game.letters.length - 1];
      const letterElement = document.createElement("div");
      letterElement.classList.add("letter");
      letterElement.addEventListener("click", (event) =>
        selectLetter(event.target)
      );
      letterElement.innerText = letter.letter;
      letterElement.id = letter.id;
      document.getElementById("letters").appendChild(letterElement);
    }
    if (game.type === "snatch") {
      let ids = game.ids;
      ids.forEach((id) => {
        document.getElementById(id).remove();
      });
      document.getElementById("messageLog").style.display = "flex";
      addMessage(`${game.playerName} snatched the word ${game.word}`);
      updatePlayerList(game.players);
    }

    if (game.state === "gameOver") {
      updatePlayerList(game.players);
      document.querySelector(".waiting").style.display = "none";
      document.querySelector(".game").style.display = "none";
      document.getElementById("messageLog").style.display = "none";
      document.getElementById("gameOver").style.display = "flex";
      document.querySelector(".leaderboard").style.display = "flex";
      if (game.creator === playerName) {
        document.getElementById("export").style.display = "block";
      }
    }
  };

  ws.onerror = (error) => {
    console.log("WebSocket error: " + error.message);
  };

  ws.onclose = (event) => {
    console.log("WebSocket connection closed");
  };

  function updatePlayerList(players) {
    const playersList = document.getElementById("players");
    playersList.innerHTML = ""; // Clear current list

    players.forEach((player) => {
      const playerElement = document.createElement("div");
      playerElement.innerText = player.name; // Assuming 'player' has a 'name' property
      playersList.appendChild(playerElement);
    });
    players.sort((a, b) => b.score - a.score);
    console.log(players);
    const leaderboard = document.querySelector(".leaderboard");
    const tbody = leaderboard.querySelector("tbody");
    tbody.innerHTML = ""; // Clear current list
    players.forEach((player) => {
      const playerElement = document.createElement("tr");
      if (player.name === playerName) {
        document.getElementById(
          "score"
        ).innerText = `Your Score: ${player.score}`;
        playerElement.style.backgroundColor = "green";
      }
      words = player.words.join(", ");
      playerElement.innerHTML = `<td>${player.name}</td><td>${player.score}</td><td>${words}</td>`; // Assuming 'player' has a 'name' property
      tbody.appendChild(playerElement);
    });
  }

  document.getElementById("startGame").addEventListener("click", () => {
    if (game.players.length < 2) {
      alert("Need at least 2 players to start the game");
      return;
    } else {
      ws.send(
        JSON.stringify({
          action: "startGame",
          playerName: playerName,
          gameId: gameId,
        })
      );
    }
  });

  document.getElementById("getletter").addEventListener("click", () => {
    if (game.total === 0) {
      alert("No more letters left");
      return;
    }
    let btn = document.getElementById("getletter");
    btn.disabled = true; // Disable the button at the start

    // Start with 5 seconds for the countdown
    let countdown = 5;

    // Update the button text to show the countdown
    btn.innerText = countdown;

    // Set up an interval to count down every second
    let countdownInterval = setInterval(() => {
      countdown--; // Decrease the countdown
      btn.innerText = countdown; // Update the button text with the new countdown value

      if (countdown === 0) {
        clearInterval(countdownInterval); // Stop the interval
        btn.innerText = "Turn in letter"; // Reset button text or set to a new text
        btn.disabled = false; // Enable the button
      }
    }, 1000); // 1000 milliseconds = 1 second

    ws.send(
      JSON.stringify({
        action: "getletter",
        playerName: playerName,
        gameId: gameId,
      })
    );
  });

  // Use querySelectorAll to select all elements with the class "letter" and loop through them to add event listeners
  function selectLetter(element) {
    let selectedLetter = document.createElement("div"); // Create a div (or span) for the selected letter
    selectedLetter.innerText = element.innerText;
    selectedLetter.id = element.id;
    selectedLetter.addEventListener("click", (event) =>
      removeLetter(event.target)
    ); // Add event listener to the new element
    selectedLetter.classList.add("selectedLetter"); // Add class to the created element for styling or further selection
    document.querySelector("#selectedLetters").appendChild(selectedLetter); // Append the new element to the container
    element.remove(); // Remove the clicked element
  }

  function removeLetter(element) {
    let letterElement = document.createElement("div"); // Create a div (or span) for the selected letter
    letterElement.innerText = element.innerText;
    letterElement.id = element.id;
    letterElement.addEventListener("click", (event) =>
      selectLetter(event.target)
    ); // Add event listener to the new element
    letterElement.classList.add("letter"); // Add class to the created element for styling or further selection
    document.querySelector("#letters").appendChild(letterElement); // Append the new element to the container
    element.remove(); // Remove the clicked element
  }

  document.getElementById("snatch").addEventListener("click", () => {
    let selectedLetters = document.querySelectorAll(".selectedLetter");
    let word = "";
    selectedLetters.forEach((letter) => {
      word += letter.innerText;
    });
    if (word.length < 3) {
      alert("Word must be at least 3 letters long");
      return;
    }
    if (word == "") {
      alert("No letters selected");
      return;
    }
    fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + word)
      .then((response) => response.json())
      .then((data) => {
        if (data.title === "No Definitions Found") {
          alert("Not a valid word");
        } else {
          let ids = [];
          selectedLetters.forEach((letter) => {
            ids.push(letter.id);
          });
          ws.send(
            JSON.stringify({
              action: "snatch",
              playerName: playerName,
              gameId: gameId,
              word: word,
              ids: ids,
            })
          );
        }
      });
  });

  function addMessage(newMessage) {
    const previousMessage = document.getElementById("previousMessage");
    const currentMessage = document.getElementById("currentMessage");

    // Update the previous message to be the same as the current one
    previousMessage.innerText = currentMessage.innerText;

    // Set the new message as the current message
    currentMessage.innerText = newMessage;
  }

  document.getElementById("leaderboard").addEventListener("click", () => {
    document.querySelector(".leaderboard").style.display = "flex";
  });

  document.getElementById("backToGame").addEventListener("click", () => {
    document.querySelector(".leaderboard").style.display = "none";
  });
});
