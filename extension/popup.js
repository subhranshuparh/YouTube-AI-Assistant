document.addEventListener('DOMContentLoaded', () => {
  const questionInput = document.getElementById('question');
  const clearBtn = document.getElementById('clearBtn');
  const askBtn = document.getElementById('askBtn');
  const statusEl = document.getElementById('status');
  const responseEl = document.getElementById('response');
  const charCount = document.getElementById('charCount');
  const btnText = document.getElementById('btnText');
  const quickPrompts = document.querySelectorAll('.quick-prompt');

  // Character counter
  questionInput.addEventListener('input', (e) => {
    const length = e.target.value.length;
    charCount.textContent = `${length}/500`;
    clearBtn.classList.toggle('visible', length > 0);
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    questionInput.value = '';
    charCount.textContent = '0/500';
    clearBtn.classList.remove('visible');
    responseEl.textContent = '';
    statusEl.textContent = '';
    statusEl.className = '';
    questionInput.focus();
  });

  // Quick prompts
  quickPrompts.forEach(btn => {
    btn.addEventListener('click', () => {
      questionInput.value = btn.dataset.prompt;
      charCount.textContent = `${btn.dataset.prompt.length}/500`;
      clearBtn.classList.add('visible');
      questionInput.focus();
    });
  });

  // Enter key support
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !askBtn.disabled) {
      askBtn.click();
    }
  });

  // Ask button - Real API integration
  askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    
    // Clear previous states
    responseEl.textContent = '';
    responseEl.className = '';
    statusEl.textContent = '';
    statusEl.className = '';
    askBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Processing...';

    if (!question) {
      statusEl.textContent = 'Please enter a question.';
      statusEl.className = 'error';
      askBtn.disabled = false;
      btnText.textContent = 'Ask AI';
      return;
    }

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url || !tab.url.includes("youtube.com/watch")) {
      responseEl.textContent = 'Please open a YouTube video page first.';
      responseEl.className = 'error';
      statusEl.className = 'error';
      askBtn.disabled = false;
      btnText.textContent = 'Ask AI';
      return;
    }

    const url = new URL(tab.url);
    const videoId = url.searchParams.get("v");
    if (!videoId) {
      responseEl.textContent = 'Could not extract video ID from URL.';
      responseEl.className = 'error';
      statusEl.className = 'error';
      askBtn.disabled = false;
      btnText.textContent = 'Ask AI';
      return;
    }

    // Loading state
    statusEl.innerHTML = '<span class="spinner"></span>Fetching transcript and generating answer...';
    statusEl.className = 'success';

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
        responseEl.textContent = errorMsg;
        responseEl.className = 'error';
        statusEl.textContent = '✗ Processing failed.';
        statusEl.className = 'error';
      } else if (askData.answer && askData.answer.trim()) {
        responseEl.textContent = askData.answer;
        responseEl.className = 'success';
        statusEl.textContent = '✅ Answer ready!';
        statusEl.className = 'success';
      } else {
        responseEl.textContent = 'No answer generated. Try rephrasing your question.';
        responseEl.className = 'error';
        statusEl.textContent = 'Unexpected response.';
        statusEl.className = 'error';
      }
    } catch (error) {
      console.error("Extension error:", error);
      responseEl.textContent = `Connection error: ${error.message}.\n\n🔧 Ensure the backend server is running on localhost:8000.`;
      responseEl.className = 'error';
      statusEl.textContent = 'Network issue.';
      statusEl.className = 'error';
    } finally {
      askBtn.disabled = false;
      btnText.textContent = 'Ask AI';
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3000);  // Auto-hide status after 3s
    }
  });

  // Initial focus
  questionInput.focus();
});