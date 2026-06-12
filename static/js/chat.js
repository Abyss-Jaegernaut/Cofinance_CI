/**
 * chat.js — Support Client
 * Routes correctes : /api/conversations/ et /api/messages/
 * Polling de fallback toutes les 3s si WebSocket échoue
 */

let currentConversationId = null;
let chatSocket = null;
let chatPollInterval = null;

// Initialisation quand l'onglet chat s'ouvre
async function initChat() {
    await loadChatConversations();
}

// ── Liste des conversations ──────────────────────────────────────────────
async function loadChatConversations() {
    try {
        const res = await api.fetchWithAuth('/conversations/');
        if (!res.ok) { console.error('Erreur conversations', res.status); return; }
        const conversations = await res.json();

        const listDiv = document.getElementById('chat-list');
        if (!listDiv) return;

        const isAgent = currentUser && (currentUser.role === 'ADMINISTRATEUR' || currentUser.role === 'AGENT_TERRAIN');

        if (conversations.length === 0) {
            listDiv.innerHTML = `
                <div style="padding:2rem; text-align:center; color:var(--text-muted);">
                    <i class="fa-solid fa-comments" style="font-size:2rem; margin-bottom:0.8rem; display:block; opacity:0.3;"></i>
                    <p style="font-size:0.85rem;">Aucune discussion</p>
                    ${!isAgent ? '<p style="font-size:0.8rem; margin-top:0.5rem;">Cliquez sur <strong>+</strong> pour en créer une</p>' : ''}
                </div>`;
            return;
        }

        listDiv.innerHTML = conversations.map(conv => {
            const isActive = conv.id === currentConversationId;
            const statutColor = conv.statut === 'OUVERT' ? 'var(--accent-primary)' : conv.statut === 'EN_COURS' ? 'var(--accent-warning)' : 'var(--text-muted)';
            const clientName = isAgent ? (conv.client_details?.first_name || conv.client_details?.username || 'Client') : '';
            const agentName = conv.agent_details ? conv.agent_details.username : '';
            const unreadBadgeHtml = conv.unread_count > 0 
                ? `<span style="background:var(--accent-danger); color:white; font-size:0.65rem; padding:2px 6px; border-radius:10px; margin-left:6px; font-weight:bold;">${conv.unread_count}</span>` 
                : '';
            
            return `
            <div class="chat-conv-item ${isActive ? 'active' : ''}"
                 onclick="openConversation(${conv.id}, '${escHtml(conv.sujet)}', '${escHtml(agentName)}')"
                 style="padding:12px 14px; border-radius:10px; cursor:pointer; margin-bottom:4px; transition:background 0.2s; border:1px solid ${isActive ? 'var(--accent-primary)' : 'transparent'}; background:${isActive ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.03)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <strong style="color:white; font-size:0.9rem; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(conv.sujet)}</strong>
                    <div style="display:flex; align-items:center;">
                        ${unreadBadgeHtml}
                        <span style="font-size:0.65rem; color:${statutColor}; border:1px solid ${statutColor}; padding:1px 6px; border-radius:10px; margin-left:6px; flex-shrink:0;">${conv.statut}</span>
                    </div>
                </div>
                ${isAgent ? `<div style="font-size:0.78rem; color:var(--text-secondary); margin-top:3px;"><i class="fa-solid fa-user" style="font-size:0.65rem;"></i> ${escHtml(clientName)}</div>` : ''}
            </div>`;
        }).join('');
    } catch (e) {
        console.error('Erreur chargement chat', e);
    }
}

// ── Créer une nouvelle conversation ────────────────────────────────────
async function startNewChat() {
    const inputField = document.getElementById('new-chat-input');
    if (!inputField) return;
    const sujet = inputField.value;
    if (!sujet || !sujet.trim()) return;
    try {
        const res = await api.fetchWithAuth('/conversations/', {
            method: 'POST',
            body: JSON.stringify({ sujet: sujet.trim() })
        });
        if (res.ok) {
            const conv = await res.json();
            inputField.value = '';
            document.getElementById('new-chat-form').style.display = 'none';
            await loadChatConversations();
            openConversation(conv.id, conv.sujet, '');
        } else {
            const err = await res.json();
            showToast('Erreur : ' + JSON.stringify(err), 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Impossible de créer la discussion', 'error');
    }
}

// ── Ouvrir une conversation ─────────────────────────────────────────────
async function openConversation(id, sujet, participantName) {
    currentConversationId = id;

    // Refresh liste pour mettre en surbrillance la conv active
    await loadChatConversations();

    // Mark conversation read and update badge
    await api.markConversationRead(id);
    if (typeof updateUnreadBadge === 'function') updateUnreadBadge();

    // Header
    const header = document.getElementById('chat-header');
    if (header) {
        const isAgent = currentUser && (currentUser.role === 'ADMINISTRATEUR' || currentUser.role === 'AGENT_TERRAIN');
        const rolePrefix = isAgent ? 'Client' : 'Agent';
        const presenceText = participantName ? `${rolePrefix} : ${participantName} (En ligne)` : (isAgent ? 'Client inconnu' : 'Recherche d\'un agent...');
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:10px; height:10px; border-radius:50%; background:var(--accent-primary);"></div>
                <h3 style="margin:0; font-size:1rem;">${escHtml(sujet)}</h3>
            </div>
            <span style="font-size:0.78rem; color:var(--accent-primary);">${presenceText}</span>`;
    }

    // Activer la saisie
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    if (input) input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;

    // Fermer l'ancien socket et polling
    stopChatPolling();
    if (chatSocket) { chatSocket.close(); chatSocket = null; }

    // Charger l'historique des messages
    await fetchMessages(id);

    // Tenter WebSocket, sinon polling
    connectWebSocket(id);
}

// ── Récupérer les messages ──────────────────────────────────────────────
async function fetchMessages(conversationId) {
    try {
        const res = await api.fetchWithAuth(`/messages/?conversation=${conversationId}`);
        if (!res.ok) return;
        let data = await res.json();
        let messages = data.results ? data.results : data;
        
        // Filtrage côté client si l'API renvoie tous les messages
        if (Array.isArray(messages)) {
            messages = messages.filter(m => m.conversation === conversationId);
        }
        renderMessages(messages);
    } catch (e) {
        console.error('Erreur chargement messages', e);
    }
}

function renderMessages(messages) {
    const msgDiv = document.getElementById('chat-messages');
    if (!msgDiv) return;

    if (!messages || messages.length === 0) {
        msgDiv.innerHTML = `
            <div class="msg-placeholder" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-muted); gap:12px;">
                <i class="fa-solid fa-comment-slash" style="font-size:2.5rem; opacity:0.2;"></i>
                <p style="font-size:0.85rem;">Aucun message pour l'instant.<br>Commencez la discussion !</p>
            </div>`;
        return;
    }

    let currentDayStr = null;
    let htmlContent = '';

    messages.forEach(m => {
        const msgDate = new Date(m.created_at);
        const dayStr = msgDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        if (dayStr !== currentDayStr) {
            htmlContent += `
            <div style="display:flex; justify-content:center; margin:15px 0;">
                <span style="background:rgba(255,255,255,0.05); color:var(--text-muted); padding:4px 12px; border-radius:12px; font-size:0.7rem; text-transform:capitalize;">${dayStr}</span>
            </div>`;
            currentDayStr = dayStr;
        }
        
        htmlContent += createMessageHtml(m);
    });

    msgDiv.innerHTML = htmlContent;
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// ── WebSocket ───────────────────────────────────────────────────────────
function connectWebSocket(conversationId) {
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const token = api.getAccessToken();
    const wsUrl = `${wsScheme}://${window.location.host}/ws/chat/${conversationId}/?token=${token}`;

    try {
        chatSocket = new WebSocket(wsUrl);

        chatSocket.onopen = () => {
            console.log('WebSocket connecté');
        };

        chatSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            const msgDiv = document.getElementById('chat-messages');
            if (!msgDiv) return;

            // Vérifier qu'on est toujours sur la même conversation
            if (currentConversationId !== conversationId) return;

            const fakeMsg = {
                contenu: data.message,
                conversation: conversationId,
                expediteur_details: { username: data.username || '?' },
                created_at: new Date().toISOString()
            };

            // Éviter les doublons : ne pas ajouter si le dernier message a le même contenu récent
            const lastEl = msgDiv.lastElementChild;
            const msgHtml = createMessageHtml(fakeMsg);

            // Supprimer le placeholder si présent
            const placeholder = msgDiv.querySelector('.msg-placeholder');
            if (placeholder) placeholder.remove();

            msgDiv.insertAdjacentHTML('beforeend', msgHtml);
            msgDiv.scrollTop = msgDiv.scrollHeight;
        };

        chatSocket.onerror = () => {
            console.warn('WebSocket erreur, bascule sur polling');
            startChatPolling(conversationId);
        };

        chatSocket.onclose = (e) => {
            if (e.code !== 1000) {
                console.warn('WebSocket fermé, bascule sur polling');
                startChatPolling(conversationId);
            }
        };

    } catch (err) {
        console.warn('WebSocket non disponible, bascule sur polling');
        startChatPolling(conversationId);
    }
}

// ── Polling fallback ────────────────────────────────────────────────────
function startChatPolling(conversationId) {
    stopChatPolling();
    chatPollInterval = setInterval(() => {
        if (currentConversationId === conversationId) {
            fetchMessages(conversationId);
        }
    }, 3000);
}

function stopChatPolling() {
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message || !currentConversationId) return;

    input.value = '';

    // Envoi via WebSocket si connecté
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({ message }));
    } else {
        // Sinon HTTP POST
        try {
            await api.fetchWithAuth('/messages/', {
                method: 'POST',
                body: JSON.stringify({ conversation: currentConversationId, contenu: message })
            });
            // Recharger les messages après l'envoi HTTP
            await fetchMessages(currentConversationId);
        } catch (e) {
            showToast('Erreur envoi message', 'error');
        }
    }
}

// ── Rendu d'un message ─────────────────────────────────────────────────
function createMessageHtml(m) {
    const isMe = currentUser && m.expediteur_details?.username === currentUser.username;
    const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const name = m.expediteur_details?.username || '?';
    const initials = name.substring(0, 1).toUpperCase();

    return `
    <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:12px; gap:4px;">
        ${!isMe ? `<span style="font-size:0.72rem; color:var(--text-muted); margin-left:36px;">${escHtml(name)}</span>` : ''}
        <div style="display:flex; align-items:flex-end; gap:8px; flex-direction:${isMe ? 'row-reverse' : 'row'};">
            <div style="width:28px; height:28px; border-radius:50%; background:${isMe ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; color:${isMe ? '#000' : 'white'}; flex-shrink:0;">${initials}</div>
            <div style="background:${isMe ? 'linear-gradient(135deg, var(--accent-primary), #00b894)' : 'rgba(255,255,255,0.07)'}; color:${isMe ? '#000' : 'var(--text-primary)'}; padding:10px 14px; border-radius:${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}; max-width:70%; word-break:break-word; font-size:0.9rem; line-height:1.5; border:1px solid ${isMe ? 'transparent' : 'var(--border-color)'};">
                ${escHtml(m.contenu)}
            </div>
        </div>
        <span style="font-size:0.68rem; color:var(--text-muted); margin-${isMe ? 'right' : 'left'}:36px;">${time}</span>
    </div>`;
}

// ── Utilitaire anti-XSS ────────────────────────────────────────────────
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Event listener Entrée ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
});
