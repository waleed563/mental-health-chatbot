from django.db import models
from django.conf import settings
from datetime import datetime


class Conversation(models.Model):
    """Model for storing user conversations"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    title = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'
    
    def __str__(self):
        return f"{self.user.email} - {self.title or f'Conversation {self.id}'}"
    
    def save(self, *args, **kwargs):
        """Auto-generate title if not provided"""
        if not self.title:
            now = datetime.now()
            self.title = f"Conversation {now.strftime('%b %d, %Y')}"
        super().save(*args, **kwargs)


class Message(models.Model):
    """Model for storing individual messages"""
    
    SENDER_CHOICES = (
        ('user', 'User'),
        ('bot', 'Bot'),
    )
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender_type = models.CharField(max_length=10, choices=SENDER_CHOICES)
    message_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    n8n_metadata = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
    
    def __str__(self):
        return f"{self.sender_type}: {self.message_text[:50]}..."