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
        };

        const PROJECTS = [
            {
                id: 'rag', accent: 'cyan', accentColor: '#22d3ee',
                title: 'Enterprise Internal AI Assistant & RAG',
                description: 'Role-gated internal assistant grounded in private company knowledge.',
                chip: 'Private-doc grounded responses',
                nodes: [
                    { id: 'a', label: 'Open WebUI', icon: 'chat',     x: 38,  y: 50  },
                    { id: 'b', label: 'n8n Core',   icon: 'workflow', x: 134, y: 50  },
                    { id: 'c', label: 'RBAC',       icon: 'shield',   x: 230, y: 50  },
                    { id: 'd', label: 'Supabase',   icon: 'database', x: 134, y: 145 },
                    { id: 'e', label: 'Answer',     icon: 'sparkles', x: 326, y: 98  },
                ],
                edges: [
                    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'b', to: 'd' },
                    { from: 'c', to: 'e' }, { from: 'd', to: 'e' },
                ],
                outputs: ['e'],
            },
            {
                id: 'onboarding', accent: 'green', accentColor: '#34d399',
                title: 'End-to-End Automated Customer Onboarding',
                description: 'Zero-touch journey from form submission to paid client state.',
                chip: 'Billing + email/SMS fully automated',
                nodes: [
                    { id: 'a', label: 'Lead Form', icon: 'form',    x: 38,  y: 50  },
                    { id: 'b', label: 'Webhook',   icon: 'webhook', x: 134, y: 50  },
                    { id: 'c', label: 'Segment',   icon: 'users',   x: 230, y: 50  },
                    { id: 'd', label: 'CRM + Pay', icon: 'crm',     x: 134, y: 145 },
                    { id: 'e', label: 'Follow-up', icon: 'bell',    x: 326, y: 98  },
                ],
                edges: [
                    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'b', to: 'd' },
                    { from: 'c', to: 'e' }, { from: 'd', to: 'e' },
                ],
                outputs: ['e'],
            },
            {
                id: 'voice', accent: 'blue', accentColor: '#60a5fa',
                title: 'AI Voice Agent & CRM Integration',
                description: 'High-volume inbound automation with routing and booking logic.',
                chip: '500+ daily calls handled',
                nodes: [
                    { id: 'a', label: 'Inbound',   icon: 'phone',    x: 38,  y: 50  },
                    { id: 'b', label: 'Voice AI',  icon: 'sparkles', x: 134, y: 50  },
                    { id: 'c', label: 'NLP Route', icon: 'share',    x: 230, y: 50  },
                    { id: 'd', label: 'Airtable',  icon: 'database', x: 134, y: 145 },
                    { id: 'e', label: 'Calendar',  icon: 'calendar', x: 326, y: 98  },
                ],
                edges: [
                    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'b', to: 'd' },
                    { from: 'c', to: 'e' }, { from: 'd', to: 'e' },
                ],
                outputs: ['e'],
            },
            {
                id: 'funnel', accent: 'purple', accentColor: '#a78bfa',
                title: 'Backend Workflow & Lead Funnel Automation',
                description: 'Unified traffic, nurture, conversion, and payment orchestration.',
                chip: 'Faster response and cleaner close path',
                nodes: [
                    { id: 'a', label: 'Traffic',  icon: 'chart',    x: 38,  y: 50  },
                    { id: 'b', label: 'Funnels',  icon: 'filter',   x: 134, y: 50  },
                    { id: 'c', label: 'Nurture',  icon: 'bell',     x: 230, y: 50  },
                    { id: 'd', label: 'GHL Core', icon: 'workflow', x: 134, y: 145 },
                    { id: 'e', label: 'Convert',  icon: 'check',    x: 326, y: 98  },
                ],
                edges: [
                    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'b', to: 'd' },
                    { from: 'c', to: 'e' }, { from: 'd', to: 'e' },
                ],
                outputs: ['e'],
            },
            {
                id: 'database', accent: 'orange', accentColor: '#fb923c',
                title: 'Database Architecture & Business Automation',
                description: 'Scaled data models from prototype structures to stable systems.',
                chip: '60% onboarding time reduction',
                nodes: [
                    { id: 'a', label: 'Airtable',  icon: 'database', x: 38,  y: 50  },
                    { id: 'b', label: 'Schema',    icon: 'form',     x: 134, y: 50  },
                    { id: 'c', label: 'Rules',     icon: 'rules',    x: 230, y: 50  },
                    { id: 'd', label: 'Postgres',  icon: 'database', x: 134, y: 145 },
                    { id: 'e', label: 'Dashboard', icon: 'chart',    x: 326, y: 98  },
                ],
                edges: [
                    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'b', to: 'd' },
                    { from: 'c', to: 'e' }, { from: 'd', to: 'e' },
                ],
                outputs: ['e'],
            },
            {
                id: 'webdev', accent: 'pink', accentColor: '#f472b6',
                title: 'Web Development & WordPress Architecture',
                description: 'Responsive UI delivery with QA alignment and API-readiness.',
                chip: 'Production-ready interfaces shipped',
                nodes: [
                    { id: 'a', label: 'Design',    icon: 'palette', x: 38,  y: 50  },
                    { id: 'b', label: 'HTML/CSS',  icon: 'code',    x: 134, y: 50  },
                    { id: 'c', label: 'QA + API',  icon: 'check',   x: 230, y: 50  },
                    { id: 'd', label: 'WordPress', icon: 'globe',   x: 134, y: 145 },
                    { id: 'e', label: 'Publish',   icon: 'send',    x: 326, y: 98  },
                ],
                edges: [
                    { from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'b', to: 'd' },
                    { from: 'c', to: 'e' }, { from: 'd', to: 'e' },
                ],
                outputs: ['e'],
            },
        ];

        const VIEW_W = 380;
        const VIEW_H = 200;
        const NODE_HALF = 26;
        const DEST_GAP = 6;

        const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));

        function chooseAnchors(from, to) {
            const dx = to.x - from.x, dy = to.y - from.y;
            if (Math.abs(dx) > Math.abs(dy)) {
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
