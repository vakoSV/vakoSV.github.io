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

        // 4. Async webhook fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

        try {
            console.log("Sending payload to Make.com:", { message: message });
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
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

            const responseData = await response.json();
            console.log("Make.com response received:", responseData);

            let replyText = "Success! I received your message via workflow.";
            
            // Extract AI text based on typical Make.com webhook responses or OpenAI modules
            if (responseData && responseData.reply) {
                replyText = responseData.reply;
            } else if (responseData && responseData.body) {
                replyText = responseData.body; // Sometimes it's wrapped in a body property
            } else if (typeof responseData === 'string') {
                replyText = responseData;
            } else if (responseData && responseData.message) {
                replyText = responseData.message;
            } else {
                 // Fallback if structure is unexpected
                 replyText = JSON.stringify(responseData);
            }

            removeTypingIndicator();
            addMessage(replyText, true);

        } catch (error) {
            clearTimeout(timeoutId);
            removeTypingIndicator();
            
            if (error.name === 'AbortError') {
                console.error("Fetch request to Make.com timed out after 15 seconds.");
                addMessage("The AI took too long to respond. Please try again.", true);
            } else {
                console.error("Fetch error or JSON parsing failed:", error);
                addMessage("Service is currently offline or the workflow failed. Please check the console for details.", true);
            }
        }
    }

    sendBtn.addEventListener('click', handleSendMessage);
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
});
