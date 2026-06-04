from django.contrib.auth.models import AbstractUser
from django.db import models

class Utilisateur(AbstractUser):
    ROLE_CHOICES = (
        ('CLIENT', 'Client',),
        ('AGENT_TERRAIN', 'Agent de terrain'),
        ('ADMINISTRATEUR', 'Administrateur'),
    )

    telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Numéro de téléphone")
    adresse = models.TextField(blank=True, null=True, verbose_name="Adresse")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='CLIENT', verbose_name="Rôle")

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"
