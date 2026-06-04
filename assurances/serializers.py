from rest_framework import serializers
from .models import ProduitAssurance, SouscriptionAssurance

class ProduitAssuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduitAssurance
        fields = ['id', 'nom', 'description', 'prime_mensuelle', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class SouscriptionAssuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SouscriptionAssurance
        fields = ['id', 'client', 'produit', 'date_debut', 'date_fin', 'statut', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
