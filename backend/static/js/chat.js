// Chat Page Script
let currentConversationId = null;
let conversations = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat page loaded');
    
    // Check if logged in
    if (!isLoggedIn()) {
        console.log('Not logged in, redirecting...');
        window.location.href = '/login/';
        return;
    }
    
    console.log('User is logged in, initializing chat...');
    initializeChat();
});

function initializeChat() {
    console.log('Initializing chat...');
    
    // Load initial data
    loadUserInfo();
    loadConversations();
    
    // Setup event listeners
    const newChatBtn = document.getElementById('new-chat-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('New chat button clicked');
            createNewConversation();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout button clicked');
            logout();
        });
    }
    
    if (messageForm) {
        messageForm.addEventListener('submit', sendMessage);
    }
    
    // Auto-resize textarea
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    console.log('Chat initialized successfully');
}

// Load user info
async function loadUserInfo() {
    const user = getUser();
    const userInfoEl = document.getElementById('user-info');
    
    if (user && userInfoEl) {
        userInfoEl.textContent = user.email;
    }
}

// Load conversations list
async function loadConversations() {
    console.log('Loading conversations...');
    
    try {
        conversations = await chatAPI.getConversations();
        console.log('Conversations loaded:', conversations.length);
        renderConversationsList();
        
        // Don't automatically load first conversation
        // Let user choose or start new chat
        if (conversations.length === 0) {
            showEmptyState();
        }
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

// Render conversations in sidebar
function renderConversationsList() {
    const conversationsList = document.getElementById('conversations-list');
    
    if (!conversationsList) return;
    
    if (conversations.length === 0) {
        conversationsList.innerHTML = '<p style="color: #8e8ea0; padding: 16px; text-align: center; font-size: 14px;">No conversations yet</p>';
        return;
    }
    
    conversationsList.innerHTML = conversations.map(conv => `
        <div class="conversation-item ${conv.id === currentConversationId ? 'active' : ''}" 
             data-id="${conv.id}"
             onclick="loadConversation(${conv.id})">
            <span class="conversation-title">${escapeHtml(conv.title)}</span>
            <button class="delete-conversation-btn" onclick="event.stopPropagation(); deleteConversation(${conv.id})">
                ✕
            </button>
        </div>
    `).join('');
}

// Create new conversation
async function createNewConversation() {
    console.log('Creating new conversation...');
    
    try {
        const newConv = await chatAPI.createConversation();
        console.log('New conversation created:', newConv);
        
        conversations.unshift(newConv);
        currentConversationId = newConv.id;
        
        renderConversationsList();
        
        // Clear messages and show empty chat
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        hideEmptyState();
        
        // Focus on input
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.focus();
        }
        
    } catch (error) {
        console.error('Failed to create conversation:', error);
        alert('Failed to create new conversation. Please try again.');
    }
}

// Load conversation messages
async function loadConversation(conversationId) {
    console.log('Loading conversation:', conversationId);
    currentConversationId = conversationId;
    
    try {
        const messages = await chatAPI.getMessages(conversationId);
        console.log('Messages loaded:', messages.length);
        
        renderMessages(messages);
        renderConversationsList();
        hideEmptyState();
        
    } catch (error) {
        console.error('Failed to load messages:', error);
        alert('Failed to load conversation');
    }
}

// Render messages
function renderMessages(messages) {
    const messagesContainer = document.getElementById('messages-container');
    
    if (!messagesContainer) return;
    
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        return;
    }
    
    // Add all messages
    messages.forEach(msg => {
        const time = new Date(msg.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format message text with line breaks
        let formattedText = escapeHtml(msg.message_text);
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        const messageHTML = `
            <div class="message ${msg.sender_type}">
                <div class="message-avatar">
                    ${msg.sender_type === 'user' ? 'U' : 'AI'}
                </div>
                <div class="message-content">
                    <p>${formattedText}</p>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    });
    
    scrollToBottom();
}

// Send message
async function sendMessage(e) {
    e.preventDefault();
    console.log('Sending message...');
    
    const messageInput = document.getElementById('message-input');
    
    if (!messageInput) return;
    
    const messageText = messageInput.value.trim();
    
    if (!messageText) return;
    
    // If no conversation is selected, create one first
    if (!currentConversationId) {
        console.log('No conversation selected, creating one...');
        await createNewConversation();
        // Wait a bit for conversation to be created
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Disable input
    setInputLoading(true);
    
    // Clear input immediately
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    try {
        // Add user message to UI FIRST
        addMessageToUI('user', messageText);
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to backend
        console.log('Calling API to send message...');
        const response = await chatAPI.sendMessage(currentConversationId, messageText);
        console.log('Response received:', response);
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add bot response to UI
        addMessageToUI('bot', response.bot_message.message_text);
        
        // Update sidebar without reloading entire conversation list
        updateConversationInSidebar(currentConversationId, messageText);
        
    } catch (error) {
        console.error('Failed to send message:', error);
        removeTypingIndicator();
        addMessageToUI('bot', 'Sorry, I encountered an error. Please try again.');
    } finally {
        setInputLoading(false);
        if (messageInput) {
            messageInput.focus();
        }
    }
}

// Add message to UI
function addMessageToUI(senderType, text) {
    const messagesContainer = document.getElementById('messages-container');
    
    if (!messagesContainer) return;
    
    // Hide empty state when first message is sent
    hideEmptyState();
    
    const time = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Format text with line breaks
    let formattedText = escapeHtml(text);
    formattedText = formattedText.replace(/\n/g, '<br>');
    // Convert numbered lists
    formattedText = formattedText.replace(/(\d+)\.\s/g, '<br>$1. ');
    
    const messageHTML = `
        <div class="message ${senderType}">
            <div class="message-avatar">
                ${senderType === 'user' ? 'U' : 'AI'}
            </div>
            <div class="message-content">
                <p>${formattedText}</p>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('messages-container');
    
    if (!messagesContainer) return;
    
    const typingHTML = `
        <div class="message bot" id="typing-indicator">
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Update conversation in sidebar (without full reload)
function updateConversationInSidebar(conversationId, lastMessage) {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
        // Update last message preview
        if (!conv.last_message) {
            conv.last_message = {};
        }
        conv.last_message.text = lastMessage.substring(0, 50);
        conv.message_count = (conv.message_count || 0) + 1;
        
        // Re-render sidebar without reloading messages
        renderConversationsList();
    }
}

// Delete conversation
async function deleteConversation(conversationId) {
    if (!confirm('Are you sure you want to delete this conversation?')) {
        return;
    }
    
    try {
        await chatAPI.deleteConversation(conversationId);
        
        // Remove from local array
        conversations = conversations.filter(c => c.id !== conversationId);
        
        // If deleted conversation was active, clear it
        if (currentConversationId === conversationId) {
            currentConversationId = null;
            const messagesContainer = document.getElementById('messages-container');
            
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            
            showEmptyState();
        }
        
        // Re-render list
        renderConversationsList();
        
    } catch (error) {
        console.error('Failed to delete conversation:', error);
        alert('Failed to delete conversation');
    }
}

// Logout
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            removeToken();
            removeUser();
            window.location.href = '/login/';
        } catch (error) {
            console.error('Logout error:', error);
            removeToken();
            removeUser();
            window.location.href = '/login/';
        }
    }
}

// Helper: Show empty state
function showEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'flex';
    }
}

// Helper: Hide empty state
function hideEmptyState() {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
}

// Helper: Set input loading state
function setInputLoading(loading) {
    const sendBtn = document.getElementById('send-btn');
    const sendText = document.getElementById('send-text');
    const sendSpinner = document.getElementById('send-spinner');
    const messageInput = document.getElementById('message-input');
    
    if (!sendBtn || !sendText || !sendSpinner || !messageInput) return;
    
    if (loading) {
        sendText.classList.add('hidden');
        sendSpinner.classList.remove('hidden');
        sendBtn.disabled = true;
        messageInput.disabled = true;
    } else {
        sendText.classList.remove('hidden');
        sendSpinner.classList.add('hidden');
        sendBtn.disabled = false;
        messageInput.disabled = false;
    }
}

// Helper: Scroll to bottom
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}