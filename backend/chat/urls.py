from django.urls import path
from .views import (
    conversation_list_create_view,
    conversation_detail_view,
    send_message_view,
    conversation_messages_view
)

urlpatterns = [
    path('conversations/', conversation_list_create_view, name='conversation-list-create'),
    path('conversations/<int:conversation_id>/', conversation_detail_view, name='conversation-detail'),
    path('conversations/<int:conversation_id>/messages/', conversation_messages_view, name='conversation-messages'),
    path('conversations/<int:conversation_id>/send/', send_message_view, name='send-message'),
]