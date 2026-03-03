import fetch from "node-fetch";

const payload = {
  transcript: "",
  chatHistory: [
    { role: "partner", text: "Hello, welcome to the cafe." },
    { role: "user", text: "I would like to see the menu, please." }
  ],
  grid1: { x: 2, y: 2 },
  grid2: { x: 2, y: 2 },
  grid3: { x: 2, y: 2 },
  isQuestion: false,
  context: ["📍 Cafe", "🗣️ Barista"],
  selectedWords: [],
  requestedWordCount: 20
};

fetch("http://localhost:3000/api/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
