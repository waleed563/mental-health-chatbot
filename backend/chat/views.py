from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    SendMessageSerializer
)
from .n8n_service import N8NService


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversation_list_create_view(request):
    """
    GET: List all conversations for the logged-in user
    POST: Create a new conversation
    """
    
    try:
        if request.method == 'GET':
            # Get all conversations for this user
            conversations = Conversation.objects.filter(
                user=request.user, 
                is_archived=False
            )
            serializer = ConversationSerializer(conversations, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Create new conversation
            title = request.data.get('title', '')
            
            conversation = Conversation.objects.create(
                user=request.user,
                title=title
            )
            
            serializer = ConversationSerializer(conversation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        # Log the error for debugging
        import traceback
        print("Error in conversation_list_create_view:")
        print(traceback.format_exc())
        
        return Response({
            'error': 'Failed to process request',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def conversation_detail_view(request, conversation_id):
    """
    GET: Get conversation details with all messages
    DELETE: Delete a conversation
    """
    
    try:
        # Get conversation and ensure it belongs to the user
        conversation = get_object_or_404(
            Conversation,
            id=conversation_id,
            user=request.user
        )
        
        if request.method == 'GET':
            serializer = ConversationDetailSerializer(conversation)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'DELETE':
            conversation.delete()
            return Response({
                'message': 'Conversation deleted successfully'
            }, status=status.HTTP_200_OK)
    
    except Conversation.DoesNotExist:
        return Response({
            'error': 'Conversation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        import traceback
        print("Error in conversation_detail_view:")
        print(traceback.format_exc())
        
        return Response({
            'error': 'Failed to process request',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message_view(request, conversation_id):
    """
    POST: Send a message in a conversation and get bot response
    """
    
    try:
        # Get conversation and ensure it belongs to the user
        conversation = get_object_or_404(
            Conversation,
            id=conversation_id,
            user=request.user
        )
        
        # Validate message
        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        message_text = serializer.validated_data['message_text']
        
        # Save user message
        user_message = Message.objects.create(
            conversation=conversation,
            sender_type='user',
            message_text=message_text
        )
        
        # Get conversation history (last 10 messages before this one)
        previous_messages = conversation.messages.exclude(
            id=user_message.id
        ).order_by('-created_at')[:10]
        
        conversation_history = N8NService.format_conversation_history(
            previous_messages
        )
        
        # Send to N8N
        n8n_response = N8NService.send_message_to_n8n(
            user_id=request.user.id,
            conversation_id=conversation.id,
            current_message=message_text,
            conversation_history=conversation_history
        )
        
        # Save bot response
        bot_message = Message.objects.create(
            conversation=conversation,
            sender_type='bot',
            message_text=n8n_response['bot_response'],
            n8n_metadata=n8n_response.get('metadata', {})
        )
        
        # Return both messages
        return Response({
            'user_message': MessageSerializer(user_message).data,
            'bot_message': MessageSerializer(bot_message).data,
            'n8n_success': n8n_response['success']
        }, status=status.HTTP_201_CREATED)
    
    except Conversation.DoesNotExist:
        return Response({
            'error': 'Conversation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        import traceback
        print("Error in send_message_view:")
        print(traceback.format_exc())
        
        return Response({
            'error': 'Failed to send message',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversation_messages_view(request, conversation_id):
    """
    GET: Get all messages in a conversation
    """
    
    try:
        # Get conversation and ensure it belongs to the user
        conversation = get_object_or_404(
            Conversation,
            id=conversation_id,
            user=request.user
        )
        
        # Get all messages
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Conversation.DoesNotExist:
        return Response({
            'error': 'Conversation not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    except Exception as e:
        import traceback
        print("Error in conversation_messages_view:")
        print(traceback.format_exc())
        
        return Response({
            'error': 'Failed to get messages',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)