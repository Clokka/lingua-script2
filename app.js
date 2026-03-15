const modeData = {
  romantic: {
    description: "Practice warm, respectful flirting and date conversation flow.",
    missions: [
      "Break the ice with a thoughtful compliment.",
      "Keep a date conversation flowing for 5 turns.",
      "Suggest a second date idea naturally.",
    ],
    aiPrompts: [
      "You're meeting someone you like at a bookstore. Start the chat.",
      "Your date asks what you find exciting in life. Answer naturally.",
      "They smile and ask where you'd like to go next weekend.",
    ],
  },
  humor: {
    description: "Train playful banter, witty responses, and light social timing.",
    missions: [
      "Turn a boring comment into a funny response.",
      "Keep a playful conversation alive for 4 replies.",
      "Recover from an awkward silence with humor.",
    ],
    aiPrompts: [
      "Your friend says Monday is their favorite day. React with humor.",
      "Someone spills coffee and says 'I planned this'. Reply playfully.",
      "The room gets quiet. Say something to lighten the mood.",
    ],
  },
  charisma: {
    description: "Build clear, confident speech for social and professional moments.",
    missions: [
      "Introduce yourself with confidence in two lines.",
      "Tell a short, interesting story from your week.",
      "Persuade someone to join your plan for tonight.",
    ],
    aiPrompts: [
      "You're at a networking event. Give your 20-second intro.",
      "Someone asks what you do. Make it memorable.",
      "Invite a colleague to your project idea with confidence.",
    ],
  },
};

const state = {
  mode: "romantic",
  chatHistory: [],
  lastAssistantReply: "",
  ...loadProgress(),
};

const streakEl = document.getElementById("streak");
const xpEl = document.getElementById("xp");
const confidenceEl = document.getElementById("confidence");
const missionTextEl = document.getElementById("missionText");
const modeDescriptionEl = document.getElementById("modeDescription");
const chatWindowEl = document.getElementById("chatWindow");
const feedbackListEl = document.getElementById("feedbackList");
const messageTemplate = document.getElementById("messageTemplate");
const userInputEl = document.getElementById("userInput");
const sendBtnEl = document.getElementById("sendBtn");
const statusTextEl = document.getElementById("statusText");

function loadProgress() {
  const saved = JSON.parse(localStorage.getItem("appolineProgress") || "{}");
  return {
    streak: saved.streak ?? 0,
    xp: saved.xp ?? 0,
    confidence: saved.confidence ?? 50,
    lastPracticeDate: saved.lastPracticeDate ?? null,
  };
}

function saveProgress() {
  localStorage.setItem(
    "appolineProgress",
    JSON.stringify({
      streak: state.streak,
      xp: state.xp,
      confidence: state.confidence,
      lastPracticeDate: state.lastPracticeDate,
    })
  );
}

function setStatus(message, type = "") {
  statusTextEl.textContent = message;
  statusTextEl.classList.remove("success", "error");
  if (type) {
    statusTextEl.classList.add(type);
  }
}

function setLoading(isLoading) {
  sendBtnEl.disabled = isLoading;
  userInputEl.disabled = isLoading;
  sendBtnEl.textContent = isLoading ? "Thinking..." : "Send";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function updateStats() {
  streakEl.textContent = state.streak;
  xpEl.textContent = state.xp;
  confidenceEl.textContent = state.confidence;
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setMode(mode) {
  state.mode = mode;
  modeDescriptionEl.textContent = modeData[mode].description;
  missionTextEl.textContent = sample(modeData[mode].missions);

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.mode === mode);
  });
}

function addMessage(role, text) {
  const node = messageTemplate.content.cloneNode(true);
  node.querySelector(".role").textContent = role;
  node.querySelector(".text").textContent = text;
  chatWindowEl.appendChild(node);
  chatWindowEl.scrollTop = chatWindowEl.scrollHeight;
}

function scoreUserInput(input) {
  const wordCount = input.trim().split(/\s+/).length;
  const confidenceGain = Math.min(4, Math.max(1, Math.floor(wordCount / 4)));
  state.xp += 10 + confidenceGain;
  state.confidence = Math.min(100, state.confidence + confidenceGain);

  const feedback = [
    `Great effort. You earned +${10 + confidenceGain} XP.`,
    "Native tweak: shorten one sentence to sound more natural.",
    `Tone score improved by +${confidenceGain}. Keep your pace steady.`,
  ];

  if (/[!?]/.test(input)) {
    feedback.push("Nice emotional delivery. Your expression sounded more alive.");
  }

  return feedback;
}

function updateStreak() {
  const today = todayISO();
  if (state.lastPracticeDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.streak = state.lastPracticeDate === yesterday ? state.streak + 1 : 1;
  state.lastPracticeDate = today;
}

function renderFeedback(items) {
  feedbackListEl.innerHTML = "";
  items.forEach((text, index) => {
    const li = document.createElement("li");
    li.textContent = text;
    if (index === 0) li.classList.add("positive");
    feedbackListEl.appendChild(li);
  });
}

function startMission() {
  chatWindowEl.innerHTML = "";
  state.chatHistory = [];
  const firstPrompt = sample(modeData[state.mode].aiPrompts);
  addMessage("Appoline", firstPrompt);
  state.lastAssistantReply = firstPrompt;
  state.chatHistory.push({ role: "assistant", content: firstPrompt });
  renderFeedback([
    "Complete at least 3 turns for full mission XP.",
    "Focus on sounding relaxed, not perfect.",
    "Tap Daily Challenge for bonus XP.",
  ]);
  setStatus("Mission started. Send a message to chat with Appoline.");
}

async function requestChatReply(text) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: state.mode,
      message: text,
      history: state.chatHistory,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || "Chat API request failed.");
  }
  return data.reply;
}

async function speakText(text) {
  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || "TTS API request failed.");
  }

  const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
  await audio.play();
}

document.getElementById("modeChips").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button) return;
  setMode(button.dataset.mode);
  startMission();
});

document.getElementById("startMissionBtn").addEventListener("click", () => {
  updateStreak();
  startMission();
  updateStats();
  saveProgress();
});

document.getElementById("dailyChallengeBtn").addEventListener("click", () => {
  state.xp += 20;
  state.confidence = Math.min(100, state.confidence + 2);
  renderFeedback([
    "Bonus challenge completed: +20 XP.",
    "Try a second session in a different mode for extra growth.",
    "Repeat your best phrase 3 times for retention.",
  ]);
  updateStats();
  saveProgress();
  setStatus("Daily Challenge reward granted.", "success");
});

document.getElementById("testApiBtn").addEventListener("click", async () => {
  try {
    setStatus("Testing chat connection...");
    const reply = await requestChatReply("Say hello and ask me one short question.");
    setStatus("Chat API is connected.", "success");
    addMessage("Appoline", reply);
    state.lastAssistantReply = reply;
    state.chatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    setStatus(`Chat API test failed: ${error.message}`, "error");
  }
});

document.getElementById("speakLastBtn").addEventListener("click", async () => {
  if (!state.lastAssistantReply) {
    setStatus("No assistant message yet to speak.", "error");
    return;
  }

  try {
    setStatus("Generating voice...");
    await speakText(state.lastAssistantReply);
    setStatus("Playing voice reply.", "success");
  } catch (error) {
    setStatus(`Voice request failed: ${error.message}`, "error");
  }
});

document.getElementById("clearChatBtn").addEventListener("click", () => {
  chatWindowEl.innerHTML = "";
  state.chatHistory = [];
  state.lastAssistantReply = "";
  renderFeedback(["Chat cleared.", "Start a new mission or send a new message."]);
  setStatus("Chat cleared.");
});

document.getElementById("chatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = userInputEl.value.trim();
  if (!text) return;

  addMessage("You", text);
  state.chatHistory.push({ role: "user", content: text });

  const feedback = scoreUserInput(text);
  renderFeedback(feedback);

  updateStreak();
  updateStats();
  saveProgress();

  userInputEl.value = "";
  setLoading(true);
  setStatus("Appoline is thinking...");

  try {
    const reply = await requestChatReply(text);
    addMessage("Appoline", reply);
    state.lastAssistantReply = reply;
    state.chatHistory.push({ role: "assistant", content: reply });
    setStatus("Reply received.", "success");
  } catch (error) {
    addMessage("Appoline", "I had trouble connecting. Please check server/API setup and retry.");
    setStatus(`Chat failed: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

setMode(state.mode);
updateStats();
startMission();
