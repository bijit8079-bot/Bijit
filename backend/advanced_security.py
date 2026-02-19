"""
Advanced Security Module - Enterprise-Grade Protection
"""
import hmac
import hashlib
import secrets
import re
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import json

# Advanced Security Configuration
class AdvancedSecurityConfig:
    """Advanced security settings"""
    
    # Token Security
    TOKEN_ROTATION_HOURS = 12
    REFRESH_TOKEN_DAYS = 7
    MAX_ACTIVE_SESSIONS_PER_USER = 3
    
    # Brute Force Protection
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    MAX_FAILED_REQUESTS_PER_IP = 50
    IP_BLACKLIST_DURATION_HOURS = 24
    
    # Request Security
    MAX_REQUEST_SIZE_MB = 10
    ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    MAX_UPLOAD_SIZE_MB = 5
    
    # API Security
    REQUIRE_REQUEST_SIGNATURE = True
    API_KEY_HEADER = "X-API-Key"
    REQUEST_TIMEOUT_SECONDS = 30
    
    # Session Security
    SESSION_ROTATION_MINUTES = 30
    REQUIRE_IP_CONSISTENCY = True
    REQUIRE_USER_AGENT_CONSISTENCY = True

# Token Blacklist (In-memory - should be Redis in production)
class TokenBlacklist:
    """Manage blacklisted tokens"""
    _blacklist = set()
    _blacklist_timestamps = {}
    
    @classmethod
    def add(cls, token: str, expiry: datetime):
        """Add token to blacklist"""
        cls._blacklist.add(token)
        cls._blacklist_timestamps[token] = expiry
        cls._cleanup_expired()
    
    @classmethod
    def is_blacklisted(cls, token: str) -> bool:
        """Check if token is blacklisted"""
        cls._cleanup_expired()
        return token in cls._blacklist
    
    @classmethod
    def _cleanup_expired(cls):
        """Remove expired tokens from blacklist"""
        now = datetime.now(timezone.utc)
        expired = [token for token, exp in cls._blacklist_timestamps.items() if exp < now]
        for token in expired:
            cls._blacklist.discard(token)
            cls._blacklist_timestamps.pop(token, None)

# IP-based Attack Detection
class IPSecurityMonitor:
    """Monitor and block malicious IPs"""
    _failed_attempts = defaultdict(list)
    _blacklisted_ips = {}
    
    @classmethod
    def record_failed_attempt(cls, ip: str):
        """Record failed attempt from IP"""
        now = datetime.now(timezone.utc)
        cls._failed_attempts[ip].append(now)
        
        # Clean old attempts (last hour)
        cls._failed_attempts[ip] = [
            t for t in cls._failed_attempts[ip] 
            if now - t < timedelta(hours=1)
        ]
        
        # Check if should blacklist
        if len(cls._failed_attempts[ip]) > AdvancedSecurityConfig.MAX_FAILED_REQUESTS_PER_IP:
            cls._blacklisted_ips[ip] = now + timedelta(hours=AdvancedSecurityConfig.IP_BLACKLIST_DURATION_HOURS)
    
    @classmethod
    def is_blacklisted(cls, ip: str) -> bool:
        """Check if IP is blacklisted"""
        if ip in cls._blacklisted_ips:
            if datetime.now(timezone.utc) < cls._blacklisted_ips[ip]:
                return True
            else:
                del cls._blacklisted_ips[ip]
        return False
    
    @classmethod
    def get_failed_attempts(cls, ip: str) -> int:
        """Get number of failed attempts from IP"""
        now = datetime.now(timezone.utc)
        cls._failed_attempts[ip] = [
            t for t in cls._failed_attempts[ip] 
            if now - t < timedelta(hours=1)
        ]
        return len(cls._failed_attempts[ip])

# Request Signature Verification
class RequestSignature:
    """Verify request signatures to prevent tampering"""
    
    @staticmethod
    def generate_signature(data: str, secret: str) -> str:
        """Generate HMAC signature for request"""
        return hmac.new(
            secret.encode(),
            data.encode(),
            hashlib.sha256
        ).hexdigest()
    
    @staticmethod
    def verify_signature(data: str, signature: str, secret: str) -> bool:
        """Verify request signature"""
        expected = RequestSignature.generate_signature(data, secret)
        return hmac.compare_digest(expected, signature)

# Advanced Input Validation
class AdvancedInputValidator:
    """Enhanced input validation with security focus"""
    
    @staticmethod
    def validate_no_script_injection(text: str) -> bool:
        """Check for script injection attempts"""
        dangerous_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'onerror\s*=',
            r'onload\s*=',
            r'eval\s*\(',
            r'expression\s*\(',
            r'vbscript:',
            r'<iframe',
            r'<object',
            r'<embed',
        ]
        
        text_lower = text.lower()
        for pattern in dangerous_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return False
        return True
    
    @staticmethod
    def validate_no_sql_injection(text: str) -> bool:
        """Check for SQL/NoSQL injection attempts"""
        dangerous_patterns = [
            r'\$where',
            r'\$gt',
            r'\$lt',
            r'\$ne',
            r'\$or',
            r'\$and',
            r'union\s+select',
            r'drop\s+table',
            r'delete\s+from',
            r'insert\s+into',
            r'update\s+.*set',
            r'--',
            r';--',
            r'\/\*',
            r'\*\/',
        ]
        
        text_lower = text.lower()
        for pattern in dangerous_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return False
        return True
    
    @staticmethod
    def validate_no_path_traversal(text: str) -> bool:
        """Check for path traversal attempts"""
        dangerous_patterns = [
            r'\.\.',
            r'\.\/\.\./',
            r'\.\\\.\\',
            r'%2e%2e',
            r'%252e%252e',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return False
        return True
    
    @staticmethod
    def validate_secure_input(text: str) -> tuple[bool, str]:
        """Comprehensive input validation"""
        if not AdvancedInputValidator.validate_no_script_injection(text):
            return False, "Potential XSS attack detected"
        
        if not AdvancedInputValidator.validate_no_sql_injection(text):
            return False, "Potential SQL/NoSQL injection detected"
        
        if not AdvancedInputValidator.validate_no_path_traversal(text):
            return False, "Potential path traversal attack detected"
        
        return True, ""

# Session Security Manager
class SessionSecurityManager:
    """Manage secure sessions with consistency checks"""
    _sessions = {}
    
    @classmethod
    def create_session(cls, user_id: str, ip: str, user_agent: str) -> str:
        """Create secure session"""
        session_id = secrets.token_urlsafe(32)
        cls._sessions[session_id] = {
            'user_id': user_id,
            'ip': ip,
            'user_agent': user_agent,
            'created_at': datetime.now(timezone.utc),
            'last_activity': datetime.now(timezone.utc)
        }
        return session_id
    
    @classmethod
    def validate_session(cls, session_id: str, ip: str, user_agent: str) -> tuple[bool, str]:
        """Validate session with consistency checks"""
        if session_id not in cls._sessions:
            return False, "Invalid session"
        
        session = cls._sessions[session_id]
        
        # Check IP consistency
        if AdvancedSecurityConfig.REQUIRE_IP_CONSISTENCY:
            if session['ip'] != ip:
                return False, "IP address mismatch - potential session hijacking"
        
        # Check user agent consistency
        if AdvancedSecurityConfig.REQUIRE_USER_AGENT_CONSISTENCY:
            if session['user_agent'] != user_agent:
                return False, "User agent mismatch - potential session hijacking"
        
        # Update last activity
        session['last_activity'] = datetime.now(timezone.utc)
        
        return True, ""

# Content Security Policy Generator
class CSPGenerator:
    """Generate Content Security Policy headers"""
    
    @staticmethod
    def generate_strict_csp() -> str:
        """Generate strict CSP policy"""
        policies = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",  # React needs unsafe-inline
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: https: blob:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests"
        ]
        return "; ".join(policies)

# Anti-Automation Detection
class AntiAutomationDetector:
    """Detect and block automated attacks"""
    _request_patterns = defaultdict(list)
    
    @classmethod
    def record_request(cls, ip: str, endpoint: str):
        """Record request pattern"""
        now = datetime.now(timezone.utc)
        cls._request_patterns[ip].append({
            'endpoint': endpoint,
            'timestamp': now
        })
        
        # Keep only last hour
        cls._request_patterns[ip] = [
            r for r in cls._request_patterns[ip]
            if now - r['timestamp'] < timedelta(hours=1)
        ]
    
    @classmethod
    def is_suspicious_pattern(cls, ip: str) -> bool:
        """Detect suspicious automation patterns"""
        if ip not in cls._request_patterns:
            return False
        
        requests = cls._request_patterns[ip]
        
        # Check for rapid sequential requests (bot-like behavior)
        if len(requests) > 100:  # More than 100 requests in an hour
            timestamps = [r['timestamp'] for r in requests[-10:]]
            if len(timestamps) >= 2:
                time_diffs = [
                    (timestamps[i+1] - timestamps[i]).total_seconds()
                    for i in range(len(timestamps)-1)
                ]
                avg_diff = sum(time_diffs) / len(time_diffs)
                if avg_diff < 1:  # Less than 1 second between requests
                    return True
        
        return False

# Security Event Logger
class SecurityEventLogger:
    """Log security events for monitoring"""
    
    @staticmethod
    def log_security_event(event_type: str, severity: str, details: Dict[str, Any], ip: str):
        """Log security event with details"""
        timestamp = datetime.now(timezone.utc).isoformat()
        log_entry = {
            'timestamp': timestamp,
            'event_type': event_type,
            'severity': severity,
            'ip': ip,
            'details': details
        }
        
        # In production, send to security monitoring system
        print(f"[SECURITY-{severity}] {timestamp} - {event_type} - IP: {ip} - {json.dumps(details)}")
        
        # Critical events should trigger alerts
        if severity == "CRITICAL":
            SecurityEventLogger._trigger_alert(log_entry)
    
    @staticmethod
    def _trigger_alert(log_entry: Dict[str, Any]):
        """Trigger alert for critical security events"""
        # In production: send email, SMS, or push notification
        print(f"🚨 CRITICAL SECURITY ALERT: {log_entry}")

# Password Strength Enforcer
class PasswordStrengthEnforcer:
    """Enforce strong password policies"""
    
    @staticmethod
    def check_password_strength(password: str) -> tuple[bool, str, int]:
        """
        Check password strength
        Returns: (is_strong, message, strength_score)
        Score: 0-100
        """
        score = 0
        feedback = []
        
        # Length check
        if len(password) >= 12:
            score += 25
        elif len(password) >= 8:
            score += 15
        else:
            feedback.append("Password should be at least 12 characters")
        
        # Complexity checks
        if re.search(r'[a-z]', password):
            score += 15
        else:
            feedback.append("Add lowercase letters")
        
        if re.search(r'[A-Z]', password):
            score += 15
        else:
            feedback.append("Add uppercase letters")
        
        if re.search(r'\d', password):
            score += 15
        else:
            feedback.append("Add numbers")
        
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 15
        else:
            feedback.append("Add special characters")
        
        # No common patterns
        common_patterns = ['123', 'abc', 'qwerty', 'password', 'admin']
        if not any(pattern in password.lower() for pattern in common_patterns):
            score += 15
        else:
            feedback.append("Avoid common patterns")
        
        is_strong = score >= 70
        message = " | ".join(feedback) if feedback else "Strong password"
        
        return is_strong, message, score
