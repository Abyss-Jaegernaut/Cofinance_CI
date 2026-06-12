const API_BASE = '/api';

const api = {
    // Gestion du Token
    setTokens(access, refresh) {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
    },
    getAccessToken() { return localStorage.getItem('access_token'); },
    getRefreshToken() { return localStorage.getItem('refresh_token'); },
    hasTokens() { return !!this.getAccessToken(); },
    clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    },

    // Wrapper pour fetch
    async fetchWithAuth(url, options = {}) {
        const token = this.getAccessToken();
        let headers = {
            ...options.headers
        };
        
        // N'ajouter Content-Type application/json que si ce n'est pas FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let response = await fetch(`${API_BASE}${url}`, { ...options, headers });

        // Gestion simplifiée du Refresh Token
        if (response.status === 401 && this.getRefreshToken()) {
            const refreshRes = await fetch(`${API_BASE}/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: this.getRefreshToken() })
            });
            
            if (refreshRes.ok) {
                const data = await refreshRes.json();
                this.setTokens(data.access, this.getRefreshToken());
                // Re-tente la requête initiale
                headers['Authorization'] = `Bearer ${data.access}`;
                response = await fetch(`${API_BASE}${url}`, { ...options, headers });
            } else {
                this.clearTokens();
                window.location.reload(); // Force la reconnexion
            }
        }

        return response;
    },

    // Méthodes d'API
    async login(username, password) {
        const res = await fetch(`${API_BASE}/token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) throw new Error('Identifiants incorrects');
        const data = await res.json();
        this.setTokens(data.access, data.refresh);
        return data;
    },

    async register(data) {
        const res = await fetch(`${API_BASE}/utilisateurs/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const respData = await res.json();
        if (!res.ok) {
            // DRF returns errors as object keys
            const errors = Object.values(respData).flat().join(', ');
            throw new Error(errors || 'Erreur lors de la création du compte');
        }
        return respData;
    },

    async getDashboardStats(days = 30) {
        const res = await this.fetchWithAuth(`/microcredits/dashboard_stats/?days=${days}`);
        return await res.json();
    },

    async getNotifications() {
        const res = await this.fetchWithAuth('/notifications/');
        if (!res.ok) throw new Error('Erreur récupération notifications');
        return res.json();
    },

    async markNotificationRead(id) {
        const res = await this.fetchWithAuth(`/notifications/${id}/marquer-lue/`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Erreur marquage notification');
        return res.json();    },

    async getProfile() {
        const res = await this.fetchWithAuth('/utilisateurs/me/');
        if (!res.ok) throw new Error('Erreur profil');
        return res.json();
    },

    async updateProfile(id, data) {
        const res = await this.fetchWithAuth(`/utilisateurs/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur lors de la mise à jour du profil');
        }
        return res.json();
    },

    async getEcheanciers() {
        const res = await this.fetchWithAuth('/echeanciers/');
        if (!res.ok) throw new Error('Erreur récupération échéanciers');
        return res.json();
    },

    async createPaiement(data) {
        const res = await this.fetchWithAuth('/paiements/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur enregistrement paiement');
        }
        return res.json();
    },

    async getCredits() {
        const res = await this.fetchWithAuth('/microcredits/');
        return res.json();
    },

    async markConversationRead(conversationId) {
        const res = await this.fetchWithAuth(`/conversations/${conversationId}/mark_read/`, { method: 'POST' });
        return res.ok;
    },

    async getUnreadMessagesCount() {
        const res = await this.fetchWithAuth('/messages/unread_count/');
        if (res.ok) {
            const data = await res.json();
            return data.count || 0;
        }
        return 0;
    },

    async getAssurances() {
        const res = await this.fetchWithAuth('/produits-assurance/');
        return res.json();
    },

    async getSouscriptions() {
        const res = await this.fetchWithAuth('/souscriptions/');
        return res.json();
    },

    async createSouscription(data) {
        const res = await this.fetchWithAuth('/souscriptions/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur souscription');
        return res.json();
    },

    async getUsers() {
        const res = await this.fetchWithAuth('/utilisateurs/');
        return res.json();
    },

    async getAdminDashboard() {
        const res = await this.fetchWithAuth('/microcredits/admin_dashboard/');
        if (!res.ok) throw new Error('Erreur chargement dashboard admin');
        return res.json();
    },

    async updateUserRole(id, role) {
        const res = await this.fetchWithAuth(`/utilisateurs/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
        if (!res.ok) throw new Error('Erreur modification rôle');
        return res.json();
    },

    async createCredit(data) {
        // data peut être un objet (JSON) ou FormData
        let options = {
            method: 'POST',
        };
        
        if (data instanceof FormData) {
            // Pour FormData, fetch ajoute automatiquement Content-Type avec le boundary
            options.body = data;
        } else {
            options.body = JSON.stringify(data);
        }

        const res = await this.fetchWithAuth('/microcredits/', options);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur lors de la création de la demande');
        }
        return res.json();
    },

    async analyzeCredit(id, note) {
        const res = await this.fetchWithAuth(`/microcredits/${id}/analyser/`, { 
            method: 'POST',
            body: JSON.stringify({ note }) 
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur lors de l\'analyse');
        }
        return res.json();
    },

    async decaisseCredit(id, note) {
        const res = await this.fetchWithAuth(`/microcredits/${id}/decaisser/`, { 
            method: 'POST',
            body: JSON.stringify({ note }) 
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur lors du décaissement');
        }
        return res.json();
    },

    async approveCredit(id, note) {
        const res = await this.fetchWithAuth(`/microcredits/${id}/approuver/`, { 
            method: 'POST',
            body: JSON.stringify({ note }) 
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur lors de l\'approbation');
        }
        return res.json();
    },

    async rejectCredit(id, note) {
        const res = await this.fetchWithAuth(`/microcredits/${id}/rejeter/`, { 
            method: 'POST',
            body: JSON.stringify({ note }) 
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Erreur lors du rejet');
        }
        return res.json();
    }
};
