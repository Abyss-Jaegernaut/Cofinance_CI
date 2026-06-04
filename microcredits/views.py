from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DemandeCredit
from .serializers import DemandeCreditSerializer

class DemandeCreditViewSet(viewsets.ModelViewSet):
    serializer_class = DemandeCreditSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return DemandeCredit.objects.all().order_by('-created_at')
        return DemandeCredit.objects.filter(client=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(client=self.request.user, statut='SOUMISE')

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        if request.user.role not in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return Response({'detail': "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        
        demande = self.get_object()
        if demande.statut != 'SOUMISE' and demande.statut != 'EN_ANALYSE':
            return Response({'detail': f"Impossible d'approuver une demande au statut {demande.statut}."}, status=status.HTTP_400_BAD_REQUEST)
            
        demande.statut = 'APPROUVEE'
        demande.save()
        return Response({'status': 'Demande approuvée avec succès.'})

    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        if request.user.role not in ['AGENT_TERRAIN', 'ADMINISTRATEUR']:
            return Response({'detail': "Non autorisé."}, status=status.HTTP_403_FORBIDDEN)
        
        demande = self.get_object()
        if demande.statut in ['DECAISSEE']:
            return Response({'detail': "Impossible de rejeter une demande déjà décaissée."}, status=status.HTTP_400_BAD_REQUEST)
            
        demande.statut = 'REJETEE'
        demande.save()
        return Response({'status': 'Demande rejetée.'})

