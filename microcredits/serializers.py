from rest_framework import serializers
from .models import DemandeCredit

class DemandeCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandeCredit
        fields = ['id', 'client', 'montant_demande', 'duree_mois', 'justificatifs', 'score_eligibilite', 'statut', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'score_eligibilite', 'statut', 'created_at', 'updated_at']
