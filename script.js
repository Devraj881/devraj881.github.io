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

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let input = "";
let roomCode = "";
let nickname = "";

// Calculator Input
function press(val) {
  const display = document.getElementById("display");

  if (val === "C") {
    input = "";
    display.textContent = "0";
  } else if (val === "=") {
    const enteredCode = input;
    db.ref("rooms/" + enteredCode).once("value", snapshot => {
      if (snapshot.exists()) {
        roomCode = enteredCode;
        unlockChat();
      } else {
        display.textContent = "Invalid Code ❌";
      }
    });
    input = "";
  } else {
    input += val;
    display.textContent = input;
  }
}

// Unlock Chat UI
function unlockChat() {
  nickname = prompt("Enter your nickname (e.g. Ghost💀):") || "Anon";
  nickname = nickname.trim().substring(0, 20);

  document.getElementById("calculator").style.display = "none";
  document.getElementById("chatSection").style.display = "flex";
  listenToMessages();
}

// Send Message
function sendMsg() {
  const msgInput = document.getElementById("msgInput");
  const msg = msgInput.value.trim();
  if (!msg) return;

  const msgData = {
    text: msg,
    sender: nickname,
    time: Date.now()
  };

  db.ref("rooms/" + roomCode).push(msgData);
  msgInput.value = "";
}

// Listen to Messages
function listenToMessages() {
  db.ref("rooms/" + roomCode).on("value", (snapshot) => {
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";

    const data = snapshot.val();
    for (let key in data) {
      const msg = data[key];
      const timePassed = (Date.now() - msg.time) / 1000;

      // Delete after 10 mins
      if (timePassed > 600) {
        db.ref("rooms/" + roomCode + "/" + key).remove();
        continue;
      }

      const isMe = msg.sender === nickname;
      const msgDiv = document.createElement("div");
      msgDiv.className = `msg ${isMe ? "you" : "other"}`;
      msgDiv.innerHTML = `${isMe ? "➤ You" : `👤 ${msg.sender}`}: ${msg.text}`;
      chatBox.appendChild(msgDiv);
    }

    chatBox.scrollTop = chatBox.scrollHeight;
  });
}