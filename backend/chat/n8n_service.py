import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class N8NService:
    """Service to communicate with N8N webhook"""
    
    @staticmethod
    def send_message_to_n8n(user_id, conversation_id, current_message, conversation_history):
        """
        Send message and conversation history to N8N
        
        Args:
            user_id: ID of the user
            conversation_id: ID of the conversation
            current_message: The new message from user
            conversation_history: List of previous messages
            
        Returns:
            dict: Response from N8N with bot message
        """
        
        payload = {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "current_message": current_message,
            "conversation_history": conversation_history
        }
        
        logger.info(f"Sending to N8N: {settings.N8N_WEBHOOK_URL}")
        logger.info(f"Payload: {payload}")
        
        try:
            response = requests.post(
                settings.N8N_WEBHOOK_URL,
                json=payload,
                timeout=30
            )
            
            logger.info(f"N8N Status Code: {response.status_code}")
            logger.info(f"N8N Response Text: {response.text}")
            
            response.raise_for_status()
            
            # Parse response
            data = response.json()
            logger.info(f"N8N Parsed Data: {data}")
            
            # Handle different response formats
            bot_response = None
            metadata = {}
            
            # Case 1: Direct object with bot_response
            if isinstance(data, dict) and 'bot_response' in data:
                bot_response = data['bot_response']
                metadata = data.get('metadata', {})
            
            # Case 2: Array with first item containing bot_response
            elif isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], dict) and 'bot_response' in data[0]:
                    bot_response = data[0]['bot_response']
                    metadata = data[0].get('metadata', {})
            
            # Case 3: Nested in 'json' key
            elif isinstance(data, dict) and 'json' in data:
                if 'bot_response' in data['json']:
                    bot_response = data['json']['bot_response']
                    metadata = data['json'].get('metadata', {})
            
            # Fallback
            if not bot_response:
                logger.error(f"Could not extract bot_response from: {data}")
                bot_response = "I apologize, but I couldn't process that properly."
            
            return {
                'success': True,
                'bot_response': bot_response,
                'metadata': metadata
            }
            
        except requests.exceptions.Timeout:
            logger.error(f"N8N timeout")
            return {
                'success': False,
                'bot_response': 'I apologize, the response is taking too long. Please try again.',
                'metadata': {'error': 'timeout'}
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"N8N request failed: {str(e)}")
            return {
                'success': False,
                'bot_response': 'I apologize, but I am having trouble connecting right now. Please try again in a moment.',
                'metadata': {'error': str(e)}
            }
            
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'bot_response': 'I apologize, but something went wrong. Please try again.',
                'metadata': {'error': str(e)}
            }
    
    @staticmethod
    def format_conversation_history(messages, limit=10):
        """
        Format messages for N8N
        
        Args:
            messages: QuerySet of Message objects
            limit: Maximum number of messages to include
            
        Returns:
            list: Formatted conversation history
        """
        
        history = []
        
        # Convert QuerySet to list and reverse to get chronological order
        message_list = list(messages[:limit])
        message_list.reverse()
        
        for message in message_list:
            history.append({
                'sender': message.sender_type,
                'text': message.message_text,
                'timestamp': message.created_at.isoformat()
            })
        
        return history