from django.db import models
from django.conf import settings
from core.models import BaseModel

class ProduitAssurance(BaseModel):
    nom = models.CharField(max_length=100, verbose_name="Nom du produit")
    description = models.TextField(blank=True, null=True, verbose_name="Description")
    prime_mensuelle = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Prime mensuelle (FCFA)")

    class Meta:
        verbose_name = "Produit d'assurance"
        verbose_name_plural = "Produits d'assurance"
        ordering = ['nom']

    def __str__(self):
        return self.nom

class SouscriptionAssurance(BaseModel):
    STATUTS_SOUSCRIPTION = (
        ('ACTIVE', 'Active'),
        ('EXPIREE', 'Expirée'),
    )

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='souscriptions_assurance',
        verbose_name="Client"
    )
    produit = models.ForeignKey(
        ProduitAssurance, 
        on_delete=models.CASCADE, 
        related_name='souscriptions',
        verbose_name="Produit souscrit"
    )
    date_debut = models.DateField(verbose_name="Date de début")
    date_fin = models.DateField(verbose_name="Date de fin")
    statut = models.CharField(max_length=20, choices=STATUTS_SOUSCRIPTION, default='ACTIVE', verbose_name="Statut")

    class Meta:
        verbose_name = "Souscription d'assurance"
        verbose_name_plural = "Souscriptions d'assurance"
        ordering = ['-date_fin']

    def __str__(self):
        return f"{self.client.username} - {self.produit.nom} ({self.get_statut_display()})"
