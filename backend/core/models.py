from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .encryption import encrypt_value, decrypt_value

class UserProfile(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Pending Verification', 'Pending Verification'),
        ('Deceased', 'Deceased'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    last_check_in = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Active')
    otp_code = models.CharField(max_length=6, null=True, blank=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    login_otp_code = models.CharField(max_length=6, null=True, blank=True)
    login_otp_created_at = models.DateTimeField(null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True, default='')
    bio = models.TextField(blank=True, default='')


    def __str__(self):
        return f"{self.user.username} Profile - Status: {self.status}"

class Nominee(models.Model):
    RELATIONSHIP_CHOICES = [
        ('Spouse', 'Spouse'),
        ('Child', 'Child'),
        ('Parent', 'Parent'),
        ('Sibling', 'Sibling'),
        ('Friend', 'Friend'),
        ('Other', 'Other'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='nominees')
    name = models.CharField(max_length=200)
    email = models.CharField(max_length=500) # Increased max_length since encrypted strings are longer
    relationship = models.CharField(max_length=100, choices=RELATIONSHIP_CHOICES, default='Other')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('owner', 'email')

    def save(self, *args, **kwargs):
        # Encrypt email before saving
        if self.email and not self.email.startswith('gAAAA'):
            self.email = encrypt_value(self.email)
        super().save(*args, **kwargs)
        # Decrypt for in-memory use immediately
        self.email = decrypt_value(self.email)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        if 'email' in field_names:
            instance.email = decrypt_value(instance.email)
        return instance

    def __str__(self):
        return f"{self.name} ({self.relationship}) - Owner: {self.owner.username}"

class Asset(models.Model):
    ASSET_TYPE_CHOICES = [
        ('Bank', 'Bank'),
        ('Stock', 'Stock'),
        ('Crypto', 'Crypto'),
        ('Email', 'Email'),
        ('Document', 'Document'),
        ('Other', 'Other'),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assets')
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=50, choices=ASSET_TYPE_CHOICES, default='Other')
    platform = models.CharField(max_length=200, help_text="e.g. Chase Bank, Coinbase, Gmail")
    description = models.TextField(blank=True, null=True) # Will hold Fernet encrypted values
    
    # Priority Nominees (Primary = Nominee 1, Secondary = Nominee 2)
    primary_nominee = models.ForeignKey(
        Nominee, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='primary_assets'
    )
    secondary_nominee = models.ForeignKey(
        Nominee, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='secondary_assets'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Encrypt description before saving
        if self.description and not self.description.startswith('gAAAA'):
            self.description = encrypt_value(self.description)
        super().save(*args, **kwargs)
        # Decrypt for in-memory use immediately
        self.description = decrypt_value(self.description)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        if 'description' in field_names:
            instance.description = decrypt_value(instance.description)
        return instance

    def __str__(self):
        return f"{self.name} [{self.type}] - Owner: {self.owner.username}"

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action_type = models.CharField(max_length=50) # CREATE, UPDATE, DELETE, CHECKIN, SECURITY
    entity = models.CharField(max_length=100) # Asset, Nominee, UserProfile, Auth
    details = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        username = self.user.username if self.user else "System"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {username} - {self.action_type} on {self.entity}: {self.details}"
