from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return Notification.objects.filter(utilisateur=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['patch'], url_path='marquer-lue')
    def marquer_lue(self, request, pk=None):
        notification = self.get_object()
        notification.est_lue = True
        notification.save()
        return Response({'status': 'Notification marquée comme lue'})

