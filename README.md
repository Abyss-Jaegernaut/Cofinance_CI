# COFINANCE CI - Plateforme de Microfinance et Support Temps Réel

Plateforme numérique intégrée développée avec Django pour numériser la chaîne de valeur des opérations de microfinance (Crédits, Assurances, Remboursements) et offrir un support client en temps réel via WebSockets.

## 🚀 Fonctionnalités Principales

- **Authentification & Rôles :** Espaces séparés pour les Clients, Agents de terrain et Administrateurs.
- **Gestion des Microcrédits :** Dépôt de demandes, algorithme de "Score d'Éligibilité", et workflow de validation (Soumise, En analyse, Approuvée, Rejetée).
- **Remboursements & Assurances :** Suivi des échéances et souscriptions aux produits d'assurance mobile.
- **Support Temps Réel (WebSockets) :** Chat instantané bidirectionnel entre clients et agents avec indicateurs de non-lus.
- **Tableau de Bord Admin :** KPIs financiers et suivi d'activité.

## 🛠 Prérequis (Très Important !)

Pour lancer ce projet, vous avez besoin de deux choses distinctes :

1. **Python 3.11+** (Pour faire tourner le code Django)
2. **Le Logiciel Redis** (Pour faire fonctionner le Chat en temps réel)

⚠️ **Attention :** Le fichier `requirements.txt` n'installe pas le logiciel Redis ! Il installe juste de quoi permettre à Python de "parler" à Redis. Vous devez installer le moteur Redis vous-même sur votre ordinateur.

**Comment installer Redis sur Windows (SANS Docker) :**
La méthode la plus simple pour Windows est d'utiliser **Memurai** (une version native de Redis pour Windows). Vous n'avez **pas besoin de Docker** !

1. Téléchargez Memurai Developer ici : [https://www.memurai.com/get-memurai](https://www.memurai.com/get-memurai)
2. Installez-le en cliquant sur "Suivant" jusqu'à la fin.
3. C'est tout ! Redis tournera désormais tout seul en arrière-plan sur votre PC.

## ⚙️ Installation et Démarrage

Suivez ces étapes dans votre terminal (Invite de commandes ou PowerShell) pour lancer le projet :

### 1. Cloner et préparer l'environnement virtuel

```bash
# Se placer dans le répertoire de votre choix
cd mon_dossier
git clone <URL_DU_DEPOT>

# Créer un environnement virtuel Python
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows :
venv\Scripts\activate
# Sur Mac/Linux :
source venv/bin/activate
```

### 2. Installer les dépendances

```bash
# Assurez-vous que l'environnement virtuel (venv) est actif
pip install -r requirements.txt
```

*(Ceci installera Django, Django REST Framework, Channels, et redis).*

### 3. Préparer la Base de Données (SQLite)

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Lancer le serveur Redis

Avant de démarrer Django, assurez-vous que Redis est lancé.

- **Si vous avez installé Memurai sur Windows** : C'est automatique, vous n'avez rien à taper !
- *Si vous avez utilisé Linux/WSL* : `sudo service redis-server start`

### 5. Démarrer l'application Django (avec Daphne)

```bash
python manage.py runserver
```

Le projet tourne maintenant sur `http://127.0.0.1:8000/`. L'interface principale est accessible directement à cette adresse !

## 👤 Jeu de données de test (Fixtures complètes)

Pour tester immédiatement l'application sans tout créer manuellement, vous pouvez utiliser le script de démarrage (`seed_db.py`) fourni à la racine. Il effacera les anciennes données et générera des actions réalistes !

```bash
python seed_db.py
```

Cela va générer un vrai écosystème avec 4 utilisateurs :

- **Client1** (Rôle: CLIENT) - Mot de passe : `testpass` (A un prêt approuvé, une échéance payée, une assurance, et une discussion ouverte)
- **Client2** (Rôle: CLIENT) - Mot de passe : `testpass` (A un prêt en attente)
- **Agent1**  (Rôle: AGENT_TERRAIN) - Mot de passe : `testpass`
- **Admin1**  (Rôle: ADMINISTRATEUR) - Mot de passe : `testpass`

## 📚 Documentation de l'API (Swagger)

Comme exigé par le cahier des charges, toute l'API REST est documentée de manière automatique.
Une fois le serveur lancé, vous pouvez consulter la documentation complète (et tester les points de terminaison) à l'adresse suivante :
👉 **[http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)**

## 🐘 Déploiement : Passer sur PostgreSQL

En phase de développement, le projet utilise **SQLite** pour sa simplicité. Pour le déploiement en production, vous devez basculer sur **PostgreSQL** (comme spécifié dans le cahier des charges).

Pour ce faire, définissez simplement la variable d'environnement `USE_POSTGRES=True`. Le projet basculera automatiquement sur PostgreSQL.
Vous pourrez configurer votre base avec les variables d'environnement suivantes :

- `DB_NAME` (par défaut: cofinance_db)
- `DB_USER` (par défaut: postgres)
- `DB_PASSWORD` (par défaut: postgres)
- `DB_HOST` (par défaut: localhost)
- `DB_PORT` (par défaut: 5432)

*(La dépendance `psycopg2-binary` est déjà incluse dans le fichier requirements.txt).*

## 💬 Comment tester le Chat en temps réel ?

1. Ouvrez un navigateur normal et connectez-vous avec `Test1`.
2. Ouvrez une **fenêtre de navigation privée** (pour avoir une session séparée) et connectez-vous avec `Test3`.
3. Depuis le compte Client (Test1), allez dans "Support" et envoyez un message.
4. Dans la fenêtre de l'Agent (Test3), vous verrez la notification apparaître instantanément et pourrez répondre en direct !

---

*Conçu pour COFINANCE CI - Développé enPython/Django/Vanilla JS.*
