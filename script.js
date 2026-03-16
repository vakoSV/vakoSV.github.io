document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatWindow = document.getElementById('chat-window');
    
    // The placeholder webhook url from the user's prompt
    const webhookUrl = 'https://hook.us1.make.com/bf15a3cgco1lm3wl3aq3clb9wf3qefpc';

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addMessage(content, isAi = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isAi ? 'ai-message' : 'user-message');
        messageDiv.textContent = content;
        chatWindow.appendChild(messageDiv);
        scrollToBottom();
    }

    function addTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');
        indicator.id = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatWindow.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    async function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 1. Add user message
        addMessage(message, false);
        
        // 2. Clear input
        chatInput.value = '';

        // 3. Show typing indicator
        addTypingIndicator();

        // 4. Async webhook fetch with 30s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

        try {
            console.log("Sending payload to Make.com:", { message: message });
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`HTTP Error: ${response.status} ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Read raw text first — Make.com sometimes sends plain text, sometimes JSON
            const rawText = await response.text();
            console.log("Make.com raw response:", rawText);

            let replyText = "I received your message but couldn't parse the response.";

            try {
                // Attempt to parse as JSON (handles array or object formats)
                const responseData = JSON.parse(rawText);
                const data = Array.isArray(responseData) ? responseData[0] : responseData;

                if (data && data.body && typeof data.body === 'string') {
                    replyText = data.body;
                } else if (data && data.reply && typeof data.reply === 'string') {
                    replyText = data.reply;
                } else if (data && data.message && typeof data.message === 'string') {
                    replyText = data.message;
                } else if (typeof data === 'string') {
                    replyText = data;
                } else {
                    replyText = JSON.stringify(data);
                }
            } catch (e) {
                // Not JSON — use the raw string directly as the AI reply
                if (rawText && rawText.trim().length > 0) {
                    replyText = rawText.trim();
                }
            }

            removeTypingIndicator();
            addMessage(replyText, true);

        } catch (error) {
            clearTimeout(timeoutId);
            removeTypingIndicator();
            
            if (error.name === 'AbortError') {
                console.error("Exact Fetch Error: ", error);
                addMessage("The AI took too long to respond (30s timeout). Please try again.", true);
            } else {
                console.error("Exact Fetch Error: ", error);
                addMessage("Service is currently offline or the workflow failed. Please check the console for details.", true);
            }
        }
    }

    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        handleSendMessage();
    });
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
    });
});
