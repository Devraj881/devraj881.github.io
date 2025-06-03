const firebaseConfig = {
  apiKey: "AIzaSyCyDPPWdQJXIPyQt4NOKc5TSyzVbkr3l9w",
  authDomain: "ghostchat-e408e.firebaseapp.com",
  databaseURL: "https://ghostchat-e408e-default-rtdb.firebaseio.com/",
  projectId: "ghostchat-e408e",
  storageBucket: "ghostchat-e408e.appspot.com",
  messagingSenderId: "576411557322",
  appId: "1:576411557322:web:f0567e675db87173ae0333"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let input = "";
let roomCode = "";
let nickname = "";
let typingTimeout = null;
let replyToMessage = null;
let selectedFile = null;

// CALCULATOR UI
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

// JOIN CHAT
function unlockChat() {
  nickname = prompt("Enter your nickname (e.g. Ghost💀):") || "Anon";
  nickname = nickname.trim().substring(0, 20);

  const userRef = db.ref(`rooms/${roomCode}/users/${nickname}`);
  userRef.set(true);
  userRef.onDisconnect().remove();

  // Handle "left the chat" message properly
  db.ref(`rooms/${roomCode}/chat`).push({
    text: `${nickname} joined the chat.`,
    sender: "System",
    type: "system",
    time: Date.now()
  });

  db.ref(`rooms/${roomCode}/disconnects/${nickname}`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);

  document.getElementById("calculator").style.display = "none";
  document.getElementById("chatSection").style.display = "flex";

  // Show "What's New" button
  document.getElementById("whatsNewBtn").style.display = "block";

  listenToMessages();
  listenTypingStatus();
  listenUserCount();
  listenDisconnects();
}

// WATCH FOR USER DISCONNECTS
function listenDisconnects() {
  db.ref(`rooms/${roomCode}/disconnects`).on("child_added", snapshot => {
    const name = snapshot.key;
    if (name !== nickname) {
      db.ref(`rooms/${roomCode}/chat`).push({
        text: `${name} left the chat.`,
        sender: "System",
        type: "system",
        time: Date.now()
      });
    }
    db.ref(`rooms/${roomCode}/disconnects/${name}`).remove();
  });
}

// SEND MESSAGE
function sendMsg() {
  const msgInput = document.getElementById("msgInput");
  const msg = msgInput.value.trim();
  if (!msg && !selectedFile) return;

  const message = {
    sender: nickname,
    time: Date.now()
  };

  if (replyToMessage) {
    message.reply = replyToMessage;
    replyToMessage = null;
    document.getElementById("replyBox").style.display = "none";
  }

  if (selectedFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      message.type = selectedFile.type.startsWith("video") ? "video" : "image";
      message.text = e.target.result;
      db.ref(`rooms/${roomCode}/chat`).push(message);
    };
    reader.readAsDataURL(selectedFile);
    selectedFile = null;
    document.getElementById("mediaInput").value = "";
  } else {
    message.type = "text";
    message.text = msg;
    db.ref(`rooms/${roomCode}/chat`).push(message);
  }

  msgInput.value = "";
  setTyping(false);
}

// FILE UPLOAD
function handleFileUpload(input) {
  selectedFile = input.files[0];
  if (selectedFile) sendMsg();
}

// TYPING
function setTyping(isTyping) {
  db.ref(`rooms/${roomCode}/typing/${nickname}`).set(isTyping);
  if (isTyping && typingTimeout) clearTimeout(typingTimeout);
  if (isTyping) {
    typingTimeout = setTimeout(() => setTyping(false), 3000);
  }
}

function listenTypingStatus() {
  db.ref(`rooms/${roomCode}/typing`).on("value", snapshot => {
    const data = snapshot.val() || {};
    const typingNames = Object.keys(data).filter(name => name !== nickname && data[name]);
    const typingText = typingNames.length > 0 ? `${typingNames.join(", ")} typing...` : "";
    document.getElementById("typingStatus").textContent = typingText;
  });
}

// ONLINE USERS
function listenUserCount() {
  db.ref(`rooms/${roomCode}/users`).on("value", snapshot => {
    const users = snapshot.val() || {};
    document.getElementById("userCount").textContent = `👥 ${Object.keys(users).length} online`;
  });
}

// CHAT MESSAGES
function listenToMessages() {
  const chatBox = document.getElementById("chatBox");
  db.ref(`rooms/${roomCode}/chat`).on("child_added", snapshot => {
    const msg = snapshot.val();
    const id = snapshot.key;

    const div = document.createElement("div");
    div.className = "msg";

    const senderName = document.createElement("div");
    senderName.className = "senderName";
    if (msg.sender !== nickname && msg.sender !== "System") {
      senderName.textContent = msg.sender;
      div.appendChild(senderName);
    }

    if (msg.reply) {
      const replyBox = document.createElement("div");
      replyBox.className = "replyBox";
      replyBox.innerHTML = `<strong>${msg.reply.sender}:</strong> ${msg.reply.text}`;
      div.appendChild(replyBox);
    }

    const content = document.createElement("div");
    content.className = "msgContent";

    if (msg.type === "image") {
      const img = document.createElement("img");
      img.src = msg.text;
      img.className = "imgMsg";
      content.appendChild(img);
    } else if (msg.type === "video") {
      const video = document.createElement("video");
      video.src = msg.text;
      video.controls = true;
      content.appendChild(video);
    } else {
      content.textContent = msg.text;
    }

    div.appendChild(content);

    // Class name
    if (msg.sender === nickname) div.classList.add("you");
    else if (msg.sender === "System") div.classList.add("system");
    else div.classList.add("other");

    // Swipe-to-reply only for messages from others
    if (msg.sender !== nickname && msg.text) {
      let startX;
      div.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
      });

      div.addEventListener("touchend", e => {
        let endX = e.changedTouches[0].clientX;
        if (startX - endX > 50) {
          replyToMessage = { sender: msg.sender, text: msg.text };
          document.getElementById("replyToText").textContent = `Replying to ${msg.sender}: ${msg.text}`;
          document.getElementById("replyBox").style.display = "flex";
        }
      });
    }

    // Click to reply (desktop)
    div.addEventListener("click", () => {
      if (msg.text) {
        replyToMessage = { sender: msg.sender, text: msg.text };
        document.getElementById("replyToText").textContent = `Replying to ${msg.sender}: ${msg.text}`;
        document.getElementById("replyBox").style.display = "flex";
      }
    });

    // Right-click to delete own messages
    div.addEventListener("contextmenu", e => {
      e.preventDefault();
      if (msg.sender === nickname) {
        const choice = confirm("Delete this message for everyone?");
        if (choice) {
          db.ref(`rooms/${roomCode}/chat/${id}`).remove();
        }
      }
    });

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Auto delete after 10 minutes
    if (msg.sender !== "System") {
      setTimeout(() => {
        db.ref(`rooms/${roomCode}/chat/${id}`).remove();
      }, 10 * 60 * 1000);
    }
  });
}

// Cancel reply
function cancelReply() {
  replyToMessage = null;
  document.getElementById("replyBox").style.display = "none";
}