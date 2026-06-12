from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from remboursements.models import Echeancier
from notifications.models import Notification

class Command(BaseCommand):
    help = 'Traite les échéanciers : alertes J-3, pénalités J+1'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        echeanciers = Echeancier.objects.filter(statut__in=['EN_ATTENTE', 'EN_RETARD'])

        for e in echeanciers:
            days_diff = (e.date_echeance - today).days

            # Alerte J-3
            if days_diff == 3 and e.statut == 'EN_ATTENTE':
                Notification.objects.create(
                    user=e.demande_credit.client,
                    type_notif='INFO',
                    message=f"Rappel : Votre échéance de {e.montant_attendu} FCFA est due dans 3 jours."
                )

            # Alerte J+1 et application de pénalité
            elif days_diff < 0 and e.statut == 'EN_ATTENTE':
                e.statut = 'EN_RETARD'
                penalite = e.montant_attendu * Decimal('0.05') # 5% de pénalité
                e.penalite_retard = penalite
                e.save()

                Notification.objects.create(
                    user=e.demande_credit.client,
                    type_notif='WARNING',
                    message=f"Alerte : Votre échéance est en retard. Une pénalité de {penalite} FCFA a été appliquée."
                )

        self.stdout.write(self.style.SUCCESS('Échéanciers traités avec succès.'))
