document.addEventListener('DOMContentLoaded', () => {
  const questionInput = document.getElementById("question");
  const askBtn = document.getElementById("askBtn");
  const clearBtn = document.getElementById("clearBtn");
  const responseDiv = document.getElementById("response");
  const statusDiv = document.getElementById("status");

  // Clear button functionality
  clearBtn.addEventListener("click", () => {
    questionInput.value = "";
    responseDiv.textContent = "";
    statusDiv.textContent = "";
    statusDiv.className = "";
    questionInput.focus();
  });

  // Enter key to ask
  questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      askBtn.click();
    }
  });

  askBtn.addEventListener("click", async () => {
    const question = questionInput.value.trim();
    
    // Clear previous states
    responseDiv.textContent = "";
    statusDiv.textContent = "";
    statusDiv.className = "";
    askBtn.disabled = true;
    askBtn.textContent = "Processing...";

    if (!question) {
      statusDiv.textContent = "Please enter a question.";
      statusDiv.className = "error";
      askBtn.disabled = false;
      askBtn.textContent = "Ask AI";
      return;
    }

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes("youtube.com/watch")) {
      responseDiv.textContent = "Please open a YouTube video page first.";
      statusDiv.className = "error";
      askBtn.disabled = false;
      askBtn.textContent = "Ask AI";
      return;
    }

    const url = new URL(tab.url);
    const videoId = url.searchParams.get("v");
    if (!videoId) {
      responseDiv.textContent = "Could not extract video ID from URL.";
      statusDiv.className = "error";
      askBtn.disabled = false;
      askBtn.textContent = "Ask AI";
      return;
    }

    // After videoId check: Simplified fetch (backend auto-processes)
    responseDiv.textContent = "";
    statusDiv.innerHTML = '<span class="loading"></span>Fetching transcript and generating answer...';
    statusDiv.className = "success";

    try {
      const askRes = await fetch(
        `http://localhost:8000/ask?video_id=${videoId}&question=${encodeURIComponent(question)}`
      );
      
      if (!askRes.ok) {
        throw new Error(`HTTP ${askRes.status}: ${askRes.statusText}`);
      }
      
      const askData = await askRes.json();

      if (askData.error) {
        let errorMsg = askData.error;
        if (errorMsg.includes("No transcript")) {
          errorMsg += "\n\n💡 Tip: Try a video with English/Hindi captions (e.g., TED Talks or popular podcasts).";
        }
        responseDiv.textContent = errorMsg;
        statusDiv.textContent = "Processing failed.";
        statusDiv.className = "error";
      } else if (askData.answer && askData.answer.trim()) {
        responseDiv.textContent = askData.answer;
        statusDiv.textContent = "✅ Answer ready!";
        statusDiv.className = "success";
      } else {
        responseDiv.textContent = "No answer generated. Try rephrasing your question.";
        statusDiv.textContent = "Unexpected response.";
        statusDiv.className = "error";
      }
    } catch (error) {
      console.error("Extension error:", error);
      responseDiv.textContent = `Connection error: ${error.message}.\n\n🔧 Ensure the backend server is running on localhost:8000.`;
      statusDiv.textContent = "Network issue.";
      statusDiv.className = "error";
    } finally {
      askBtn.disabled = false;
      askBtn.textContent = "Ask AI";
    }
  });

  // Focus input on load
  questionInput.focus();
});