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

function unlockChat() {
  nickname = prompt("Enter your nickname:") || "Anon";
  nickname = nickname.trim().substring(0, 20);

  const userRef = db.ref(`rooms/${roomCode}/users/${nickname}`);
  userRef.set(true);
  userRef.onDisconnect().remove();

  sendSystemMsg(`${nickname} joined the chat.`);

  window.addEventListener("beforeunload", () => {
    sendSystemMsg(`${nickname} left the chat.`);
  });

  document.getElementById("calculator").style.display = "none";
  document.getElementById("chatSection").style.display = "flex";
  document.getElementById("whatsNewBtn").style.display = "block";

  listenToMessages();
  listenTypingStatus();
  listenUserCount();
}

function sendSystemMsg(text) {
  db.ref(`rooms/${roomCode}/chat`).push({
    text,
    sender: "System",
    type: "system",
    time: Date.now()
  });
}

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
      db.ref("rooms/" + roomCode + "/chat").push(message);
    };
    reader.readAsDataURL(selectedFile);
    selectedFile = null;
    document.getElementById("mediaInput").value = "";
  } else {
    message.type = "text";
    message.text = msg;
    db.ref("rooms/" + roomCode + "/chat").push(message);
  }

  msgInput.value = "";
  setTyping(false);
}

function handleFileUpload(input) {
  selectedFile = input.files[0];
  if (selectedFile) sendMsg();
}

function setTyping(isTyping) {
  db.ref(`rooms/${roomCode}/typing/${nickname}`).set(isTyping);
  if (isTyping && typingTimeout) clearTimeout(typingTimeout);
  if (isTyping) {
    typingTimeout = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }
}

function listenTypingStatus() {
  db.ref(`rooms/${roomCode}/typing`).on("value", snapshot => {
    const data = snapshot.val() || {};
    const typingNames = Object.keys(data).filter(name => name !== nickname && data[name]);
    document.getElementById("typingStatus").textContent =
      typingNames.length > 0 ? `${typingNames.join(", ")} typing...` : "";
  });
}

function listenUserCount() {
  db.ref(`rooms/${roomCode}/users`).on("value", snapshot => {
    const users = snapshot.val() || {};
    document.getElementById("userCount").textContent = `👥 ${Object.keys(users).length} online`;
  });
}

function listenToMessages() {
  const chatBox = document.getElementById("chatBox");
  db.ref("rooms/" + roomCode + "/chat").on("child_added", snapshot => {
    const msg = snapshot.val();
    const id = snapshot.key;

    const div = document.createElement("div");
    div.className = "msg";

    if (msg.sender !== nickname && msg.sender !== "System") {
      const sender = document.createElement("div");
      sender.className = "senderName";
      sender.textContent = msg.sender;
      div.appendChild(sender);
    }

    if (msg.reply) {
      const reply = document.createElement("div");
      reply.className = "replyBox";
      reply.innerHTML = `<strong>${msg.reply.sender}:</strong> ${msg.reply.text}`;
      div.appendChild(reply);
    }

    const content = document.createElement("div");

    if (msg.type === "image") {
      const img = document.createElement("img");
      img.src = msg.text;
      img.className = "imgMsg";
      content.appendChild(img);
    } else if (msg.type === "video") {
      const vid = document.createElement("video");
      vid.src = msg.text;
      vid.controls = true;
      content.appendChild(vid);
    } else {
      content.textContent = msg.text;
    }

    div.appendChild(content);

    if (msg.sender === nickname) div.classList.add("you");
    else if (msg.sender === "System") div.classList.add("system");
    else div.classList.add("other");

    div.addEventListener("touchstart", e => (startX = e.touches[0].clientX));
    div.addEventListener("touchend", e => {
      if (startX - e.changedTouches[0].clientX > 50) {
        replyToMessage = { sender: msg.sender, text: msg.text };
        document.getElementById("replyToText").textContent = `Replying to ${msg.sender}: ${msg.text}`;
        document.getElementById("replyBox").style.display = "flex";
      }
    });

    div.addEventListener("click", () => {
      replyToMessage = { sender: msg.sender, text: msg.text };
      document.getElementById("replyToText").textContent = `Replying to ${msg.sender}: ${msg.text}`;
      document.getElementById("replyBox").style.display = "flex";
    });

    div.addEventListener("contextmenu", e => {
      e.preventDefault();
      if (msg.sender === nickname) {
        if (confirm("Delete this message for everyone?")) {
          db.ref("rooms/" + roomCode + "/chat/" + id).remove();
        }
      }
    });

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (msg.sender !== "System") {
      setTimeout(() => {
        db.ref("rooms/" + roomCode + "/chat/" + id).remove();
      }, 10 * 60 * 1000);
    }
  });
}

function cancelReply() {
  replyToMessage = null;
  document.getElementById("replyBox").style.display = "none";
}