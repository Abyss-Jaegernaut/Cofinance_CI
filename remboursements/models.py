from django.db import models
from django.conf import settings
from microcredits.models import DemandeCredit
from core.models import BaseModel

class Echeancier(BaseModel):
    STATUTS_ECHEANCE = (
        ('EN_ATTENTE', 'En attente'),
        ('PAYE', 'Payé'),
        ('EN_RETARD', 'En retard'),
    )

    demande_credit = models.ForeignKey(
        DemandeCredit, 
        on_delete=models.CASCADE, 
        related_name='echeanciers',
        verbose_name="Demande de Crédit"
    )
    date_echeance = models.DateField(verbose_name="Date d'échéance")
    montant_attendu = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Montant attendu (FCFA)")
    statut = models.CharField(max_length=20, choices=STATUTS_ECHEANCE, default='EN_ATTENTE', verbose_name="Statut")

    class Meta:
        verbose_name = "Échéancier"
        verbose_name_plural = "Échéanciers"
        ordering = ['date_echeance']

    def __str__(self):
        return f"Échéance du {self.date_echeance} - {self.demande_credit.client.username}"

class Paiement(BaseModel):
    echeancier = models.ForeignKey(
        Echeancier, 
        on_delete=models.CASCADE, 
        related_name='paiements',
        verbose_name="Échéancier concerné"
    )
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Montant payé (FCFA)")
    agent_validateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='paiements_valides',
        verbose_name="Agent validateur"
    )

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-created_at']

    def __str__(self):
        return f"Paiement de {self.montant_paye} FCFA le {self.created_at.strftime('%Y-%m-%d') if self.created_at else ''}"
