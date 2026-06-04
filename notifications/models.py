from django.db import models
from django.conf import settings
from core.models import BaseModel

class Notification(BaseModel):
    TYPES_ALERTE = (
        ('INFO', 'Information'),
        ('CREDIT', 'Mise à jour Crédit'),
        ('PAIEMENT', 'Paiement Enregistré'),
        ('ASSURANCE', 'Alerte Assurance'),
    )

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name="Utilisateur concerné"
    )
    message = models.TextField(verbose_name="Message de la notification")
    type_alerte = models.CharField(max_length=20, choices=TYPES_ALERTE, default='INFO', verbose_name="Type d'alerte")
    est_lue = models.BooleanField(default=False, verbose_name="Est lue ?")

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']

    def __str__(self):
        etat = "Lue" if self.est_lue else "Non lue"
        return f"[{self.type_alerte}] {self.utilisateur.username} - {etat}"
