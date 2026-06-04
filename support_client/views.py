from rest_framework import viewsets, permissions
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return Conversation.objects.all().order_by('-updated_at')
        return Conversation.objects.filter(client=user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return Message.objects.all().order_by('created_at')
        return Message.objects.filter(conversation__client=user).order_by('created_at')

    def perform_create(self, serializer):
        serializer.save(expediteur=self.request.user)

