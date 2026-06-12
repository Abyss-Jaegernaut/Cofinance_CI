from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
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
        from django.contrib.auth import get_user_model
        Utilisateur = get_user_model()
        agent_dispo = Utilisateur.objects.filter(role='AGENT_TERRAIN').order_by('?').first()
        serializer.save(client=self.request.user, agent=agent_dispo)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        conversation = self.get_object()
        Message.objects.filter(conversation=conversation, lu=False).exclude(expediteur=request.user).update(lu=True)
        return Response({'status': 'ok'})


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.all() if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR'] \
             else Message.objects.filter(conversation__client=user)

        # Filtrer par ?conversation=<id>
        conversation_id = self.request.query_params.get('conversation')
        if conversation_id:
            qs = qs.filter(conversation_id=conversation_id)

        return qs.order_by('created_at')

    def perform_create(self, serializer):
        serializer.save(expediteur=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        user = request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            count = Message.objects.filter(lu=False).exclude(expediteur=user).count()
        else:
            count = Message.objects.filter(conversation__client=user, lu=False).exclude(expediteur=user).count()
        return Response({'count': count})
