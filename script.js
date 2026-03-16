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

        // 4. Async webhook fetch
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Since it's Make.com, it can return different types. 
            // Often it returns just a string or JSON.
            // Adjust depending on actual response.
            let replyText = "Success! I received your message via workflow.";
            
            try {
                const responseData = await response.json();
                // Usually Make.com maps it back. Let's assume responseData has a "reply" field or it just uses a string.
                if (responseData && responseData.reply) {
                    replyText = responseData.reply;
                } else if (typeof responseData === 'object') {
                    replyText = "Message processed successfully. (Object returned)";
                } else {
                    replyText = responseData;
                }
            } catch (e) {
                // Not JSON, read as text
                const textData = await response.text();
                if (textData) replyText = textData;
            }

            removeTypingIndicator();
            addMessage(replyText, true);

        } catch (error) {
            console.error("Webhook error:", error);
            removeTypingIndicator();
            addMessage("Service is currently offline or the workflow failed. Please try again later.", true);
        }
    }

    sendBtn.addEventListener('click', handleSendMessage);
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
});
