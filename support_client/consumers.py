import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Conversation, Message

Utilisateur = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')
        user_id = text_data_json.get('user_id', None)

        if message and user_id:
            # Sauvegarder en base de données de manière asynchrone
            saved_message = await self.save_message(user_id, self.conversation_id, message)
            
            # Envoyer le message au groupe
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'user_id': user_id,
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        user_id = event['user_id']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'user_id': user_id,
        }))

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
