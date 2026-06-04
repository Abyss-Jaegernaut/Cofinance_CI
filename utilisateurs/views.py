from django.shortcuts import render
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .serializers import UtilisateurSerializer

Utilisateur = get_user_model()

class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().order_by('-created_at')
    serializer_class = UtilisateurSerializer

    def get_permissions(self):
        # Autorise la création de compte à n'importe qui (sans token)
        if self.action == 'create':
            permission_classes = [permissions.AllowAny]
        else:
            # Pour lire ou modifier, il faut être connecté
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne le profil de l'utilisateur actuellement connecté"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
