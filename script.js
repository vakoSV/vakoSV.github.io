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

    /* -----------------------------------------------------------------
       Projects: animated make.com / n8n style flow diagrams
    ----------------------------------------------------------------- */
    const projectsGrid = document.getElementById('projects-grid');
    if (projectsGrid) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const ICON_PATHS = {
            chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
            workflow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h2a3 3 0 0 1 3 3v2"/><path d="M14 18h-2a3 3 0 0 1-3-3v-2"/>',
            shield: '<path d="M12 22s8-4 8-11V4l-8-3-8 3v7c0 7 8 11 8 11z"/>',
            database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
            sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.7 2L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-1z"/><path d="M5 4l.5 1.5L7 6l-1.5.5L5 8l-.5-1.5L3 6l1.5-.5z"/>',
            form: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
            webhook: '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17a3.99 3.99 0 0 1 3.34-3.95"/><path d="M7.99 6.01l3 5.19A4 4 0 1 1 8.7 14"/><path d="M12 2a4 4 0 0 1 3.86 5.06"/>',
            users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
            crm: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5 17.5C5.5 15.5 7 14 9 14s3.5 1.5 4 3.5M14 9h5M14 13h3"/>',
            bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
            phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.71A2 2 0 0 1 22 16.92z"/>',
            share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>',
            calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
            chart: '<path d="M3 3v18h18"/><rect x="7" y="13" width="3" height="5"/><rect x="12" y="9" width="3" height="9"/><rect x="17" y="6" width="3" height="12"/>',
            filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
            globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
            code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
            check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
            palette: '<circle cx="13.5" cy="6.5" r="0.6" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.6" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.6" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.6" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
            send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
            rules: '<circle cx="3" cy="6" r="0.6" fill="currentColor"/><circle cx="3" cy="12" r="0.6" fill="currentColor"/><circle cx="3" cy="18" r="0.6" fill="currentColor"/><path d="M8 6h13M8 12h13M8 18h13"/>',
            mcp: '<circle cx="12" cy="12" r="3.2"/><circle cx="5" cy="5" r="1.6" fill="currentColor"/><circle cx="19" cy="5" r="1.6" fill="currentColor"/><circle cx="5" cy="19" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/><path d="M6.4 6.4L9.7 9.7M17.6 6.4L14.3 9.7M6.4 17.6L9.7 14.3M17.6 17.6L14.3 14.3"/>',
            card: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><path d="M6 15h4"/>',
            mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/>',
            branch: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 7l8 4M8 17l8-4"/>',
            book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16M9 7h7"/>',
            megaphone: '<path d="M3 11v3l4 1.5v-6zM7 9.5L18 4v16L7 14.5z"/><path d="M11 21l3-1V14"/>',
            layers: '<path d="M12 2L22 8.5L12 15L2 8.5z"/><path d="M2 15.5L12 22L22 15.5"/>',
        };

        const PROJECTS = [
            // 1) RADIAL HUB: MCP center, clients/data sources orbit around it
            {
                id: 'rag', accent: 'cyan', accentColor: '#22d3ee',
                title: 'Enterprise Internal AI Assistant & RAG',
                description: 'MCP-powered hub bridging clients, LLMs, vector stores and source-of-truth systems.',
                chip: 'MCP server, private-doc grounded',
                nodes: [
                    { id: 'webui',     label: 'Open WebUI', icon: 'chat',     x: 38,  y: 110 },
                    { id: 'n8n',       label: 'n8n',        icon: 'workflow', x: 115, y: 50  },
                    { id: 'anthropic', label: 'Anthropic',  icon: 'sparkles', x: 265, y: 50  },
                    { id: 'mcp',       label: 'MCP',        icon: 'mcp',      x: 190, y: 110 },
                    { id: 'supabase',  label: 'Supabase',   icon: 'database', x: 115, y: 170 },
                    { id: 'github',    label: 'GitHub',     icon: 'code',     x: 265, y: 170 },
                    { id: 'answer',    label: 'Answer',     icon: 'send',     x: 320, y: 110 },
                ],
                edges: [
                    { from: 'webui',     to: 'mcp' },
                    { from: 'n8n',       to: 'mcp' },
                    { from: 'anthropic', to: 'mcp' },
                    { from: 'supabase',  to: 'mcp' },
                    { from: 'github',    to: 'mcp' },
                    { from: 'mcp',       to: 'answer' },
                ],
                outputs: ['answer'],
            },

            // 2) FAN-OUT / FAN-IN diamond: webhook splits to 3 systems, all merge into Done
            {
                id: 'onboarding', accent: 'green', accentColor: '#34d399',
                title: 'End-to-End Automated Customer Onboarding',
                description: 'Webhook fans out to billing, CRM and messaging in parallel, then converges.',
                chip: 'Billing + email/SMS fully automated',
                nodes: [
                    { id: 'form',    label: 'Lead Form', icon: 'form',    x: 38,  y: 110 },
                    { id: 'hook',    label: 'Webhook',   icon: 'webhook', x: 110, y: 110 },
                    { id: 'stripe',  label: 'Stripe',    icon: 'card',    x: 200, y: 50  },
                    { id: 'crm',     label: 'CRM',       icon: 'crm',     x: 200, y: 110 },
                    { id: 'email',   label: 'Email/SMS', icon: 'mail',    x: 200, y: 170 },
                    { id: 'done',    label: 'Done',      icon: 'check',   x: 300, y: 110 },
                ],
                edges: [
                    { from: 'form',   to: 'hook'   },
                    { from: 'hook',   to: 'stripe' },
                    { from: 'hook',   to: 'crm'    },
                    { from: 'hook',   to: 'email'  },
                    { from: 'stripe', to: 'done'   },
                    { from: 'crm',    to: 'done'   },
                    { from: 'email',  to: 'done'   },
                ],
                outputs: ['done'],
            },

            // 3) DECISION TREE with three independent output arrows leaving the card
            {
                id: 'voice', accent: 'blue', accentColor: '#60a5fa',
                title: 'AI Voice Agent & CRM Integration',
                description: 'Voice intent classification routes each call to the right downstream system.',
                chip: '500+ daily calls handled',
                nodes: [
                    { id: 'phone',  label: 'Inbound',   icon: 'phone',    x: 38,  y: 110 },
                    { id: 'voice',  label: 'Voice AI',  icon: 'sparkles', x: 108, y: 110 },
                    { id: 'intent', label: 'Intent',    icon: 'branch',   x: 188, y: 110 },
                    { id: 'crm',    label: 'CRM',       icon: 'crm',      x: 285, y: 50  },
                    { id: 'cal',    label: 'Calendar',  icon: 'calendar', x: 285, y: 110 },
                    { id: 'kb',     label: 'Knowledge', icon: 'book',     x: 285, y: 170 },
                ],
                edges: [
                    { from: 'phone',  to: 'voice'  },
                    { from: 'voice',  to: 'intent' },
                    { from: 'intent', to: 'crm'    },
                    { from: 'intent', to: 'cal'    },
                    { from: 'intent', to: 'kb'     },
                ],
                outputs: ['crm', 'cal', 'kb'],
            },

            // 4) CONVERGENT FUNNEL: three traffic sources collapse into one nurture pipeline
            {
                id: 'funnel', accent: 'purple', accentColor: '#a78bfa',
                title: 'Backend Workflow & Lead Funnel Automation',
                description: 'Three traffic sources converge into a single nurture-and-convert pipeline.',
                chip: 'Faster response and cleaner close path',
                nodes: [
                    { id: 'ads',      label: 'Ads',      icon: 'megaphone', x: 38,  y: 50  },
                    { id: 'organic',  label: 'Organic',  icon: 'globe',     x: 38,  y: 110 },
                    { id: 'referral', label: 'Referral', icon: 'users',     x: 38,  y: 170 },
                    { id: 'funnel',   label: 'Funnels',  icon: 'filter',    x: 130, y: 110 },
                    { id: 'nurture',  label: 'Nurture',  icon: 'bell',      x: 215, y: 110 },
                    { id: 'ghl',      label: 'GHL Core', icon: 'workflow',  x: 305, y: 110 },
                ],
                edges: [
                    { from: 'ads',      to: 'funnel'  },
                    { from: 'organic',  to: 'funnel'  },
                    { from: 'referral', to: 'funnel'  },
                    { from: 'funnel',   to: 'nurture' },
                    { from: 'nurture',  to: 'ghl'     },
                ],
                outputs: ['ghl'],
            },

            // 5) DIAMOND: two sources -> Schema -> branches (Rules + Postgres) -> Dashboard
            {
                id: 'database', accent: 'orange', accentColor: '#fb923c',
                title: 'Database Architecture & Business Automation',
                description: 'Schema-first design splits validation rules from storage, then re-merges for reporting.',
                chip: '60% onboarding time reduction',
                nodes: [
                    { id: 'airtable',  label: 'Airtable',  icon: 'database', x: 38,  y: 50  },
                    { id: 'forms',     label: 'Forms',     icon: 'form',     x: 38,  y: 170 },
                    { id: 'schema',    label: 'Schema',    icon: 'layers',   x: 135, y: 110 },
                    { id: 'rules',     label: 'Rules',     icon: 'rules',    x: 220, y: 50  },
                    { id: 'postgres',  label: 'Postgres',  icon: 'database', x: 220, y: 170 },
                    { id: 'dashboard', label: 'Dashboard', icon: 'chart',    x: 320, y: 110 },
                ],
                edges: [
                    { from: 'airtable', to: 'schema'    },
                    { from: 'forms',    to: 'schema'    },
                    { from: 'schema',   to: 'rules'     },
                    { from: 'schema',   to: 'postgres'  },
                    { from: 'rules',    to: 'dashboard' },
                    { from: 'postgres', to: 'dashboard' },
                ],
                outputs: ['dashboard'],
            },

            // 6) PURE LINEAR pipeline: deliberately the simplest shape — production deploy
            {
                id: 'webdev', accent: 'pink', accentColor: '#f472b6',
                title: 'Web Development & WordPress Architecture',
                description: 'Straightforward design-to-publish pipeline with QA and API integration in line.',
                chip: 'Production-ready interfaces shipped',
                nodes: [
                    { id: 'design',  label: 'Design',    icon: 'palette', x: 38,  y: 110 },
                    { id: 'code',    label: 'HTML/CSS',  icon: 'code',    x: 110, y: 110 },
                    { id: 'qa',      label: 'QA + API',  icon: 'check',   x: 182, y: 110 },
                    { id: 'wp',      label: 'WordPress', icon: 'globe',   x: 254, y: 110 },
                    { id: 'publish', label: 'Publish',   icon: 'send',    x: 326, y: 110 },
                ],
                edges: [
                    { from: 'design', to: 'code'    },
                    { from: 'code',   to: 'qa'      },
                    { from: 'qa',     to: 'wp'      },
                    { from: 'wp',     to: 'publish' },
                ],
                outputs: ['publish'],
            },
        ];

        const VIEW_W = 380;
        const VIEW_H = 220;
        const NODE_HALF = 26;
        const DEST_GAP = 6;
        const DIAG_THRESHOLD = 40;

        const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));

        function chooseAnchors(from, to) {
            const dx = to.x - from.x, dy = to.y - from.y;
            const adx = Math.abs(dx), ady = Math.abs(dy);

            // Clearly diagonal: anchor on corresponding corners so radial spokes
            // and fan-out / fan-in patterns don't pile onto a single edge midpoint.
            if (adx > DIAG_THRESHOLD && ady > DIAG_THRESHOLD &&
                Math.min(adx, ady) / Math.max(adx, ady) > 0.45) {
                const dirX = dx > 0 ? 1 : -1;
                const dirY = dy > 0 ? 1 : -1;
                return [
                    { x: from.x + dirX * NODE_HALF,
                      y: from.y + dirY * NODE_HALF },
                    { x: to.x   - dirX * (NODE_HALF + DEST_GAP),
                      y: to.y   - dirY * (NODE_HALF + DEST_GAP) },
                ];
            }

            // Otherwise: pick whichever of horizontal / vertical dominates.
            if (adx > ady) {
                if (dx > 0) return [
                    { x: from.x + NODE_HALF,            y: from.y },
                    { x: to.x   - NODE_HALF - DEST_GAP, y: to.y   },
                ];
                return [
                    { x: from.x - NODE_HALF,            y: from.y },
                    { x: to.x   + NODE_HALF + DEST_GAP, y: to.y   },
                ];
            }
            if (dy > 0) return [
                { x: from.x, y: from.y + NODE_HALF            },
                { x: to.x,   y: to.y   - NODE_HALF - DEST_GAP },
            ];
            return [
                { x: from.x, y: from.y - NODE_HALF            },
                { x: to.x,   y: to.y   + NODE_HALF + DEST_GAP },
            ];
        }

        function bezierPath(s, e) {
            const mx = (s.x + e.x) / 2;
            return `M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${e.y}, ${e.x} ${e.y}`;
        }

        function renderIconDefs() {
            const symbols = Object.entries(ICON_PATHS).map(([name, paths]) =>
                `<symbol id="icon-${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</symbol>`
            ).join('');
            return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${symbols}</defs></svg>`;
        }

        function renderEdges(p) {
            const internal = p.edges.map(edge => {
                const fromN = p.nodes.find(n => n.id === edge.from);
                const toN   = p.nodes.find(n => n.id === edge.to);
                const [s, e] = chooseAnchors(fromN, toN);
                const d = bezierPath(s, e);
                return `<path id="flow-${p.id}-${edge.from}-${edge.to}" d="${d}" class="flow-edge" marker-end="url(#arrow-${p.id})" />`;
            }).join('');

            const out = p.outputs.map(nid => {
                const n = p.nodes.find(x => x.id === nid);
                const sx = n.x + NODE_HALF;
                const ex = VIEW_W - 6;
                return `<path id="flow-${p.id}-out-${nid}" d="M ${sx} ${n.y} L ${ex} ${n.y}" class="flow-edge flow-edge-out" marker-end="url(#arrow-${p.id})" />`;
            }).join('');

            return internal + out;
        }

        function renderDots(p) {
            if (reduceMotion) return '';
            const all = [
                ...p.edges.map(e => `flow-${p.id}-${e.from}-${e.to}`),
                ...p.outputs.map(nid => `flow-${p.id}-out-${nid}`),
            ];
            return all.map((pid, i) => {
                const dur = 2.4 + (i % 5) * 0.3;
                const begin = -((i * 0.5) % dur);
                return `<circle r="2.7" class="flow-dot">`
                    + `<animateMotion dur="${dur}s" repeatCount="indefinite" begin="${begin.toFixed(2)}s" rotate="auto">`
                    + `<mpath href="#${pid}" /></animateMotion></circle>`;
            }).join('');
        }

        function renderNodes(p) {
            return p.nodes.map(n => `
                <g class="flow-node" tabindex="0">
                    <rect x="${n.x - NODE_HALF}" y="${n.y - NODE_HALF}" width="52" height="52" rx="11" class="node-bg" />
                    <use href="#icon-${n.icon}" x="${n.x - 12}" y="${n.y - 12}" width="24" height="24" class="node-icon" />
                    <text x="${n.x}" y="${n.y + NODE_HALF + 14}" text-anchor="middle" class="node-label">${escapeHtml(n.label)}</text>
                </g>
            `).join('');
        }

        function renderCard(p) {
            return `
                <article class="card module-card t-${p.accent}">
                    <h3>${escapeHtml(p.title)}</h3>
                    <p>${escapeHtml(p.description)}</p>
                    <div class="module-diagram">
                        <svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" class="flow-diagram" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(p.title)} flow">
                            <defs>
                                <marker id="arrow-${p.id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="${p.accentColor}" />
                                </marker>
                            </defs>
                            ${renderEdges(p)}
                            ${renderDots(p)}
                            ${renderNodes(p)}
                        </svg>
                    </div>
                    <span class="result-chip">${escapeHtml(p.chip)}</span>
                </article>
            `;
        }

        projectsGrid.innerHTML = renderIconDefs() + PROJECTS.map(renderCard).join('');
    }
});
