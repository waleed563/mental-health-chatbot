from rest_framework import serializers
from .models import Conversation, Message
from django.contrib.auth import get_user_model

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model"""
    
    class Meta:
        model = Message
        fields = ('id', 'conversation', 'sender_type', 'message_text', 'created_at', 'n8n_metadata')
        read_only_fields = ('id', 'created_at')


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for Conversation model"""
    
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ('id', 'user', 'title', 'created_at', 'updated_at', 'is_archived', 'message_count', 'last_message')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')
    
    def get_message_count(self, obj):
        """Get total number of messages in conversation"""
        return obj.messages.count()
    
    def get_last_message(self, obj):
        """Get the last message preview"""
        last_message = obj.messages.last()
        if last_message:
            return {
                'text': last_message.message_text[:100],
                'sender': last_message.sender_type,
                'timestamp': last_message.created_at
            }
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with all messages"""
    
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ('id', 'user', 'title', 'created_at', 'updated_at', 'is_archived', 'messages')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending a message"""
    
    message_text = serializers.CharField(required=True, max_length=5000)
    
    def validate_message_text(self, value):
        """Validate message is not empty"""
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty")
        return value.strip()