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
    motif = models.TextField(blank=True, null=True, verbose_name="Motif / Justification")
    justificatifs = models.FileField(upload_to='justificatifs_credits/', blank=True, null=True, verbose_name="Pièces justificatives")
    score_eligibilite = models.IntegerField(blank=True, null=True, verbose_name="Score d'éligibilité")
    statut = models.CharField(max_length=20, choices=STATUTS, default='SOUMISE', verbose_name="Statut de la demande")
    note_decision = models.TextField(blank=True, null=True, verbose_name="Note de décision")
    
    # Champs d'audit et traçabilité
    agent_analyse = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='demandes_analysees',
        verbose_name="Agent d'analyse"
    )
    date_analyse = models.DateTimeField(null=True, blank=True, verbose_name="Date d'analyse")
    
    admin_approbation = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='demandes_approuvees',
        verbose_name="Administrateur d'approbation"
    )
    date_approbation = models.DateTimeField(null=True, blank=True, verbose_name="Date d'approbation")

    class Meta:
        verbose_name = "Demande de Crédit"
        verbose_name_plural = "Demandes de Crédit"

    def __str__(self):
        return f"Demande #{self.id} - {self.client.username} - {self.montant_demande} FCFA"

    def calculer_score(self):
        score = 50
        # Impact de la durée
        if self.duree_mois <= 6:
            score += 20
        elif self.duree_mois > 12:
            score -= 10
            
        # Impact du montant
        if self.montant_demande <= 50000:
            score += 20
        elif self.montant_demande >= 500000:
            score -= 20
            
        # Borner entre 0 et 100
        return max(0, min(100, score))

    def save(self, *args, **kwargs):
        if not self.pk and self.score_eligibilite is None:
            self.score_eligibilite = self.calculer_score()
        super().save(*args, **kwargs)
