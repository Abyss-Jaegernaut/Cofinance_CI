from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Echeancier, Paiement
from .serializers import EcheancierSerializer, PaiementSerializer

class RoleBasedPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        # Authenticated users can access
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Clients can only read, BUT they can POST to make a payment
        if request.user.role == 'CLIENT' and request.method not in permissions.SAFE_METHODS:
            # Allow POST for PaiementViewSet (basename='paiement' or checking view class)
            if hasattr(view, 'get_serializer_class') and 'Paiement' in view.get_serializer_class().__name__ and request.method == 'POST':
                return True
            return False
            
        return True

class EcheancierViewSet(viewsets.ModelViewSet):
    serializer_class = EcheancierSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return Echeancier.objects.all().order_by('date_echeance')
        return Echeancier.objects.filter(demande_credit__client=user).order_by('date_echeance')

class PaiementViewSet(viewsets.ModelViewSet):
    serializer_class = PaiementSerializer
    permission_classes = [permissions.IsAuthenticated, RoleBasedPermission]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return Paiement.objects.all().order_by('-created_at')
        return Paiement.objects.filter(echeancier__demande_credit__client=user).order_by('-created_at')

    def perform_create(self, serializer):
        # L'agent est automatiquement celui qui fait la requête si ce n'est pas un client
        agent = self.request.user if self.request.user.role != 'CLIENT' else None
        paiement = serializer.save(agent_validateur=agent)
        
        # Mise à jour automatique de l'échéancier lié
        echeancier = paiement.echeancier
        echeancier.statut = 'PAYE'
        echeancier.save()

        from notifications.models import Notification
        Notification.objects.create(
            utilisateur=echeancier.demande_credit.client,
            type_alerte='PAIEMENT',
            message=f"Un paiement de {paiement.montant_paye} FCFA a été enregistré avec succès pour votre crédit."
        )

