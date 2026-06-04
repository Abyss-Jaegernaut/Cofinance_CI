from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EcheancierViewSet, PaiementViewSet

router = DefaultRouter()
router.register(r'echeanciers', EcheancierViewSet, basename='echeancier')
router.register(r'paiements', PaiementViewSet, basename='paiement')

urlpatterns = [
    path('', include(router.urls)),
]
