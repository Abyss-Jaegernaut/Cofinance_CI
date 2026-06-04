from rest_framework import serializers
from django.contrib.auth import get_user_model

Utilisateur = get_user_model()

class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'telephone', 'adresse', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']
