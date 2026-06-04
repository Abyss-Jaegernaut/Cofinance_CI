from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

Utilisateur = get_user_model()

class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'telephone', 'adresse', 'role', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        user = Utilisateur.objects.create(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            telephone=validated_data.get('telephone', ''),
            adresse=validated_data.get('adresse', ''),
            role=validated_data.get('role', 'CLIENT')
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Ajouter des champs personnalisés au token
        token['role'] = user.role
        token['username'] = user.username

        return token
