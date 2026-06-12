import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cofinance.settings')
django.setup()

from django.contrib.auth import get_user_model
from microcredits.models import DemandeCredit
from assurances.models import ProduitAssurance, SouscriptionAssurance
from remboursements.models import Echeancier
from support_client.models import Conversation, Message
from notifications.models import Notification

User = get_user_model()

def seed_db():
    print("Nettoyage de la base de données existante...")
    Notification.objects.all().delete()
    Message.objects.all().delete()
    Conversation.objects.all().delete()
    Echeancier.objects.all().delete()
    SouscriptionAssurance.objects.all().delete()
    ProduitAssurance.objects.all().delete()
    DemandeCredit.objects.all().delete()
    User.objects.exclude(is_superuser=True).delete()

    print("Création des utilisateurs...")
    client1 = User.objects.create_user(username='Client1', password='testpass', first_name='Jean', last_name='Kouassi', telephone='0102030405', role='CLIENT')
    client2 = User.objects.create_user(username='Client2', password='testpass', first_name='Marie', last_name='Bamba', telephone='0506070809', role='CLIENT')
    agent = User.objects.create_user(username='Agent1', password='testpass', first_name='Paul', last_name='Kone', telephone='0908070605', role='AGENT_TERRAIN')
    admin = User.objects.create_user(username='Admin1', password='testpass', first_name='Directeur', last_name='Général', telephone='0000000000', role='ADMINISTRATEUR')

    print("Création des produits d'assurance...")
    prod1 = ProduitAssurance.objects.create(nom='Assurance Mobile Basic', description='Couverture de base', prime_mensuelle=1000)
    prod2 = ProduitAssurance.objects.create(nom='Assurance Mobile Premium', description='Couverture tous risques', prime_mensuelle=2500)

    print("Création des données pour Client1...")
    # Demande de crédit
    demande1 = DemandeCredit.objects.create(
        client=client1, montant_demande=150000, duree_mois=6, motif='Achat de marchandises', statut='APPROUVEE', score_eligibilite=85,
        agent_analyse=agent, admin_approbation=admin
    )
    # Echeancier
    Echeancier.objects.create(demande_credit=demande1, date_echeance=timezone.now() + timedelta(days=15), montant_attendu=25000, statut='EN_ATTENTE')
    Echeancier.objects.create(demande_credit=demande1, date_echeance=timezone.now() - timedelta(days=15), montant_attendu=25000, statut='PAYE')
    
    # Souscription assurance
    SouscriptionAssurance.objects.create(client=client1, produit=prod1, date_debut=timezone.now(), date_fin=timezone.now() + timedelta(days=365), statut='ACTIVE')

    print("Création des données pour Client2...")
    # Demande de crédit
    demande2 = DemandeCredit.objects.create(client=client2, montant_demande=500000, duree_mois=12, motif='Rénovation boutique', statut='SOUMISE', score_eligibilite=60)
    
    print("Création de l'historique de Chat...")
    conv = Conversation.objects.create(client=client1, agent=agent, sujet='Question sur mon prêt')
    Message.objects.create(conversation=conv, expediteur=client1, contenu='Bonjour, quand aurais-je mon argent ?')
    Message.objects.create(conversation=conv, expediteur=agent, contenu='Bonjour Jean, le décaissement est prévu pour demain.')

    print("Création de notifications...")
    Notification.objects.create(utilisateur=client1, message='Votre prêt de 150000 a été approuvé !', type_alerte='CREDIT')
    Notification.objects.create(utilisateur=admin, message='Marie a soumis une nouvelle demande.', type_alerte='INFO')

    print("\n[OK] Base de données initialisée avec succès ! (Jeu de données complet)")
    print("Comptes créés (Mot de passe: testpass) :")
    print("- Client1 (Rôle: CLIENT)")
    print("- Client2 (Rôle: CLIENT)")
    print("- Agent1  (Rôle: AGENT_TERRAIN)")
    print("- Admin1  (Rôle: ADMINISTRATEUR)")

if __name__ == '__main__':
    seed_db()
