from rest_framework import viewsets
from .models import Echeancier, Paiement
from .serializers import EcheancierSerializer, PaiementSerializer

class EcheancierViewSet(viewsets.ModelViewSet):
    queryset = Echeancier.objects.all().order_by('date_echeance')
    serializer_class = EcheancierSerializer

class PaiementViewSet(viewsets.ModelViewSet):
    queryset = Paiement.objects.all().order_by('-created_at')
    serializer_class = PaiementSerializer

