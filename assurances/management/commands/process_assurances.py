from django.core.management.base import BaseCommand
from django.utils import timezone
from assurances.models import Souscription
from notifications.models import Notification

class Command(BaseCommand):
    help = 'Traite les assurances : alerte J-15 avant expiration'

    def handle(self, *args, **kwargs):
        today = timezone.now().date()
        souscriptions = Souscription.objects.filter(statut='ACTIVE')

        for s in souscriptions:
            days_diff = (s.date_fin - today).days

            if days_diff == 15:
                Notification.objects.create(
                    user=s.client,
                    type_notif='WARNING',
                    message=f"Votre assurance {s.produit.nom} expire dans 15 jours. Pensez à la renouveler !"
                )
            elif days_diff < 0:
                s.statut = 'EXPIREE'
                s.save()
                Notification.objects.create(
                    user=s.client,
                    type_notif='INFO',
                    message=f"Votre assurance {s.produit.nom} est arrivée à expiration."
                )

        self.stdout.write(self.style.SUCCESS('Assurances traitées avec succès.'))
