const test = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                transcript: "I need",
                chatHistory: [],
                isQuestion: false,
                context: ["Living Room"],
                selectedWords: [],
                requestedWordCount: 10,
                model: "openai"
            })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Headers:", Object.fromEntries(res.headers.entries()));
        console.log("Body:", text);
    } catch(e) {
        console.error("Fetch failed:", e);
    }
}
test();
