import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Conversation, Message

Utilisateur = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        
        # Refuser si l'utilisateur n'est pas authentifié
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # Vérifier si l'utilisateur a le droit d'accéder à cette conversation
        has_access = await self.check_conversation_access(self.user, self.conversation_id)
        if not has_access:
            await self.close()
            return

        self.room_group_name = f'chat_{self.conversation_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')

        if message:
            # L'ID de l'utilisateur est forcé depuis le token, anti-usurpation !
            user_id = self.user.id
            
            # Sauvegarder en base de données de manière asynchrone
            saved_message = await self.save_message(user_id, self.conversation_id, message)
            
            if saved_message:
                # Envoyer le message au groupe
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'user_id': user_id,
                        'username': self.user.username
                    }
                )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        user_id = event['user_id']
        username = event.get('username', '')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'user_id': user_id,
            'username': username
        }))

    @database_sync_to_async
    def check_conversation_access(self, user, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            if user.role == 'CLIENT':
                return conversation.client.id == user.id
            return True
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, user_id, conversation_id, contenu):
        try:
            user = Utilisateur.objects.get(id=user_id)
            conversation = Conversation.objects.get(id=conversation_id)
            return Message.objects.create(
                conversation=conversation,
                expediteur=user,
                contenu=contenu
            )
        except (Utilisateur.DoesNotExist, Conversation.DoesNotExist):
            return None
