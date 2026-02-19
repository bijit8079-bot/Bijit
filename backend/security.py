"""
Security Module - Multi-layer defense system
"""
import re
import bleach
import validators
from typing import Optional
from datetime import datetime, timezone
import hashlib
import secrets

# Input Validation & Sanitization
class InputValidator:
    """Validates and sanitizes user inputs"""
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = 500) -> str:
        """Remove dangerous characters and limit length"""
        if not text:
            return ""
        # Remove HTML tags and dangerous characters
        cleaned = bleach.clean(text, tags=[], strip=True)
        # Limit length
        return cleaned[:max_length].strip()
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not email or len(email) > 254:
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number"""
        if not phone:
            return False
        # Remove spaces and special chars
        cleaned = re.sub(r'[^\d]', '', phone)
        # Should be 10-15 digits
        return 10 <= len(cleaned) <= 15
    
    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        """
        Validate password strength
        Returns: (is_valid, error_message)
        """
        if not password:
            return False, "Password is required"
        if len(password) < 8:
            return False, "Password must be at least 8 characters"
        if len(password) > 128:
            return False, "Password too long"
        if not re.search(r'[A-Za-z]', password):
            return False, "Password must contain at least one letter"
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        return True, ""
    
    @staticmethod
    def validate_name(name: str) -> bool:
        """Validate name format"""
        if not name or len(name) < 2 or len(name) > 100:
            return False
        # Only letters, spaces, hyphens, apostrophes
        return bool(re.match(r"^[a-zA-Z\s'-]+$", name))
    
    @staticmethod
    def validate_file_upload(filename: str, content_type: str, max_size_mb: int = 5) -> tuple[bool, str]:
        """Validate file uploads"""
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        
        if not filename:
            return False, "No filename provided"
        
        # Check extension
        ext = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
        if ext not in allowed_extensions:
            return False, "Invalid file type. Only JPG, PNG, WEBP allowed"
        
        # Check content type
        if content_type not in allowed_types:
            return False, "Invalid content type"
        
        return True, ""

# Rate Limiting Configuration
class RateLimitConfig:
    """Rate limiting configuration"""
    
    # Requests per minute for different endpoints
    LOGIN_LIMIT = "5/minute"  # 5 login attempts per minute
    REGISTER_LIMIT = "3/minute"  # 3 registrations per minute
    API_LIMIT = "60/minute"  # 60 API calls per minute
    PAYMENT_LIMIT = "10/minute"  # 10 payment operations per minute
    
    @staticmethod
    def get_identifier(request) -> str:
        """Get unique identifier for rate limiting"""
        # Use IP address as identifier
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0]
        return request.client.host

# Security Headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}

# Password Hashing Configuration
PASSWORD_HASH_ROUNDS = 12  # Increased from default 10

# Session Security
SESSION_TIMEOUT_MINUTES = 60
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30

# Data Encryption
class DataEncryption:
    """Handles sensitive data encryption"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_data(data: str) -> str:
        """One-way hash for sensitive data"""
        return hashlib.sha256(data.encode()).hexdigest()

# Audit Logging
class AuditLogger:
    """Security audit logging"""
    
    @staticmethod
    def log_login_attempt(user_id: str, success: bool, ip_address: str):
        """Log login attempts"""
        status = "SUCCESS" if success else "FAILED"
        timestamp = datetime.now(timezone.utc).isoformat()
        print(f"[AUDIT] {timestamp} - LOGIN {status} - User: {user_id} - IP: {ip_address}")
    
    @staticmethod
    def log_data_access(user_id: str, action: str, resource: str, ip_address: str):
        """Log data access"""
        timestamp = datetime.now(timezone.utc).isoformat()
        print(f"[AUDIT] {timestamp} - DATA ACCESS - User: {user_id} - Action: {action} - Resource: {resource} - IP: {ip_address}")
    
    @staticmethod
    def log_security_event(event_type: str, details: str, ip_address: str):
        """Log security events"""
        timestamp = datetime.now(timezone.utc).isoformat()
        print(f"[SECURITY] {timestamp} - {event_type} - {details} - IP: {ip_address}")

# SQL/NoSQL Injection Prevention
class QuerySanitizer:
    """Prevent injection attacks"""
    
    @staticmethod
    def sanitize_mongodb_query(value: str) -> str:
        """Sanitize MongoDB query values"""
        if not value:
            return ""
        # Remove MongoDB operators
        dangerous_patterns = ['$', '{', '}', '[', ']']
        sanitized = value
        for pattern in dangerous_patterns:
            sanitized = sanitized.replace(pattern, '')
        return sanitized.strip()
    
    @staticmethod
    def validate_uuid(uuid_string: str) -> bool:
        """Validate UUID format"""
        uuid_pattern = r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        return bool(re.match(uuid_pattern, uuid_string.lower()))
