from rest_framework import serializers
from .models import Conversation, Message

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ['id', 'client', 'agent', 'statut', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'created_at', 'updated_at']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'expediteur', 'contenu', 'created_at', 'updated_at']
        read_only_fields = ['id', 'expediteur', 'created_at', 'updated_at']
