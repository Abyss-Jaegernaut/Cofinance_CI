from django.db import models
from django.conf import settings
from core.models import BaseModel

class Conversation(BaseModel):
    STATUTS_CONVERSATION = (
        ('OUVERTE', 'Ouverte'),
        ('FERMEE', 'Fermée'),
    )

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='conversations_client',
        verbose_name="Client"
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='conversations_agent',
        verbose_name="Agent assigné"
    )
    statut = models.CharField(max_length=20, choices=STATUTS_CONVERSATION, default='OUVERTE', verbose_name="Statut")

    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        ordering = ['-updated_at']

    def __str__(self):
        agent_nom = self.agent.username if self.agent else "Non assigné"
        return f"Chat: {self.client.username} & {agent_nom} ({self.get_statut_display()})"

class Message(BaseModel):
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages',
        verbose_name="Conversation"
    )
    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='messages_envoyes',
        verbose_name="Expéditeur"
    )
    contenu = models.TextField(verbose_name="Contenu du message")

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else ''}] {self.expediteur.username}: {self.contenu[:30]}..."
