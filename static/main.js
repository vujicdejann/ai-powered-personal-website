// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
});

// Disable common developer tools shortcuts and printing shortcuts
document.addEventListener('keydown', function(e) {
  // Disable F12 (Developer Tools)
  if (e.keyCode === 123) {
    e.preventDefault();
    return false;
  }
  
  // Disable Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J (Windows/Linux) or Command+Option+I/C/J (Mac)
  // Block Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J (Windows/Linux)
  // and Command+Option+I, Command+Option+C, Command+Option+J (Mac)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && 
      (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) {
    e.preventDefault();
    return false;
  }
  
  // Disable Ctrl+U (View Source)
  if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
    e.preventDefault();
    return false;
  }
  
  // Disable printing shortcuts:
  // Ctrl+P (Windows/Linux and others) 
  // Command+P (Mac)
  // Command+Option+P (Another variation on Mac)
  if ((e.ctrlKey || e.metaKey) && e.keyCode === 80) {
    e.preventDefault();
    return false;
  }
  
  if (e.metaKey && e.altKey && e.keyCode === 80) { 
    // For Command+Option+P on Mac (and any variant that uses meta+alt+p)
    e.preventDefault();
    return false;
  }
});

// Disable dragging (images, links, etc.)
document.addEventListener('dragstart', function(e) {
  e.preventDefault();
});

// Disable copying to clipboard
document.addEventListener('copy', function(e) {
  e.preventDefault();
});

// Optionally, intercept before print events
window.addEventListener('beforeprint', function(e) {
  e.preventDefault();
  return false;
});




// Wait for DOM to load first
document.addEventListener("DOMContentLoaded", function() {
  // 1. Hide .cv-section-body for sections without .see
  document.querySelectorAll(".cv-section:not(.see) .cv-section-body").forEach(section => {
    section.style.display = "none";
  });

  // 2. Start loading the AI summary text (for the AI Professional Summary section)
  fetchAndAnimateSummary();
});

/************************************************
 * Section Toggling: Expand/Collapse
 ************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const toggleIcons = document.querySelectorAll(".toggle-icon");

  toggleIcons.forEach(icon => {
    icon.addEventListener("click", () => {
      const sectionBody = icon.closest("h2").nextElementSibling;

      if (sectionBody.style.display === "none" || sectionBody.style.display === "") {
        sectionBody.style.display = "block";
        icon.classList.remove("fa-chevron-down");
        icon.classList.add("fa-chevron-up");
      } else {
        sectionBody.style.display = "none";
        icon.classList.remove("fa-chevron-up");
        icon.classList.add("fa-chevron-down");
      }
    });
  });
});

document.querySelectorAll('.toggle-icon').forEach(icon => {
  icon.addEventListener('click', function () {
    const sectionBody = icon.closest("h2").nextElementSibling;
    sectionBody.classList.toggle("active");
    icon.classList.toggle("fa-chevron-up");
    icon.classList.toggle("fa-chevron-down");
  });
});

/************************************************
 * Input Sanitization to Prevent XSS
 ************************************************/
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/************************************************
 * Download CV Logic
 ************************************************/
document.addEventListener("DOMContentLoaded", function() {
  // Ensure the button exists before attaching the event listener
  const downloadButton = document.getElementById('download-cv');
  if (downloadButton) {
    downloadButton.addEventListener('click', function() {
      const cvFilePath = '/static/images/Dejan Vujic  - CV.pdf'; 
      const link = document.createElement('a');
      link.href = cvFilePath;
      link.download = 'Dejan Vujic - CV.pdf';
      document.body.appendChild(link);  
      link.click();  
      document.body.removeChild(link); 
    });
  } else {
    console.error("Download button not found.");
  }
});

/************************************************
 * AI Summary Fetch & Display
 ************************************************/
async function fetchAndDisplaySummary() {
  console.log("Fetching AI summary...");

  const gifContainer = document.getElementById("loading-gif-container");
  const aboutMeParagraph = document.getElementById("about-me-text");

  try {
      const response = await fetch("/summarize-local");
      if (!response.ok) throw new Error("Failed to fetch summary");

      const data = await response.json();
      gifContainer.style.display = "none";
      aboutMeParagraph.style.display = "block";
      aboutMeParagraph.textContent = data.summary;
  } catch (error) {
      console.error("Error fetching summary:", error);
      gifContainer.style.display = "none";
      aboutMeParagraph.style.display = "block";
      aboutMeParagraph.textContent = "Sorry, AI text could not be loaded.";
  }
}
document.addEventListener("DOMContentLoaded", fetchAndDisplaySummary);

/************************************************
 * Google reCAPTCHA v3 Integration
 ************************************************/
const submitBtn = document.getElementById("submit-btn");
if (submitBtn) {
  submitBtn.addEventListener("click", function () {
    grecaptcha.execute('6Lcxy54qAAAAAOCrjuTt7cGM0V7zO1kCReGuS_Z_', { action: 'submit' })
      .then(function (token) {
        console.log("reCAPTCHA token generated:", token);
        let form = document.getElementById('contactForm');
        let input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'g-recaptcha-response';
        input.value = token;
        form.appendChild(input);
        form.submit();
      });
  });
}

/************************************************
 * Cookies
 ************************************************/
document.addEventListener("DOMContentLoaded", function() {
  const cookiePopup = document.getElementById('cookie-popup');
  const acceptBtn = document.getElementById('accept-cookies');
  
  if (localStorage.getItem('cookiesAccepted') === 'true') {
    cookiePopup.style.display = 'none';
  }
  
  acceptBtn.addEventListener('click', function() {
    cookiePopup.style.display = 'none';
    localStorage.setItem('cookiesAccepted', 'true');
  });
});

/************************************************
 * Chatbot Logic
 ************************************************/
document.addEventListener('DOMContentLoaded', function() {
  const chatbotIcon = document.getElementById('chatbotIcon');
  const chatPopup = document.getElementById('chatPopup');
  const closeChat = document.getElementById('closeChat');
  const chatInvite = document.getElementById('chatInvite');
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const chatBody = document.getElementById('chatBody');

  chatbotIcon.addEventListener('click', function() {
    chatPopup.classList.toggle('active');
    if (chatPopup.classList.contains('active')) {
      chatInvite.style.display = 'none';
    }
  });

  closeChat.addEventListener('click', function() {
    chatPopup.classList.remove('active');
  });

  setTimeout(function() {
    if (!chatPopup.classList.contains('active')) {
      chatInvite.style.display = 'block';
    }
  }, 3000);

  function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      const userMsg = document.createElement('div');
      userMsg.className = 'chat-message user-message';
      userMsg.textContent = message;
      chatBody.appendChild(userMsg);
      chatInput.value = '';
      chatBody.scrollTop = chatBody.scrollHeight;

      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'chat-message bot-message';
      
      loadingMsg.style.display = 'flex';
      loadingMsg.style.justifyContent = 'center';
      loadingMsg.style.alignItems = 'center';

      const loadingImg = document.createElement('img');
      loadingImg.src = '/static/images/ai.gif'; 
      loadingImg.alt = 'Loading...';
      loadingImg.style.width = '150px';
      loadingImg.style.height = '150px';

      loadingMsg.appendChild(loadingImg);
      chatBody.appendChild(loadingMsg);
      chatBody.scrollTop = chatBody.scrollHeight;

      fetch('/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: message })
      })
      .then(response => response.json())
      .then(data => {
        chatBody.removeChild(loadingMsg);
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message bot-message';
        if (data.answer) {
          botMsg.textContent = data.answer;
        } else if (data.error) {
          botMsg.textContent = "Greška: " + data.error;
        }
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
      })
      .catch(error => {
        chatBody.removeChild(loadingMsg);
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message bot-message';
        botMsg.textContent = "An error occurred. Try again.";
        chatBody.appendChild(botMsg);
        chatBody.scrollTop = chatBody.scrollHeight;
      });
    }
  }

  sendBtn.addEventListener('click', sendMessage);

  chatInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
});