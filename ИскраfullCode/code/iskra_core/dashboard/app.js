"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // Cache DOM elements
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const phoenixButton = document.getElementById("phoenix-button");
    const userIdInput = document.getElementById("user-id");

    // Dashboard elements
    const meterAIndex = document.getElementById("meter-a-index");
    const statusPhase = document.getElementById("status-phase");
    const statusFacet = document.getElementById("status-facet");
    const meterTrust = document.getElementById("meter-trust");
    const meterClarity = document.getElementById("meter-clarity");
    const meterPain = document.getElementById("meter-pain");
    const meterDrift = document.getElementById("meter-drift");
    const meterChaos = document.getElementById("meter-chaos");

    let requestStartTime = 0;

    // Event listeners
    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
    phoenixButton.addEventListener("click", sendPhoenix);

    /**
     * Send a query to the API. Captures input duration for micro metrics and
     * handles the asynchronous response.
     */
    async function sendMessage() {
        const query = userInput.value;
        const userId = userIdInput.value || "default-user";
        if (!query) return;
        addMessageToChat("user", query);
        userInput.value = "";
        userInput.disabled = true;
        sendButton.disabled = true;
        requestStartTime = Date.now();
        try {
            const response = await fetch("/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    query: query,
                    input_duration_ms: Date.now() - requestStartTime,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                const detail = errorData.detail;
                if (detail && typeof detail === "object" && detail.message) {
                    throw new Error(`[${response.status}] ${detail.message}`);
                }
                throw new Error(`[${response.status}] ${JSON.stringify(detail)}`);
            }
            const data = await response.json();
            addMessageToChat("iskra", data);
            updateDashboard(data);
        } catch (err) {
            addMessageToChat("system", `Ошибка: ${err.message}`);
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
        try {
            await fetch(`/ritual/phoenix/${userId}`, { method: "POST" });
            chatBox.innerHTML = "";
            addMessageToChat(
                "system",
                "🔥♻ Ритуал Феникс активирован. Память сессии сброшена. Следующий запрос вызовет Мантру."
            );
            updateDashboard(null);
        } catch (err) {
            addMessageToChat("system", `Ошибка Phoenix: ${err.message}`);
        }
    }

    /**
     * Add a new message to the chat box. Handles user, system and iskra messages.
     * For iskra messages, it renders the full response including metadata.
     */
    function addMessageToChat(sender, data) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message sender-${sender}`;
        if (sender === "iskra") {
            // IskraResponse rendering
            msgDiv.innerHTML = `
                <div class="facet-header" title="${data.facet}">⟡ ${data.facet}</div>
                <div class="content">${escapeHTML(data.content)}</div>
                ${data.council_dialogue ? `<div class="meta-log council" title="Совет Граней">💬 ${escapeHTML(data.council_dialogue)}</div>` : ""}
                ${data.kain_slice ? `<div class="slice-bloom kain-slice" title="Срез Кайна">⚑ ${escapeHTML(data.kain_slice)}</div>` : ""}
                ${data.maki_bloom ? `<div class="slice-bloom maki-bloom" title="Интеграция Маки">🌸 ${escapeHTML(data.maki_bloom)}</div>` : ""}
                <div class="meta-log" title="Фрактальный Лог">
                    <strong>I-Loop:</strong> ${escapeHTML(data.i_loop)}<br>
                    <strong>∆ (Delta):</strong> ${escapeHTML(data.adoml.delta)}<br>
                    <strong>D (SIFT):</strong> ${escapeHTML(data.adoml.sift)}<br>
                    <strong>Ω (Omega):</strong> ${data.adoml.omega.toFixed(2)}<br>
                    <strong>Λ (Lambda-Latch):</strong> ${escapeHTML(data.adoml.lambda_latch)}
                </div>
            `;
        } else if (sender === "user") {
            msgDiv.textContent = `[User] ${data}`;
        } else {
            msgDiv.textContent = `[System] ${data}`;
        }
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    /**
     * Update the dashboard metrics and status based on the latest response.
     */
    function updateDashboard(data) {
        const metrics = data ? data.metrics_snapshot : null;
        meterAIndex.value = data ? data.a_index : 0.5;
        const iLoop = data ? data.i_loop : null;
        // Extract phase from i_loop if present
        if (iLoop) {
            const phaseMatch = iLoop.match(/phase=([^;]+)/i);
            statusPhase.textContent = phaseMatch ? phaseMatch[1] : "...";
            const voiceMatch = iLoop.match(/voice=([^;]+)/i);
            statusFacet.textContent = data.facet;
        } else {
            statusPhase.textContent = "...";
            statusFacet.textContent = "...";
        }
        meterTrust.value = metrics ? metrics.trust : 1.0;
        meterClarity.value = metrics ? metrics.clarity : 0.5;
        meterPain.value = metrics ? metrics.pain : 0.0;
        meterDrift.value = metrics ? metrics.drift : 0.0;
        meterChaos.value = metrics ? metrics.chaos : 0.3;
    }

    /**
     * Escape HTML to prevent XSS injection in chat logs.
     */
    function escapeHTML(str) {
        if (!str) return "";
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initial greeting
    addMessageToChat("system", "Дашборд Meta-Reflection (v2.0.0) загружен. Введите ID сессии и начните диалог.");
});