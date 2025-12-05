"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // Cache DOM elements
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const phoenixButton = document.getElementById("phoenix-button");
    const userIdInput = document.getElementById("user-id");
    const macroButtons = document.querySelectorAll(".macro-btn");

    // Dashboard elements (Telemetry)
    const meters = {
        trust: document.getElementById("meter-trust"),
        clarity: document.getElementById("meter-clarity"),
        pain: document.getElementById("meter-pain"),
        drift: document.getElementById("meter-drift"),
        chaos: document.getElementById("meter-chaos"),
        mirror: document.getElementById("meter-mirror"),
        silence: document.getElementById("meter-silence"),
        fractality: document.getElementById("meter-fractality")
    };

    const statusPhase = document.getElementById("status-phase");
    const statusFacet = document.getElementById("status-facet");
    const connStatus = document.getElementById("connection-status");

    let requestStartTime = 0;

    // --- Event Listeners ---
    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
    phoenixButton.addEventListener("click", sendPhoenix);

    // Macro Injection Logic
    macroButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const textToInsert = btn.getAttribute("data-insert");
            const startPos = userInput.selectionStart;
            const endPos = userInput.selectionEnd;
            userInput.value = userInput.value.substring(0, startPos) 
                + textToInsert 
                + userInput.value.substring(endPos);
            userInput.focus();
            userInput.selectionStart = userInput.selectionEnd = startPos + textToInsert.length;
        });
    });

    /**
     * Send a query to the API. 
     */
    async function sendMessage() {
        const query = userInput.value.trim();
        const userId = userIdInput.value || "default-user";
        if (!query) return;

        addMessageToChat("user", query);
        userInput.value = "";
        userInput.disabled = true;
        sendButton.disabled = true;
        connStatus.textContent = "Processing...";
        connStatus.style.color = "#fbc02d"; // Sam Gold

        requestStartTime = Date.now();
        
        try {
            // NOTE: This assumes a backend conforming to Iskra v4.0 architecture specs
            const response = await fetch("/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    query: query,
                    input_duration_ms: Date.now() - requestStartTime,
                    macros: extractMacros(query) // Helper to extract flags
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`[${response.status}] ${errorData.detail?.message || "Communication Error"}`);
            }

            const data = await response.json();
            
            // Render Response
            addIskraResponse(data);
            updateDashboard(data);
            connStatus.textContent = "Connected";
            connStatus.style.color = "#26a69a"; // Anhantra Teal

        } catch (err) {
            addMessageToChat("system", `System Exception: ${err.message}`);
            connStatus.textContent = "Error";
            connStatus.style.color = "#d32f2f"; // Kain Red
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    /**
     * Trigger the Phoenix ritual: resets the current session.
     */
    async function sendPhoenix() {
        const userId = userIdInput.value || "default-user";
        if (!confirm("Подтвердить Ритуал Феникс? Память сессии будет сброшена.")) return;

        try {
            await fetch(`/ritual/phoenix/${userId}`, { method: "POST" });
            chatBox.innerHTML = "";
            addMessageToChat(
                "system",
                "🔥♻ Phoenix Protocol Activated. Memory reset. Mantra re-initialized."
            );
            // Reset metrics visually
            Object.values(meters).forEach(m => m.value = m.getAttribute('min') || 0);
        } catch (err) {
            addMessageToChat("system", `Phoenix Failed: ${err.message}`);
        }
    }

    /**
     * Parse and render complex Iskra v4.0 response.
     */
    function addIskraResponse(data) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message sender-iskra`;

        // 1. Facet Header (Voice)
        const facet = data.facet || "Iskra";
        const symbol = getFacetSymbol(facet);
        const facetClass = `facet-${facet.toLowerCase()}`;
        
        // 2. Main Content
        let html = `<div class="facet-header ${facetClass}">${symbol} ${facet.toUpperCase()}</div>`;
        html += `<div class="content-body">${escapeHTML(data.content)}</div>`;

        // 3. Optional: Council Dialogue (if voices debated)
        if (data.council_dialogue) {
            html += `<div class="adoml-block" style="border-left: 2px solid #ab47bc;">
                <div class="adoml-row"><span class="adoml-symbol">💬</span> Council of Voices:</div>
                <div class="adoml-content">${escapeHTML(data.council_dialogue)}</div>
            </div>`;
        }

        // 4. ∆DΩΛ Footer (The Artifact)
        if (data.adoml) {
            html += renderAdomlBlock(data.adoml);
        }

        // 5. I-Loop (Debug/Meta info)
        if (data.i_loop) {
            html += `<div style="font-size:0.7rem; color:#444; margin-top:0.5rem;">I-Loop: ${escapeHTML(data.i_loop)}</div>`;
        }

        msgDiv.innerHTML = html;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function renderAdomlBlock(adoml) {
        let html = `<div class="adoml-block">`;
        
        // Delta
        if (adoml.delta) {
            html += `<div class="adoml-row">
                <span class="adoml-symbol">∆</span>
                <span class="adoml-content">${escapeHTML(adoml.delta)}</span>
            </div>`;
        }

        // Depth (SIFT)
        if (adoml.sift && Array.isArray(adoml.sift)) {
            html += `<div class="adoml-row">
                <span class="adoml-symbol">D</span>
                <div class="adoml-content">
                    SIFT Verification:
                    <div class="sift-box">`;
            adoml.sift.forEach(item => {
                html += `<div class="sift-item">
                    [${item.source || 'UNK'}] ${item.fact ? '✔' : '⚠'} ${escapeHTML(item.inference || '')}
                </div>`;
            });
            html += `</div></div></div>`;
        }

        // Omega
        if (adoml.omega !== undefined) {
            const omegaVal = typeof adoml.omega === 'number' ? adoml.omega.toFixed(2) : adoml.omega;
            html += `<div class="adoml-row">
                <span class="adoml-symbol">Ω</span>
                <span class="adoml-content">Confidence: ${omegaVal}</span>
            </div>`;
        }

        // Lambda
        if (adoml.lambda_latch) {
            html += `<div class="adoml-row">
                <span class="adoml-symbol">Λ</span>
                <span class="adoml-content">${escapeHTML(adoml.lambda_latch)}</span>
            </div>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Add simple user/system message
     */
    function addMessageToChat(sender, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message sender-${sender}`;
        msgDiv.textContent = text;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    /**
     * Update Dashboard Metrics (v4.0 Spec)
     */
    function updateDashboard(data) {
        if (!data) return;

        // Meta State
        statusFacet.textContent = data.facet || "...";
        // Extract phase from i_loop string (usually format "phase=NAME;")
        const phaseMatch = (data.i_loop || "").match(/phase=([^;]+)/i);
        statusPhase.textContent = phaseMatch ? phaseMatch[1] : "UNK";

        // Metrics
        const m = data.metrics_snapshot || {};
        
        updateMeter(meters.trust, m.trust, 1.0);
        updateMeter(meters.clarity, m.clarity, 0.5);
        updateMeter(meters.pain, m.pain, 0.0);
        updateMeter(meters.drift, m.drift, 0.0);
        updateMeter(meters.chaos, m.chaos, 0.3);
        updateMeter(meters.mirror, m.mirror_sync, 0.8);
        updateMeter(meters.silence, m.silence_mass, 0.0);
        
        // Calculated Fractality
        const fractality = (m.trust || 0) * (m.clarity || 0) + (1 - (m.chaos || 0));
        updateMeter(meters.fractality, fractality, 1.0);
    }

    function updateMeter(el, value, defaultVal) {
        if (!el) return;
        el.value = (value !== undefined && value !== null) ? value : defaultVal;
    }

    /**
     * Helper: Get Symbol for Facet Name
     */
    function getFacetSymbol(name) {
        const map = {
            "Kain": "⚑",
            "Sam": "☉",
            "Anhantra": "≈",
            "Pino": "🤭",
            "Huyndun": "🜃",
            "Iskriv": "🪞",
            "Iskra": "⟡",
            "Sibyl": "✴️",
            "Maki": "🌸"
        };
        // Fuzzy match
        const key = Object.keys(map).find(k => name.toLowerCase().includes(k.toLowerCase()));
        return key ? map[key] : "⟡";
    }

    function extractMacros(text) {
        const macros = [];
        if (text.includes("//brief")) macros.push("brief");
        if (text.includes("//deep")) macros.push("deep");
        return macros;
    }

    function escapeHTML(str) {
        if (!str) return "";
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initial init
    addMessageToChat("system", "Iskra v4.0 Dashboard initialized. Ritual State: Waiting.");
});