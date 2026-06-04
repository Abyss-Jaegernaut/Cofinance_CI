from rest_framework import viewsets
from .models import DemandeCredit
from .serializers import DemandeCreditSerializer

class DemandeCreditViewSet(viewsets.ModelViewSet):
    queryset = DemandeCredit.objects.all().order_by('-created_at')
    serializer_class = DemandeCreditSerializer

