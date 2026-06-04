from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DemandeCreditViewSet

router = DefaultRouter()
router.register(r'microcredits', DemandeCreditViewSet, basename='microcredit')

urlpatterns = [
    path('', include(router.urls)),
]
