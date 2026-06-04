from django.db import models
from django.conf import settings
from core.models import BaseModel

class DemandeCredit(BaseModel):
    STATUTS = (
        ('SOUMISE', 'Soumise'),
        ('EN_ANALYSE', 'En analyse'),
        ('APPROUVEE', 'Approuvée'),
        ('REJETEE', 'Rejetée'),
        ('DECAISSEE', 'Décaissée'),
    )

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='demandes_credit',
        verbose_name="Client"
    )
    montant_demande = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Montant demandé (FCFA)")
    duree_mois = models.PositiveIntegerField(verbose_name="Durée en mois")
    justificatifs = models.FileField(upload_to='justificatifs_credits/', blank=True, null=True, verbose_name="Pièces justificatives")
    score_eligibilite = models.IntegerField(blank=True, null=True, verbose_name="Score d'éligibilité")
    statut = models.CharField(max_length=20, choices=STATUTS, default='SOUMISE', verbose_name="Statut de la demande")

    class Meta:
        verbose_name = "Demande de Crédit"
        verbose_name_plural = "Demandes de Crédit"

    def __str__(self):
        return f"Demande #{self.id} - {self.client.username} - {self.montant_demande} FCFA"
