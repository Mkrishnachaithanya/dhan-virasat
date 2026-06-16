import hashlib
import base64
from django.conf import settings
from cryptography.fernet import Fernet

_fernet = None

def get_fernet():
    global _fernet
    if _fernet is None:
        # Derive a 32-byte url-safe base64 key from settings.SECRET_KEY
        secret = settings.SECRET_KEY
        hashed = hashlib.sha256(secret.encode('utf-8')).digest()
        key = base64.urlsafe_b64encode(hashed)
        _fernet = Fernet(key)
    return _fernet

def encrypt_value(text):
    if not text:
        return text
    try:
        f = get_fernet()
        return f.encrypt(text.encode('utf-8')).decode('utf-8')
    except Exception as e:
        print(f"Encryption error: {e}")
        return text

def decrypt_value(encrypted_text):
    if not encrypted_text:
        return encrypted_text
    try:
        f = get_fernet()
        return f.decrypt(encrypted_text.encode('utf-8')).decode('utf-8')
    except Exception:
        # Fallback to returning original text if decryption fails (e.g. unencrypted legacy data)
        return encrypted_text
