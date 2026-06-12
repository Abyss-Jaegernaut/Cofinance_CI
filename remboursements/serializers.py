from rest_framework import serializers
from .models import Echeancier, Paiement

class EcheancierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Echeancier
        fields = ['id', 'demande_credit', 'date_echeance', 'montant_attendu', 'penalite_retard', 'statut', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class PaiementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = ['id', 'echeancier', 'montant_paye', 'agent_validateur', 'created_at', 'updated_at']
        read_only_fields = ['id', 'agent_validateur', 'created_at', 'updated_at']
