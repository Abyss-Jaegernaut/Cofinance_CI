// ---- GLOBALS & INITIALIZATION ----
let currentUser = null;
let pollingInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    if (!api.hasTokens()) {
        showLoginForm();
        return;
    }
    
    try {
        currentUser = await api.getProfile();
        initApp();
    } catch (e) {
        console.error('Auth check failed:', e);
        api.clearTokens();
        showLoginForm();
    }
}

// ---- VIEW ROUTING ----
function showLoginForm() {
    // This is called when we need to show the auth container completely
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('app-layout');
    
    document.getElementById('auth-container').classList.remove('hidden');
    
    // Ensure we are on the login slide
    const wrapper = document.getElementById('auth-wrapper');
    if (wrapper) wrapper.classList.remove('right-panel-active');
}

function showRegisterForm() {
    // This is for the mobile switch or if called directly
    const wrapper = document.getElementById('auth-wrapper');
    if (wrapper) wrapper.classList.add('right-panel-active');
}

// Slide Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const signUpButton = document.getElementById('signUpSlide');
    const signInButton = document.getElementById('signInSlide');
    const container = document.getElementById('auth-wrapper');
    
    if (signUpButton && signInButton && container) {
        signUpButton.addEventListener('click', () => {
            container.classList.add("right-panel-active");
        });
        
        signInButton.addEventListener('click', () => {
            container.classList.remove("right-panel-active");
        });
    }

    const mobileSignIn = document.getElementById('mobile-signIn');
    const mobileSignUp = document.getElementById('mobile-signUp');
    if(mobileSignIn) mobileSignIn.addEventListener('click', (e) => { e.preventDefault(); container.classList.remove("right-panel-active"); });
    if(mobileSignUp) mobileSignUp.addEventListener('click', (e) => { e.preventDefault(); container.classList.add("right-panel-active"); });
});

function togglePassword(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    }
}

function initApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('app-layout');
    
    // Set user info
    document.getElementById('user-name').textContent = `${currentUser.first_name || ''} ${currentUser.last_name || currentUser.username}`.trim();
    document.getElementById('user-role').textContent = currentUser.role.replace('_', ' ');
    document.getElementById('user-avatar-initials').textContent = (currentUser.first_name?.[0] || currentUser.username?.[0] || 'U').toUpperCase();
    
    // Set workspace badge
    const badge = document.getElementById('workspace-badge');
    const isAgent = currentUser.role === 'AGENT_TERRAIN' || currentUser.role === 'ADMINISTRATEUR';
    if (isAgent) {
        badge.textContent = 'ESPACE ADMINISTRATEUR';
        badge.style.background = 'var(--accent-primary)';
        badge.style.color = '#fff';
        document.getElementById('label-credits').textContent = 'Dossiers à traiter';
        document.getElementById('credits-page-title').textContent = 'Gestion des demandes';
        document.getElementById('credits-page-subtitle').textContent = 'Approuver ou rejeter les demandes clients';
        document.getElementById('btn-new-credit').classList.add('hidden');
        document.getElementById('dashboard-subtitle').textContent = 'Vue globale des performances';
    } else {
        document.getElementById('label-credits').textContent = 'Mes Crédits';
        document.getElementById('credits-page-title').textContent = 'Mes Demandes';
        document.getElementById('credits-page-subtitle').textContent = 'Gérez vos financements actuels';
        document.getElementById('btn-new-credit').classList.remove('hidden');
        document.getElementById('dashboard-subtitle').textContent = 'Bienvenue sur votre espace financier personnel.';
    }

    // Setup UI according to role
    if (currentUser.role === 'ADMINISTRATEUR') {
        document.getElementById('nav-admin').style.display = 'flex';
        // Go directly to admin tab
        switchTab('admin');
    } else {
        document.getElementById('nav-admin').style.display = 'none';
        // Default tab + start polling
        fetchNotifications();
        switchTab('dashboard');
        startPolling();
    }

    // Unread messages check
    updateUnreadBadge();
    setInterval(updateUnreadBadge, 15000);
}

async function updateUnreadBadge() {
    try {
        const count = await api.getUnreadMessagesCount();
        const badge = document.getElementById('unread-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (e) {
        console.error("Erreur check unread:", e);
    }
}

// ---- NOTIFICATIONS ----
async function fetchNotifications() {
    try {
        const notifs = await api.getNotifications();
        const unread = notifs.filter(n => !n.lu).length;
        const countSpan = document.getElementById('notif-count');
        if (unread > 0) {
            countSpan.style.display = 'block';
            countSpan.textContent = unread;
        } else {
            countSpan.style.display = 'none';
        }
    } catch (e) {
        // Silently fail
    }
}

async function openNotifsPanel() {
    openModal('modal-notifs');
    const container = document.getElementById('notifs-list');
    container.innerHTML = '<p>Chargement...</p>';
    try {
        const notifs = await api.getNotifications();
        if (notifs.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:gray;">Aucune notification</p>';
            return;
        }
        container.innerHTML = notifs.map(n => `
            <div style="padding:10px; border-radius:8px; background:${n.lu ? 'rgba(255,255,255,0.05)' : 'rgba(41,121,255,0.1)'}; border:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong>${n.type_notif}</strong>
                    <span style="font-size:0.8rem; color:gray;">${formatDate(n.created_at)}</span>
                </div>
                <p style="font-size:0.9rem; margin:0;">${n.message}</p>
                ${!n.lu ? `<button class="btn-secondary" style="margin-top:10px; padding:4px 8px; font-size:0.8rem;" onclick="markNotifRead(${n.id})">Marquer comme lu</button>` : ''}
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p>Erreur</p>';
    }
}

async function markNotifRead(id) {
    await api.markNotificationRead(id);
    fetchNotifications();
    openNotifsPanel(); // Refresh
}

// ---- POLLING (auto-refresh every 15s) ----
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        const activeTab = document.querySelector('.nav-item.active')?.id?.replace('nav-', '');
        if (activeTab === 'dashboard') loadDashboard();
        if (activeTab === 'credits') loadCredits();
        loadNotifications();
    }, 15000);
}

function switchTab(tabId) {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('mobile-active');

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabId}`).classList.add('active');

    // Update sections
    document.querySelectorAll('main > section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active-view');
    });
    const section = document.getElementById(`content-${tabId}`);
    section.classList.remove('hidden');
    section.classList.add('active-view');

    // Load data based on tab
    if (tabId === 'dashboard') loadDashboard();
    if (tabId === 'credits') loadCredits();
    if (tabId === 'profile') loadProfileView();
    if (tabId === 'chat' && typeof loadChatConversations === 'function') loadChatConversations();
    if (tabId === 'remboursements') loadRemboursements();
    if (tabId === 'assurances') loadAssurances();
    if (tabId === 'admin') loadAdmin();
}

function switchProfileTab(tabName) {
    document.getElementById('tab-info').classList.remove('btn-primary');
    document.getElementById('tab-info').classList.add('btn-secondary');
    document.getElementById('tab-stats').classList.remove('btn-primary');
    document.getElementById('tab-stats').classList.add('btn-secondary');
    
    document.getElementById('profile-tab-info').classList.add('hidden');
    document.getElementById('profile-tab-stats').classList.add('hidden');
    
    document.getElementById(`tab-${tabName}`).classList.remove('btn-secondary');
    document.getElementById(`tab-${tabName}`).classList.add('btn-primary');
    document.getElementById(`profile-tab-${tabName}`).classList.remove('hidden');
}

function toggleNotifications(event) {
    const dropdown = document.getElementById('notif-dropdown');
    if (dropdown.classList.contains('hidden')) {
        let btn = null;
        if (event && event.currentTarget) {
            btn = event.currentTarget;
        } else {
            btn = document.querySelector('button[onclick*="toggleNotifications"]');
        }
        
        if (window.innerWidth <= 768) {
            dropdown.style.bottom = '80px';
            dropdown.style.left = '50%';
            dropdown.style.transform = 'translateX(-50%)';
            dropdown.style.width = '90%';
            dropdown.style.zIndex = '9999';
        } else {
            if (btn) {
                const rect = btn.getBoundingClientRect();
                dropdown.style.bottom = Math.max(20, window.innerHeight - rect.bottom) + 'px';
                dropdown.style.left = (rect.right + 15) + 'px';
            } else {
                dropdown.style.bottom = '20px';
                dropdown.style.left = '280px';
            }
            dropdown.style.transform = 'none';
            dropdown.style.width = '400px';
        }
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

async function loadNotifications() {
    try {
        const notifs = await api.getNotifications();
        const unreadCount = notifs.filter(n => !n.est_lue).length;
        
        const badge = document.getElementById('notif-badge');
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount;
        } else {
            badge.style.display = 'none';
        }
        
        const listDiv = document.getElementById('notif-list');
        if (notifs.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin:1rem 0;">Aucune alerte</p>';
            return;
        }
        
        listDiv.innerHTML = notifs.map(n => `
            <div style="padding:12px 15px; border-radius:12px; background:${n.est_lue ? 'var(--bg-card)' : 'rgba(255,145,0,0.15)'}; border-left:4px solid ${n.est_lue ? 'transparent' : 'var(--accent-warning)'}; cursor:pointer; transition:all 0.2s ease;" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='${n.est_lue ? 'var(--bg-card)' : 'rgba(255,145,0,0.15)'}'" onclick="markNotifRead(${n.id})">
                <p style="margin:0 0 8px 0; font-size:0.9rem; color:${n.est_lue ? 'var(--text-secondary)' : 'var(--text-primary)'}; line-height:1.4;">${n.message}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-regular fa-clock"></i> ${formatDate(n.created_at)}</small>
                    ${!n.est_lue ? '<div style="width:8px; height:8px; background:var(--accent-warning); border-radius:50%; box-shadow:0 0 8px var(--accent-warning);"></div>' : ''}
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Erreur notifs:', e);
    }
}

async function markNotifRead(id) {
    try {
        await api.markNotificationRead(id);
        loadNotifications();
    } catch (e) {
        console.error(e);
    }
}

function logout() {
    api.clearTokens();
    currentUser = null;
    window.location.reload();
}

// ---- AUTH FORMS ----
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = document.getElementById('login-text');
    const btnSpinner = document.getElementById('login-spinner');
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
        await api.login(
            document.getElementById('username').value,
            document.getElementById('password').value
        );
        showToast('Connexion réussie', 'success');
        checkAuth();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnText = document.getElementById('register-text');
    const btnSpinner = document.getElementById('register-spinner');
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
        await api.register({
            username: document.getElementById('reg-username').value,
            first_name: document.getElementById('reg-firstname').value,
            last_name: document.getElementById('reg-lastname').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            role: 'CLIENT'
        });
        showToast('Compte créé avec succès ! Connectez-vous.', 'success');
        showLoginForm();
        document.getElementById('username').value = document.getElementById('reg-username').value;
        document.getElementById('password').value = '';
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
});

// ---- DATA LOADING ----
let dashboardChartInstance = null;
let currentDashboardDays = 30;

window.setDashboardFilter = function(days) {
    currentDashboardDays = days;
    document.querySelectorAll('.filter-btn').forEach(b => {
        if(parseInt(b.dataset.days) === days) b.classList.add('active');
        else b.classList.remove('active');
    });
    loadDashboard();
}

async function loadDashboard() {
    try {
        const stats = await api.getDashboardStats(currentDashboardDays);
        const credits = await api.getCredits();
        const isAgent = currentUser.role === 'AGENT_TERRAIN' || currentUser.role === 'ADMINISTRATEUR';
        
        let statsHtml = '';
        if (isAgent) {
            // Stats Admin : vue globale
            statsHtml = `
                <div class="stat-card">
                    <div class="stat-icon warning"><i class="fa-solid fa-inbox"></i></div>
                    <div class="stat-info"><h3>Total dossiers</h3><div class="value">${stats.total_demandes}</div><small style="color:var(--text-muted);">dont ${stats.en_attente} en attente</small></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(41,121,255,0.15);"><i class="fa-solid fa-magnifying-glass" style="color:#2979FF;"></i></div>
                    <div class="stat-info"><h3>En analyse</h3><div class="value">${stats.en_analyse}</div><small style="color:var(--text-muted);">dossiers en cours</small></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary"><i class="fa-solid fa-check-double"></i></div>
                    <div class="stat-info"><h3>Approuvés</h3><div class="value">${stats.approuvees}</div><small style="color:var(--text-muted);">${stats.rejetees} rejeté(s)</small></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon secondary"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <div class="stat-info"><h3>Volume approuvé</h3><div class="value" style="font-size:1.1rem;">${formatMoney(stats.montant_total)}</div><small style="color:var(--text-muted);">En attente: ${formatMoney(stats.montant_en_attente)}</small></div>
                </div>
            `;
        } else {
            // Stats Client : ses propres infos
            const enCours = credits.filter(c => c.statut === 'EN_ANALYSE' || c.statut === 'SOUMISE').length;
            statsHtml = `
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(255,255,255,0.07);"><i class="fa-solid fa-folder-open" style="color:#90A4AE;"></i></div>
                    <div class="stat-info"><h3>Total demandes</h3><div class="value">${stats.total_demandes}</div><small style="color:var(--text-muted);">toutes périodes</small></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="stat-info"><h3>Approuvées</h3><div class="value">${stats.approuvees}</div><small style="color:var(--accent-primary);">+${formatMoney(stats.montant_total)}</small></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(255,23,68,0.12);"><i class="fa-solid fa-circle-xmark" style="color:#FF1744;"></i></div>
                    <div class="stat-info"><h3>Rejetées</h3><div class="value">${stats.rejetees}</div><small style="color:var(--text-muted);">dossiers refusés</small></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background:rgba(255,145,0,0.12);"><i class="fa-solid fa-hourglass-half" style="color:#FF9100;"></i></div>
                    <div class="stat-info"><h3>En cours</h3><div class="value">${enCours}</div><small style="color:var(--text-muted);">soumis/en analyse</small></div>
                </div>
            `;
        }
        document.getElementById('dashboard-stats').innerHTML = statsHtml;

        // Graphique différent selon le rôle
        const ctx = document.getElementById('dashboard-chart').getContext('2d');
        const chartTitle = document.getElementById('chart-title');

        const labels = stats.trend ? stats.trend.map(t => {
            const d = new Date(t.date);
            return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        }) : [];
        const dataSoumise = stats.trend ? stats.trend.map(t => t.SOUMISE) : [];
        const dataAnalyse = stats.trend ? stats.trend.map(t => t.EN_ANALYSE) : [];
        const dataApprouvee = stats.trend ? stats.trend.map(t => t.APPROUVEE) : [];
        const dataRejetee = stats.trend ? stats.trend.map(t => t.REJETEE) : [];

        if (isAgent) {
            if (chartTitle) chartTitle.textContent = 'Évolution des dossiers (' + currentDashboardDays + ' jours)';
            if (dashboardChartInstance) dashboardChartInstance.destroy();
            dashboardChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Approuvées', data: dataApprouvee, borderColor: '#00E676', backgroundColor: 'rgba(0, 230, 118, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 },
                        { label: 'Rejetées', data: dataRejetee, borderColor: '#FF1744', backgroundColor: 'rgba(255, 23, 68, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 },
                        { label: 'En Analyse', data: dataAnalyse, borderColor: '#2979FF', backgroundColor: 'rgba(41, 121, 255, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 },
                        { label: 'Soumises', data: dataSoumise, borderColor: '#FF9100', backgroundColor: 'rgba(255, 145, 0, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: '#fff', usePointStyle: true, boxWidth: 10 } },
                        tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', padding: 12, cornerRadius: 8, mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: 'rgba(255,255,255,0.7)', maxTicksLimit: 10 }, grid: { display: false } }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });
        } else {
            if (chartTitle) chartTitle.textContent = 'Évolution de mes demandes (' + currentDashboardDays + ' jours)';
            if (dashboardChartInstance) dashboardChartInstance.destroy();
            dashboardChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'En cours', data: dataSoumise.map((v, i) => v + dataAnalyse[i]), borderColor: '#2979FF', backgroundColor: 'rgba(41, 121, 255, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 },
                        { label: 'Approuvées', data: dataApprouvee, borderColor: '#00E676', backgroundColor: 'rgba(0, 230, 118, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 },
                        { label: 'Rejetées', data: dataRejetee, borderColor: '#FF1744', backgroundColor: 'rgba(255, 23, 68, 0.1)', borderWidth: 2, pointRadius: 3, fill: true, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: '#fff', usePointStyle: true, boxWidth: 10 } },
                        tooltip: { backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', padding: 12, cornerRadius: 8, mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: 'rgba(255,255,255,0.7)', maxTicksLimit: 10 }, grid: { display: false } }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });
        }

        // Panel urgent (admin seulement)
        const urgentPanel = document.getElementById('admin-urgent-panel');
        if (urgentPanel) {
            if (isAgent) {
                urgentPanel.style.display = 'block';
                const urgent = credits.filter(c => c.statut === 'SOUMISE' || c.statut === 'EN_ANALYSE').slice(0, 5);
                const urgentBody = document.getElementById('admin-urgent-body');
                if (urgent.length === 0) {
                    urgentBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--accent-primary);"><i class="fa-solid fa-check-circle"></i> Aucun dossier en attente</td></tr>`;
                } else {
                    urgentBody.innerHTML = urgent.map(c => `
                        <tr>
                            <td style="font-weight:600;color:var(--text-secondary);">#${c.id}</td>
                            <td>${c.client_details?.first_name || ''} ${c.client_details?.last_name || c.client_details?.username || 'Client'}</td>
                            <td style="font-weight:700;color:var(--accent-primary);">${formatMoney(c.montant_demande)}</td>
                            <td><span class="status-badge status-${c.statut.toLowerCase()}">${c.statut.replace('_', ' ')}</span></td>
                            <td style="color:var(--text-secondary);">${formatDate(c.created_at)}</td>
                            <td>
                                ${c.statut === 'SOUMISE' ? `<button class="btn-action-icon approve" title="Analyser" onclick="openActionModal(${c.id},'analyze')"><i class="fa-solid fa-magnifying-glass"></i></button>` : ''}
                                ${c.statut === 'EN_ANALYSE' ? `<button class="btn-action-icon approve" title="Approuver" onclick="openActionModal(${c.id},'approve')"><i class="fa-solid fa-check"></i></button>` : ''}
                                <button class="btn-action-icon reject" title="Rejeter" onclick="openActionModal(${c.id},'reject')"><i class="fa-solid fa-xmark"></i></button>
                                <button class="btn-action-icon" title="Détails" onclick="openDetailModal(${c.id})" style="color:var(--text-secondary);"><i class="fa-solid fa-eye"></i></button>
                            </td>
                        </tr>
                    `).join('');
                }
            } else {
                urgentPanel.style.display = 'none';
            }
        }

        // Recent Activity
        const recent = credits.slice(0, 5);
        const recentHead = document.getElementById('recent-head');
        if (recentHead && isAgent) {
            recentHead.innerHTML = `<th>Réf.</th><th>Client</th><th>Montant</th><th>Statut</th><th>Date</th>`;
        }
        if (recent.length === 0) {
            document.getElementById('recent-activity-body').innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem;">Aucune activité récente.</td></tr>`;
        } else {
            document.getElementById('recent-activity-body').innerHTML = recent.map(c => `
                <tr>
                    <td style="font-weight:600;color:var(--text-secondary);">#${c.id}</td>
                    ${isAgent ? `<td>${c.client_details?.first_name || ''} ${c.client_details?.last_name || c.client_details?.username || 'Client'}</td>` : ''}
                    <td style="font-weight:700;">${formatMoney(c.montant_demande)}</td>
                    <td><span class="status-badge status-${c.statut.toLowerCase()}">${c.statut.replace('_',' ')}</span></td>
                    <td style="color:var(--text-secondary);">${formatDate(c.created_at)}</td>
                </tr>
            `).join('');
        }

    } catch (e) {
        console.error('Dashboard Error:', e);
    }
}

let globalCredits = [];

async function loadCredits() {
    try {
        const credits = await api.getCredits();
        globalCredits = credits;
        const tbody = document.getElementById('credits-table-body');
        const isAgent = currentUser.role === 'AGENT_TERRAIN' || currentUser.role === 'ADMINISTRATEUR';

        if (credits.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${isAgent ? '6' : '5'}" style="text-align:center;">Aucune donnée disponible.</td></tr>`;
            return;
        }

        tbody.innerHTML = credits.map(c => {
            // Agent only : oeil + boutons d'action
            let actionsHtml = '';
            if (isAgent) {
                actionsHtml = `<button class="btn-action-icon" style="color:var(--text-secondary); margin-right:5px;" title="Voir les détails" onclick="openDetailModal(${c.id})"><i class="fa-solid fa-eye"></i></button>`;
                if (c.statut === 'SOUMISE') {
                    actionsHtml += `
                        <button class="btn-action-icon approve" title="Passer en analyse" onclick="openActionModal(${c.id}, 'analyze')"><i class="fa-solid fa-magnifying-glass"></i></button>
                        <button class="btn-action-icon reject" title="Rejeter" onclick="openActionModal(${c.id}, 'reject')"><i class="fa-solid fa-xmark"></i></button>
                    `;
                } else if (c.statut === 'EN_ANALYSE') {
                    actionsHtml += `
                        <button class="btn-action-icon approve" title="Approuver" onclick="openActionModal(${c.id}, 'approve')"><i class="fa-solid fa-check"></i></button>
                        <button class="btn-action-icon reject" title="Rejeter" onclick="openActionModal(${c.id}, 'reject')"><i class="fa-solid fa-xmark"></i></button>
                    `;
                }
            }

            return `
            <tr>
                <td style="font-weight:600;color:var(--text-secondary);">#${c.id}</td>
                ${isAgent ? `<td>${c.client_details?.first_name || ''} ${c.client_details?.last_name || c.client_details?.username || 'Client'}</td>` : ''}
                <td style="font-weight:700; color: var(--accent-primary);">${formatMoney(c.montant_demande)}</td>
                <td>${c.duree_mois} mois</td>
                ${isAgent ? `<td><div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);color:${c.score_eligibilite >= 70 ? 'var(--accent-primary)' : c.score_eligibilite >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)'};font-weight:bold;font-size:0.8rem;">${c.score_eligibilite || 0}</div></td>` : ''}
                ${!isAgent ? `<td style="color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.motif || '-'}</td>` : ''}
                <td><span class="status-badge status-${c.statut.toLowerCase()}">${c.statut.replace('_', ' ')}</span></td>
                <td style="color:var(--text-secondary);">${formatDate(c.created_at)}</td>
                ${isAgent ? `<td>${actionsHtml}</td>` : ''}
            </tr>
            `;
        }).join('');
        
        // Setup headers
        const thead = document.getElementById('credits-table-head');
        if (isAgent) {
            thead.innerHTML = `<th>Réf.</th><th>Client</th><th>Montant</th><th>Durée</th><th>Score</th><th>Statut</th><th>Date</th><th>Actions</th>`;
        } else {
            thead.innerHTML = `<th>Réf.</th><th>Montant</th><th>Durée</th><th>Motif</th><th>Statut</th><th>Date</th>`;
        }

    } catch (e) {
        console.error('Credits error:', e);
    }
}

// ---- PROFILE ----
async function loadProfileView() {
    document.getElementById('profile-name').textContent = currentUser.first_name || currentUser.username;
    
    let roleText = 'Client';
    let badgeColor = 'var(--accent-secondary)';
    if (currentUser.role === 'ADMINISTRATEUR') { roleText = 'Administrateur'; badgeColor = 'var(--accent-primary)'; }
    if (currentUser.role === 'AGENT_TERRAIN') { roleText = 'Agent de terrain'; badgeColor = 'var(--accent-warning)'; }
    
    document.getElementById('profile-role-desc').textContent = `Connecté en tant que ${roleText.toLowerCase()}`;
    const badge = document.getElementById('profile-badge');
    badge.textContent = roleText;
    badge.style.color = badgeColor;
    
    document.getElementById('prof-first').value = currentUser.first_name || '';
    document.getElementById('prof-last').value = currentUser.last_name || '';
    document.getElementById('prof-email').value = currentUser.email || '';
    document.getElementById('prof-phone').value = currentUser.telephone || '';
    document.getElementById('prof-address').value = currentUser.adresse || '';
    
    // Setup stats for profile
    try {
        const credits = await api.getCredits();
        // Since we only get all credits for agents/admin, and own credits for clients,
        // we can filter them to just the current user's credits if needed, or show global stats for admin.
        let myCredits = credits;
        if (currentUser.role !== 'CLIENT') {
            myCredits = credits.filter(c => c.client === currentUser.id);
        }
        const pending = myCredits.filter(c => c.statut === 'SOUMISE' || c.statut === 'EN_ANALYSE').length;
        const approved = myCredits.filter(c => c.statut === 'APPROUVEE' || c.statut === 'DECAISSEE').length;
        
        document.getElementById('prof-nb-credits').textContent = myCredits.length;
        document.getElementById('prof-nb-approved').textContent = approved;
        document.getElementById('prof-nb-pending').textContent = pending;
    } catch(e) {
        console.error(e);
    }
}

document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enregistrement...';
    btn.disabled = true;
    
    try {
        const data = {
            first_name: document.getElementById('prof-first').value,
            last_name: document.getElementById('prof-last').value,
            email: document.getElementById('prof-email').value,
            telephone: document.getElementById('prof-phone').value,
            adresse: document.getElementById('prof-address').value
        };
        const updatedUser = await api.updateProfile(currentUser.id, data);
        currentUser = updatedUser; // Update local state
        localStorage.setItem('user', JSON.stringify(currentUser));
        loadUserInfo(); // Update sidebar
        loadProfileView(); // Refresh profile header
        showToast('Profil mis à jour avec succès.', 'success');
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});


// ---- MODALS & ACTIONS ----
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

document.getElementById('form-new-credit').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const formData = new FormData();
        formData.append('montant_demande', document.getElementById('new-montant').value);
        formData.append('duree_mois', document.getElementById('new-duree').value);
        formData.append('motif', document.getElementById('new-motif').value);
        
        const fileInput = document.getElementById('new-justificatif');
        if (fileInput && fileInput.files[0]) {
            formData.append('justificatifs', fileInput.files[0]);
        }
        
        await api.createCredit(formData);
        showToast('Demande envoyée avec succès !', 'success');
        closeModal('modal-new-credit');
        document.getElementById('form-new-credit').reset();
        loadCredits();
        loadDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

function openActionModal(id, type) {
    document.getElementById('action-credit-id').value = id;
    document.getElementById('action-type').value = type;
    document.getElementById('action-note').value = '';
    
    if (type === 'approve') {
        document.getElementById('action-modal-title').textContent = `Approuver le crédit #${id}`;
        document.getElementById('action-modal-text').textContent = `Vous êtes sur le point d'approuver cette demande de financement. Le client sera notifié.`;
        document.getElementById('btn-confirm-action').style.background = 'var(--accent-primary)';
    } else if (type === 'analyze') {
        document.getElementById('action-modal-title').textContent = `Analyser le crédit #${id}`;
        document.getElementById('action-modal-text').textContent = `Vous êtes sur le point de passer cette demande en analyse.`;
        document.getElementById('btn-confirm-action').style.background = 'var(--accent-secondary)';
    } else {
        document.getElementById('action-modal-title').textContent = `Rejeter le crédit #${id}`;
        document.getElementById('action-modal-text').textContent = `Vous êtes sur le point de rejeter cette demande. Veuillez ajouter une note si possible.`;
        document.getElementById('btn-confirm-action').style.background = 'var(--accent-danger)';
    }
    openModal('modal-action-credit');
}

async function confirmAction() {
    const id = document.getElementById('action-credit-id').value;
    const type = document.getElementById('action-type').value;
    const btn = document.getElementById('btn-confirm-action');
    
    const note = document.getElementById('action-note').value;
    
    // Disable button to prevent double-click
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

    try {
        if (type === 'approve') {
            await api.approveCredit(id, note);
            showToast('Crédit approuvé avec succès !', 'success');
        } else if (type === 'analyze') {
            await api.analyzeCredit(id, note);
            showToast('Crédit passé en analyse.', 'success');
        } else if (type === 'decaisse') {
            await api.decaisseCredit(id, note);
            showToast('Fonds décaissés avec succès !', 'success');
        } else {
            await api.rejectCredit(id, note);
            showToast('Crédit rejeté.', 'success');
        }
        closeModal('modal-action-credit');
        loadCredits();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function openDetailModal(id) {
    const c = globalCredits.find(cred => cred.id === id);
    if (!c) return;

    const isAgent = currentUser.role === 'AGENT_TERRAIN' || currentUser.role === 'ADMINISTRATEUR';
    const statutClass = `status-${c.statut.toLowerCase()}`;
    const titre = isAgent ? `Fiche d'analyse — Dossier #${c.id}` : `Ma demande de crédit #${c.id}`;
    document.getElementById('detail-modal-title').textContent = titre;

    // ---- Score d'éligibilité (calculé simplement) ----
    const score = c.score_eligibilite || Math.min(100, Math.round((c.duree_mois / 24) * 50 + (parseFloat(c.montant_demande) > 500000 ? 30 : 50)));
    const scoreColor = score >= 70 ? 'var(--accent-primary)' : score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
    const scoreLabel = score >= 70 ? 'Éligible' : score >= 50 ? 'À vérifier' : 'Risque élevé';

    let html = `
        <!-- Bannière statut + score -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding:1rem 1.2rem; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="status-badge ${statutClass}">${c.statut.replace('_',' ')}</span>
                <span style="color:var(--text-muted); font-size:0.85rem;">Soumis le ${formatDate(c.created_at)}</span>
            </div>
            ${isAgent ? `<div style="text-align:center;">
                <div style="font-size:1.8rem; font-weight:800; color:${scoreColor}; line-height:1;">${score}</div>
                <small style="color:${scoreColor}; font-weight:600;">${scoreLabel}</small>
                <div style="font-size:0.72rem; color:var(--text-muted);">Score d'éligibilité</div>
            </div>` : ''}
        </div>

        <!-- Infos en 2 colonnes -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
            <!-- Colonne client -->
            <div style="background:rgba(41,121,255,0.06); border:1px solid rgba(41,121,255,0.2); border-radius:12px; padding:1.2rem;">
                <h4 style="color:#2979FF; margin-bottom:1rem; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-user"></i> Client</h4>
                <div style="display:flex; flex-direction:column; gap:6px; font-size:0.9rem;">
                    <span><strong>Nom :</strong> ${c.client_details?.first_name || ''} ${c.client_details?.last_name || c.client_details?.username || '—'}</span>
                    <span><strong>Téléphone :</strong> ${c.client_details?.telephone || '<em style="color:var(--accent-danger);">Non renseigné</em>'}</span>
                    <span><strong>Identifiant :</strong> ${c.client_details?.username || '—'}</span>
                </div>
            </div>
            <!-- Colonne demande -->
            <div style="background:rgba(0,230,118,0.06); border:1px solid rgba(0,230,118,0.2); border-radius:12px; padding:1.2rem;">
                <h4 style="color:var(--accent-primary); margin-bottom:1rem; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-file-invoice-dollar"></i> Demande</h4>
                <div style="display:flex; flex-direction:column; gap:6px; font-size:0.9rem;">
                    <span><strong>Montant :</strong> <strong style="color:var(--accent-primary); font-size:1.1rem;">${formatMoney(c.montant_demande)}</strong></span>
                    <span><strong>Durée :</strong> ${c.duree_mois} mois</span>
                    <span><strong>Mensualité estimée :</strong> ~${formatMoney(parseFloat(c.montant_demande) / c.duree_mois)}/mois</span>
                </div>
            </div>
        </div>

        <!-- Motif / Justificatif -->
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:12px; padding:1.2rem; margin-bottom:1rem;">
            <h4 style="color:var(--accent-warning); margin-bottom:0.8rem; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-comment-dots"></i> Motif de la demande</h4>
            <p style="font-style:${c.motif ? 'normal' : 'italic'}; color:${c.motif ? 'var(--text-primary)' : 'var(--text-muted)'}; line-height:1.7;">
                ${c.motif || 'Aucun motif renseigné par le client.'}
            </p>
            ${c.justificatifs ? `<a href="${c.justificatifs}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; margin-top:0.8rem; color:var(--accent-secondary); font-size:0.9rem; text-decoration:none;"><i class="fa-solid fa-file-arrow-down"></i> Télécharger le justificatif</a>` : '<p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.5rem;"><i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-warning);"></i> Aucun justificatif joint</p>'}
        </div>
    `;

    // Traçabilité (si déjà traitée)
    if (c.agent_analyse_details || c.admin_approbation_details || c.note_decision) {
        html += `
        <div style="background:rgba(255,145,0,0.05); border:1px solid rgba(255,145,0,0.2); border-radius:12px; padding:1.2rem;">
            <h4 style="color:var(--accent-warning); margin-bottom:0.8rem; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-timeline"></i> Historique de traitement</h4>
            <div style="display:flex; flex-direction:column; gap:8px; font-size:0.9rem;">
                ${c.agent_analyse_details ? `<div style="display:flex; gap:10px; align-items:center;"><i class="fa-solid fa-magnifying-glass" style="color:#2979FF; width:16px;"></i><span>Analysé par <strong>${c.agent_analyse_details.username}</strong> le ${formatDate(c.date_analyse)}</span></div>` : ''}
                ${c.admin_approbation_details ? `<div style="display:flex; gap:10px; align-items:center;"><i class="fa-solid fa-check" style="color:var(--accent-primary); width:16px;"></i><span>Approuvé par <strong>${c.admin_approbation_details.username}</strong> le ${formatDate(c.date_approbation)}</span></div>` : ''}
                ${c.note_decision ? `<div style="margin-top:0.5rem; padding:0.8rem; background:rgba(0,0,0,0.2); border-radius:8px; font-style:italic; color:var(--text-secondary);">"${c.note_decision}"</div>` : ''}
            </div>
        </div>
        `;
    }

    document.getElementById('detail-modal-body').innerHTML = html;
    
    // Boutons d'action
    let actionsHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <button class="btn btn-secondary" style="background:rgba(255,255,255,0.05); color:white; border:1px solid var(--border-color); padding:0.7rem 1.2rem; border-radius:10px; cursor:pointer;" onclick="closeModal('modal-detail-credit')">Fermer</button>
            <div style="display: flex; gap: 10px;">
    `;
    
    if (isAgent) {
        if (c.statut === 'SOUMISE') {
            actionsHtml += `
                <button class="btn" style="background:rgba(255,23,68,0.15); border:1px solid var(--accent-danger); color:var(--accent-danger); padding:0.7rem 1.2rem; border-radius:10px; cursor:pointer; transition:all 0.3s;" onclick="closeModal('modal-detail-credit'); openActionModal(${c.id}, 'reject')"><i class="fa-solid fa-xmark"></i> Rejeter</button>
                <button class="btn" style="background:rgba(41,121,255,0.2); border:1px solid #2979FF; color:#2979FF; padding:0.7rem 1.2rem; border-radius:10px; cursor:pointer; transition:all 0.3s;" onclick="closeModal('modal-detail-credit'); openActionModal(${c.id}, 'analyze')"><i class="fa-solid fa-magnifying-glass"></i> Passer en analyse</button>
            `;
        } else if (c.statut === 'EN_ANALYSE') {
            actionsHtml += `
                <button class="btn" style="background:rgba(255,23,68,0.15); border:1px solid var(--accent-danger); color:var(--accent-danger); padding:0.7rem 1.2rem; border-radius:10px; cursor:pointer; transition:all 0.3s;" onclick="closeModal('modal-detail-credit'); openActionModal(${c.id}, 'reject')"><i class="fa-solid fa-xmark"></i> Rejeter</button>
                <button class="btn" style="background:var(--accent-primary); color:#000; padding:0.7rem 1.5rem; border-radius:10px; border:none; cursor:pointer; font-weight:700; transition:all 0.3s;" onclick="closeModal('modal-detail-credit'); openActionModal(${c.id}, 'approve')"><i class="fa-solid fa-check"></i> Approuver</button>
            `;
        } else if (c.statut === 'APPROUVEE') {
            actionsHtml += `
                <button class="btn" style="background:var(--accent-secondary); color:#fff; padding:0.7rem 1.5rem; border-radius:10px; border:none; cursor:pointer; font-weight:700; transition:all 0.3s;" onclick="closeModal('modal-detail-credit'); openActionModal(${c.id}, 'decaisse')"><i class="fa-solid fa-money-bill-transfer"></i> Décaisser</button>
            `;
        }
    }
    
    actionsHtml += `</div></div>`;
    document.getElementById('detail-modal-actions').innerHTML = actionsHtml;
    openModal('modal-detail-credit');
}

// ---- UTILS ----
function formatMoney(val) {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(num).replace('XOF', 'FCFA');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-in reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) sidebar.classList.toggle('collapsed');
}

// ---- REMBOURSEMENTS ----
async function loadRemboursements() {
    try {
        const echeanciers = await api.getEcheanciers();
        const tbody = document.getElementById('remb-table-body');
        if (echeanciers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune échéance trouvée</td></tr>';
            return;
        }
        
        const isAgent = currentUser.role === 'AGENT_TERRAIN' || currentUser.role === 'ADMINISTRATEUR';
        
        tbody.innerHTML = echeanciers.map(e => `
            <tr>
                <td>${e.demande_credit}</td>
                <td>${e.client_nom || 'Client'}</td>
                <td>${formatDate(e.date_echeance)}</td>
                <td><strong>${formatMoney(e.montant_attendu)}</strong></td>
                <td>
                    <span class="status-badge status-${e.statut.toLowerCase()}">${e.statut.replace('_', ' ')}</span>
                    ${e.statut !== 'PAYE' ? `<button class="btn-primary" style="padding:4px 8px; font-size:0.75rem; margin-left:10px;" onclick="openPaiementModal(${e.id})">${isAgent ? 'Saisir Paiement' : 'Payer'}</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        showToast('Erreur chargement remboursements', 'error');
    }
}

function openPaiementModal(id) {
    document.getElementById('paiement-echeancier-id').value = id;
    document.getElementById('paiement-montant').value = '';
    openModal('modal-paiement');
}

async function submitPaiement() {
    const id = document.getElementById('paiement-echeancier-id').value;
    const montant = document.getElementById('paiement-montant').value;
    try {
        await api.createPaiement({ echeancier: id, montant_paye: montant });
        showToast('Paiement enregistré', 'success');
        closeModal('modal-paiement');
        loadRemboursements();
    } catch(e) {
        showToast(e.message, 'error');
    }
}

// ---- ASSURANCES ----
async function loadAssurances() {
    try {
        const [produits, souscriptions] = await Promise.all([
            api.getAssurances(),
            api.getSouscriptions()
        ]);
        
        // Render produits
        const grid = document.getElementById('assurances-grid');
        grid.innerHTML = produits.map(p => `
            <div class="stat-card" style="display:flex; flex-direction:column;">
                <div style="flex:1;">
                    <h3 style="color:var(--accent-primary); font-size:1.2rem; margin-bottom:10px;">${p.nom}</h3>
                    <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:15px; line-height:1.4;">${p.description}</p>
                    <div style="font-size:1.4rem; font-weight:700; margin-bottom:15px;">${formatMoney(p.prime_mensuelle)}<span style="font-size:0.8rem; color:var(--text-secondary);"> /mois</span></div>
                </div>
                ${currentUser.role === 'CLIENT' ? `<button class="btn-primary" style="width:100%; justify-content:center;" onclick="souscrireAssurance(${p.id})">Souscrire</button>` : ''}
            </div>
        `).join('');
        
        // Render souscriptions
        const tbody = document.getElementById('assur-table-body');
        if (souscriptions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Aucune souscription active</td></tr>';
            return;
        }
        tbody.innerHTML = souscriptions.map(s => {
            const prod = produits.find(p => p.id === s.produit);
            const pName = prod ? prod.nom : 'Produit #' + s.produit;
            return `
            <tr>
                <td><strong>${pName}</strong></td>
                <td>Client #${s.client || '-'}</td>
                <td>${formatDate(s.date_debut)} au ${formatDate(s.date_fin)}</td>
                <td><span class="status-badge" style="background:${s.statut === 'ACTIVE' ? 'rgba(0,230,118,0.2)' : 'rgba(255,23,68,0.2)'}; color:${s.statut === 'ACTIVE' ? '#00E676' : '#FF1744'};">${s.statut}</span></td>
            </tr>
            `;
        }).join('');
    } catch (e) {
        showToast('Erreur chargement assurances', 'error');
    }
}

async function souscrireAssurance(produitId) {
    if (!confirm('Voulez-vous vraiment souscrire à cette assurance ?')) return;
    try {
        await api.createSouscription({ produit: produitId });
        showToast('Souscription réussie', 'success');
        loadAssurances();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

let adminChartInstance = null;

async function loadAdminDashboard() {
    try {
        const data = await api.getAdminDashboard();
        
        document.getElementById('admin-kpi-recouvrement').textContent = data.taux_recouvrement + '%';
        document.getElementById('admin-kpi-assurances').textContent = data.souscriptions_actives;
        document.getElementById('admin-kpi-support').textContent = data.conversations_ouvertes;
        const reste = data.montant_attendu - data.montant_paye;
        document.getElementById('admin-kpi-reste').textContent = formatMoney(reste);

        const ctx = document.getElementById('adminDashboardChart');
        if (!ctx) return;

        let labels = [];
        let counts = [];
        let bgColors = [];
        
        const colors = {
            'SOUMISE': '#FF9100',
            'EN_ANALYSE': '#2979FF',
            'APPROUVEE': '#00E676',
            'REJETEE': '#FF1744',
            'DECAISSEE': '#7C4DFF'
        };

        data.volume_demandes.forEach(v => {
            labels.push(v.statut.replace('_', ' '));
            counts.push(v.count);
            bgColors.push(colors[v.statut] || '#999');
        });

        if (adminChartInstance) adminChartInstance.destroy();
        adminChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: bgColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });

    } catch (e) {
        console.error('Admin dashboard error', e);
    }
}

async function loadAdmin() {
    loadAdminDashboard();
    try {
        const users = await api.getUsers();
        const tbody = document.getElementById('admin-table-body');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.first_name} ${u.last_name}</td>
                <td><span class="status-badge" style="background:rgba(255,255,255,0.1); color:white;">${u.role.replace('_', ' ')}</span></td>
                <td>${u.telephone || '-'}</td>
                <td>${formatDate(u.created_at)}</td>
                <td>
                    <button class="btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="openRoleModal(${u.id}, '${u.role}')">Modifier Rôle</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        showToast('Erreur chargement utilisateurs', 'error');
    }
}

function openRoleModal(id, currentRole) {
    document.getElementById('role-user-id').value = id;
    document.getElementById('role-select').value = currentRole;
    openModal('modal-role');
}

async function submitRoleChange() {
    const id = document.getElementById('role-user-id').value;
    const role = document.getElementById('role-select').value;
    try {
        await api.updateUserRole(id, role);
        showToast('Rôle mis à jour', 'success');
        closeModal('modal-role');
        loadAdmin();
    } catch (e) {
        showToast(e.message, 'error');
    }
}
