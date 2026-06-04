from django.db.models.signals import post_save
from django.dispatch import receiver
from microcredits.models import DemandeCredit
from remboursements.models import Paiement
from .models import Notification

@receiver(post_save, sender=DemandeCredit)
def notifier_changement_statut_credit(sender, instance, created, **kwargs):
    # On notifie quand le statut passe à APPROUVEE ou REJETEE
    if not created and instance.statut in ['APPROUVEE', 'REJETEE']:
        # Vérifions d'abord si une notification similaire récente n'existe pas pour éviter le spam
        message = f"Votre demande de crédit de {instance.montant_demande} FCFA a été {instance.get_statut_display()}."
        Notification.objects.create(
            utilisateur=instance.client,
            message=message,
            type_alerte='CREDIT'
        )

@receiver(post_save, sender=Paiement)
def notifier_enregistrement_paiement(sender, instance, created, **kwargs):
    if created:
        message = f"Nous avons bien reçu votre paiement de {instance.montant_paye} FCFA. Merci !"
        Notification.objects.create(
            utilisateur=instance.echeancier.demande_credit.client,
            message=message,
            type_alerte='PAIEMENT'
        )
