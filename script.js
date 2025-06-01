// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCyDPPWdQJXIPyQt4NOKc5TSyzVbkr3l9w",
  authDomain: "ghostchat-e408e.firebaseapp.com",
  databaseURL: "https://ghostchat-e408e-default-rtdb.firebaseio.com/",
  projectId: "ghostchat-e408e",
  storageBucket: "ghostchat-e408e.appspot.com",
  messagingSenderId: "576411557322",
  appId: "1:576411557322:web:f0567e675db87173ae0333"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let input = "";
let roomCode = "secretroom"; // You can change this code to make different rooms

// Handle calculator input
function press(val) {
  const display = document.getElementById("display");

  if (val === "C") {
    input = "";
    display.textContent = "0";
  } else if (val === "=") {
    if (input === "8080") {
      unlockChat(); // Unlock chat
    } else {
      try {
        display.textContent = eval(input);
      } catch {
        display.textContent = "Error";
      }
      input = "";
    }
  } else {
    input += val;
    display.textContent = input;
  }
}

// Show chat section
function unlockChat() {
  document.getElementById("calculator").style.display = "none";
  document.getElementById("chatSection").style.display = "flex";
  listenToMessages();
}

// Send message to Firebase
function sendMsg() {
  const msgInput = document.getElementById("msgInput");
  const msg = msgInput.value.trim();
  if (!msg) return;

  const msgData = {
    text: msg,
    time: Date.now()
  };

  db.ref("rooms/" + roomCode).push(msgData);
  msgInput.value = "";
}

// Listen to chat messages
function listenToMessages() {
  db.ref("rooms/" + roomCode).on("value", (snapshot) => {
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";
    const data = snapshot.val();

    for (let key in data) {
      const msg = data[key];
      const timePassed = (Date.now() - msg.time) / 1000;

      // Delete messages older than 10 minutes
      if (timePassed > 600) {
        db.ref("rooms/" + roomCode + "/" + key).remove();
      } else {
        chatBox.innerHTML += `<div class="msg">🗣️ ${msg.text}</div>`;
      }
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}