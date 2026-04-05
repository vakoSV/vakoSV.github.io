document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatFallback = document.getElementById('chat-fallback');
    
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

        if (chatFallback) {
            chatFallback.classList.add('is-hidden');
        }
        
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

    /* -----------------------------------------------------------------
       Interactive Background Canvas (Bubbles)
    ----------------------------------------------------------------- */
    const canvas = document.getElementById('bg-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray = [];

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let mouse = {
            x: null,
            y: null,
            radius: 120
        };

        window.addEventListener('mousemove', function(event) {
            mouse.x = event.x;
            mouse.y = event.y;
        });

        window.addEventListener('resize', function() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        });

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.baseX = this.x;
                this.baseY = this.y;
                this.density = (Math.random() * 30) + 1;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouse.radius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const maxDistance = mouse.radius;
                    const force = (maxDistance - distance) / maxDistance;
                    const directionX = forceDirectionX * force * this.density;
                    const directionY = forceDirectionY * force * this.density;

                    this.x -= directionX;
                    this.y -= directionY;
                } else {
                    if (this.x !== this.baseX) {
                        let dx = this.x - this.baseX;
                        this.x -= dx / 50; 
                    }
                    if (this.y !== this.baseY) {
                        let dy = this.y - this.baseY;
                        this.y -= dy / 50;
                    }
                }

                this.x += this.directionX;
                this.y += this.directionY;
                this.baseX += this.directionX;
                this.baseY += this.directionY;

                this.draw();
            }
        }

        function initParticles() {
            particlesArray = [];
            let numberOfParticles = (canvas.height * canvas.width) / 12000;
            
            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 4) + 1;
                let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                let directionX = (Math.random() * 0.4) - 0.2;
                let directionY = (Math.random() * 0.4) - 0.2;
                
                const colors = [
                    'rgba(6, 182, 212, 0.15)',
                    'rgba(30, 41, 59, 0.4)',
                    'rgba(56, 189, 248, 0.1)'
                ];
                let color = colors[Math.floor(Math.random() * colors.length)];

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, innerWidth, innerHeight);

            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }
        }

        initParticles();
        animate();
    }
});
