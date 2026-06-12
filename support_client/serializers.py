from rest_framework import serializers
from .models import Conversation, Message

class ConversationSerializer(serializers.ModelSerializer):
    client_details = serializers.SerializerMethodField()
    agent_details = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'client', 'client_details', 'agent', 'agent_details', 'sujet', 'statut', 'created_at', 'updated_at', 'unread_count']
        read_only_fields = ['id', 'client', 'created_at', 'updated_at']

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.messages.filter(lu=False).exclude(expediteur=request.user).count()
        return 0

    def get_client_details(self, obj):
        if obj.client:
            return {
                'id': obj.client.id,
                'username': obj.client.username,
                'first_name': obj.client.first_name,
                'last_name': obj.client.last_name,
            }
        return None

    def get_agent_details(self, obj):
        if obj.agent:
            return {
                'id': obj.agent.id,
                'username': obj.agent.username,
                'role': obj.agent.role,
            }
        return None

class MessageSerializer(serializers.ModelSerializer):
    expediteur_details = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'expediteur', 'expediteur_details', 'contenu', 'created_at', 'updated_at']
        read_only_fields = ['id', 'expediteur', 'created_at', 'updated_at']

    def get_expediteur_details(self, obj):
        if obj.expediteur:
            return {
                'id': obj.expediteur.id,
                'username': obj.expediteur.username,
                'first_name': obj.expediteur.first_name,
                'role': obj.expediteur.role,
            }
        return None
