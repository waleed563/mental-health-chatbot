from django.shortcuts import render, redirect
from django.views.decorators.csrf import ensure_csrf_cookie


def landing_page(request):
    """Landing page - shown when user is not logged in"""
    return render(request, 'landing.html')


def register_page(request):
    """Registration page"""
    return render(request, 'register.html')


def login_page(request):
    """Login page"""
    return render(request, 'login.html')


@ensure_csrf_cookie
def chat_page(request):
    """Main chat interface - requires login"""
    return render(request, 'chat.html')