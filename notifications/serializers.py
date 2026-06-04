from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'utilisateur', 'message', 'type_alerte', 'est_lue', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
