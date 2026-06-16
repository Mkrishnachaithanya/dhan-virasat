from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Asset, Nominee, UserProfile, ActivityLog

class NomineeSerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(source='primary_assets.count', read_only=True) # Count primary asset allocations
    assigned_assets = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Nominee
        fields = ['id', 'name', 'email', 'relationship', 'asset_count', 'assigned_assets', 'created_at']

    def get_assigned_assets(self, obj):
        # Return primary assets assigned to this nominee
        primary = [{'id': asset.id, 'name': asset.name, 'type': asset.type, 'platform': asset.platform, 'priority': 'Primary'} for asset in obj.primary_assets.all()]
        secondary = [{'id': asset.id, 'name': asset.name, 'type': asset.type, 'platform': asset.platform, 'priority': 'Secondary'} for asset in obj.secondary_assets.all()]
        return primary + secondary

class AssetSerializer(serializers.ModelSerializer):
    primary_nominee_detail = NomineeSerializer(source='primary_nominee', read_only=True)
    secondary_nominee_detail = NomineeSerializer(source='secondary_nominee', read_only=True)

    class Meta:
        model = Asset
        fields = [
            'id', 
            'name', 
            'type', 
            'platform', 
            'description', 
            'primary_nominee', 
            'primary_nominee_detail',
            'secondary_nominee',
            'secondary_nominee_detail',
            'created_at'
        ]

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'last_check_in', 'status']

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'username', 'action_type', 'entity', 'details', 'timestamp']
