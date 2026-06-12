from rest_framework import viewsets
from .models import ProduitAssurance, SouscriptionAssurance
from .serializers import ProduitAssuranceSerializer, SouscriptionAssuranceSerializer

class ProduitAssuranceViewSet(viewsets.ModelViewSet):
    queryset = ProduitAssurance.objects.all().order_by('nom')
    serializer_class = ProduitAssuranceSerializer

class SouscriptionAssuranceViewSet(viewsets.ModelViewSet):
    serializer_class = SouscriptionAssuranceSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_anonymous:
            return SouscriptionAssurance.objects.none()
        if user.role in ['ADMINISTRATEUR', 'AGENT_TERRAIN']:
            return SouscriptionAssurance.objects.all().order_by('-date_fin')
        return SouscriptionAssurance.objects.filter(client=user).order_by('-date_fin')

    def perform_create(self, serializer):
        from django.utils import timezone
        import datetime
        now = timezone.now().date()
        date_fin = now + datetime.timedelta(days=365) # par defaut 1 an
        souscription = serializer.save(client=self.request.user, date_debut=now, date_fin=date_fin, statut='ACTIVE')

        from notifications.models import Notification
        Notification.objects.create(
            utilisateur=self.request.user,
            type_alerte='ASSURANCE',
            message=f"Votre souscription à l'assurance {souscription.produit.nom} est confirmée et active."
        )

