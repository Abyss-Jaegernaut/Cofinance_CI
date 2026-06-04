from django.shortcuts import render
from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UtilisateurSerializer

Utilisateur = get_user_model()

class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().order_by('-created_at')
    serializer_class = UtilisateurSerializer
