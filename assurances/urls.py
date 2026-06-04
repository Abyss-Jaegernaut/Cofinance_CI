from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProduitAssuranceViewSet, SouscriptionAssuranceViewSet

router = DefaultRouter()
router.register(r'produits-assurance', ProduitAssuranceViewSet, basename='produit-assurance')
router.register(r'souscriptions', SouscriptionAssuranceViewSet, basename='souscription')

urlpatterns = [
    path('', include(router.urls)),
]
