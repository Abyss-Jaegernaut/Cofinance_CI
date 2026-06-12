from rest_framework import serializers
from .models import DemandeCredit

class DemandeCreditSerializer(serializers.ModelSerializer):
    client_details = serializers.SerializerMethodField()
    agent_analyse_details = serializers.SerializerMethodField()
    admin_approbation_details = serializers.SerializerMethodField()

    class Meta:
        model = DemandeCredit
        fields = ['id', 'client', 'client_details', 'montant_demande', 'duree_mois', 'motif', 'justificatifs', 'score_eligibilite', 'statut', 'note_decision', 'agent_analyse', 'agent_analyse_details', 'date_analyse', 'admin_approbation', 'admin_approbation_details', 'date_approbation', 'created_at', 'updated_at']
        read_only_fields = ['id', 'client', 'score_eligibilite', 'statut', 'agent_analyse', 'date_analyse', 'admin_approbation', 'date_approbation', 'created_at', 'updated_at']

    def get_client_details(self, obj):
        if obj.client:
            return {
                'id': obj.client.id,
                'username': obj.client.username,
                'first_name': obj.client.first_name,
                'last_name': obj.client.last_name,
                'telephone': obj.client.telephone,
                'role': obj.client.role,
            }
        return None

    def get_agent_analyse_details(self, obj):
        if obj.agent_analyse:
            return {'id': obj.agent_analyse.id, 'username': obj.agent_analyse.username}
        return None

    def get_admin_approbation_details(self, obj):
        if obj.admin_approbation:
            return {'id': obj.admin_approbation.id, 'username': obj.admin_approbation.username}
        return None
