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

from support_client.models import Message

@receiver(post_save, sender=Message)
def notifier_nouveau_message(sender, instance, created, **kwargs):
    if created:
        conversation = instance.conversation
        if instance.expediteur != conversation.client:
            message_texte = f"Nouveau message du support: {instance.contenu[:30]}..."
            Notification.objects.create(
                utilisateur=conversation.client,
                message=message_texte,
                type_alerte='INFO'
            )
        else:
            # S'il y a un agent assigné, on le notifie
            if conversation.agent:
                message_texte = f"Nouveau message de {conversation.client.username}: {instance.contenu[:30]}..."
                Notification.objects.create(
                    utilisateur=conversation.agent,
                    message=message_texte,
                    type_alerte='INFO'
                )

from assurances.models import SouscriptionAssurance

@receiver(post_save, sender=SouscriptionAssurance)
def notifier_nouvelle_souscription(sender, instance, created, **kwargs):
    if created:
        message = f"Félicitations, votre souscription à {instance.produit.nom} est confirmée."
        Notification.objects.create(
            utilisateur=instance.client,
            message=message,
            type_alerte='ASSURANCE'
        )
