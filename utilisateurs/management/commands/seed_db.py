from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from microcredits.models import DemandeCredit

Utilisateur = get_user_model()

class Command(BaseCommand):
    help = 'Supprime et recrée les comptes de test avec quelques données'

    def handle(self, *args, **kwargs):
        # Création Administrateur
        if not Utilisateur.objects.filter(username='admin').exists():
            admin = Utilisateur.objects.create_superuser('admin', 'admin@cofinance.ci', 'admin123')
            admin.role = 'ADMINISTRATEUR'
            admin.first_name = 'Boss'
            admin.last_name = 'Cofinance'
            admin.save()
            
        # Création Agent
        if not Utilisateur.objects.filter(username='agent').exists():
            agent = Utilisateur.objects.create_user('agent', 'agent@cofinance.ci', 'agent123')
            agent.role = 'AGENT_TERRAIN'
            agent.first_name = 'Agent'
            agent.last_name = 'Terrain'
            agent.save()
            
        # Création Client
        if not Utilisateur.objects.filter(username='client').exists():
            client = Utilisateur.objects.create_user('client', 'client@cofinance.ci', 'client123')
            client.role = 'CLIENT'
            client.first_name = 'Jean'
            client.last_name = 'Client'
            client.save()
        else:
            client = Utilisateur.objects.get(username='client')
            
        admin = Utilisateur.objects.get(username='admin')
        agent = Utilisateur.objects.get(username='agent')

        # Création de données fictives
        from microcredits.models import DemandeCredit
        from remboursements.models import Echeancier
        from django.utils import timezone
        import datetime
        from decimal import Decimal

        if not DemandeCredit.objects.exists():
            # 1 demande en analyse
            d1 = DemandeCredit.objects.create(
                client=client,
                montant_demande=50000,
                duree_mois=3,
                motif="Achat de stock",
                statut='EN_ANALYSE',
                score_eligibilite=100,
                agent_analyse=agent
            )
            
            # 1 demande décaissée avec des échéances
            d2 = DemandeCredit.objects.create(
                client=client,
                montant_demande=100000,
                duree_mois=2,
                motif="Achat équipement",
                statut='DECAISSEE',
                score_eligibilite=95,
                agent_analyse=agent
            )
            
            Echeancier.objects.create(
                demande_credit=d2,
                date_echeance=timezone.now().date() - datetime.timedelta(days=1),
                montant_attendu=Decimal('50000.00'),
                statut='EN_RETARD',
                penalite_retard=Decimal('2500.00')
            )
            Echeancier.objects.create(
                demande_credit=d2,
                date_echeance=timezone.now().date() + datetime.timedelta(days=30),
                montant_attendu=Decimal('50000.00'),
                statut='EN_ATTENTE'
            )

        self.stdout.write(self.style.SUCCESS('Comptes de test et données recréés avec succès.'))
