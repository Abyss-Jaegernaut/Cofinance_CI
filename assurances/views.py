from rest_framework import viewsets
from .models import ProduitAssurance, SouscriptionAssurance
from .serializers import ProduitAssuranceSerializer, SouscriptionAssuranceSerializer

class ProduitAssuranceViewSet(viewsets.ModelViewSet):
    queryset = ProduitAssurance.objects.all().order_by('nom')
    serializer_class = ProduitAssuranceSerializer

class SouscriptionAssuranceViewSet(viewsets.ModelViewSet):
    queryset = SouscriptionAssurance.objects.all().order_by('-date_fin')
    serializer_class = SouscriptionAssuranceSerializer

