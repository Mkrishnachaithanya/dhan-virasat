import random
import datetime
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import authenticate, update_session_auth_hash

from .models import Asset, Nominee, UserProfile, ActivityLog
from .serializers import AssetSerializer, NomineeSerializer, UserProfileSerializer, ActivityLogSerializer

# Helper function to write system/user logs
def log_activity(user, action_type, entity, details):
    ActivityLog.objects.create(
        user=user,
        action_type=action_type,
        entity=entity,
        details=details
    )

# --- Authentication Views ---

class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not password or not email:
            return Response({'error': 'Please provide username, email, and password.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            
            # Create corresponding user profile
            UserProfile.objects.create(user=user)
            
            # Create token
            token, _ = Token.objects.get_or_create(user=user)
            
            # Log registration
            log_activity(user, 'SECURITY', 'Auth', f"User registration successful: {user.username}")

            return Response({
                'token': token.key,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserLoginView(APIView):
    """Step 1 of 2FA: verify credentials, issue a one-time login OTP."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid username or password.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure profile exists
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Generate a 6-digit login OTP (2FA)
        otp = str(random.randint(100000, 999999))
        profile.login_otp_code = otp
        profile.login_otp_created_at = timezone.now()
        profile.save()

        log_activity(user, 'SECURITY', 'Auth', '2FA login OTP generated and dispatched.')

        return Response({
            'requires_otp': True,
            'user_id': user.id,
            'otp_code': otp,   # Simulated — in production this goes via email/SMS
            'message': 'OTP sent to your registered email. Enter it to complete sign-in.'
        }, status=status.HTTP_200_OK)


class VerifyLoginOTPView(APIView):
    """Step 2 of 2FA: verify the login OTP, return auth token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user_id  = request.data.get('user_id')
        otp_code = request.data.get('otp_code', '').strip()

        if not user_id or not otp_code:
            return Response({'error': 'user_id and otp_code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Invalid session. Please login again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User profile not found.'}, status=status.HTTP_400_BAD_REQUEST)

        if not profile.login_otp_code or not profile.login_otp_created_at:
            return Response({'error': 'No OTP request found. Please login again.'}, status=status.HTTP_400_BAD_REQUEST)

        # OTP expires after 10 minutes
        age = (timezone.now() - profile.login_otp_created_at).total_seconds()
        if age > 600:
            profile.login_otp_code = None
            profile.login_otp_created_at = None
            profile.save()
            return Response({'error': 'OTP has expired. Please sign in again.'}, status=status.HTTP_400_BAD_REQUEST)

        if profile.login_otp_code != otp_code:
            log_activity(user, 'SECURITY', 'Auth', 'Failed 2FA login attempt — wrong OTP entered.')
            return Response({'error': 'Incorrect OTP. Please check and try again.'}, status=status.HTTP_400_BAD_REQUEST)

        # Clear OTP and issue token
        profile.login_otp_code = None
        profile.login_otp_created_at = None
        profile.save()

        token, _ = Token.objects.get_or_create(user=user)
        log_activity(user, 'SECURITY', 'Auth', 'User completed 2FA login successfully.')

        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
        }, status=status.HTTP_200_OK)

class UserLogoutView(APIView):
    def post(self, request):
        try:
            # Log logout before deleting token
            log_activity(request.user, 'SECURITY', 'Auth', "User logged out successfully")
            request.user.auth_token.delete()
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# --- User Profile Views ---

class GetProfileView(APIView):
    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        assets_count = Asset.objects.filter(owner=user).count()
        nominees_count = Nominee.objects.filter(owner=user).count()
        return Response({
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'assets_count': assets_count,
            'nominees_count': nominees_count,
            'phone': profile.phone,
            'bio': profile.bio,
            'status': profile.status,
            'last_check_in': profile.last_check_in,
        }, status=status.HTTP_200_OK)

class UpdateProfileView(APIView):
    def patch(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        changed_fields = []

        # Update User model fields
        if 'email' in request.data:
            new_email = request.data['email'].strip()
            if new_email and new_email != user.email:
                if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
                    return Response({'error': 'This email is already in use by another account.'}, status=status.HTTP_400_BAD_REQUEST)
                user.email = new_email
                changed_fields.append('email')
        if 'first_name' in request.data:
            user.first_name = request.data['first_name'].strip()
            changed_fields.append('first_name')
        if 'last_name' in request.data:
            user.last_name = request.data['last_name'].strip()
            changed_fields.append('last_name')
        user.save()

        # Update UserProfile fields
        if 'phone' in request.data:
            profile.phone = request.data['phone'].strip()
            changed_fields.append('phone')
        if 'bio' in request.data:
            profile.bio = request.data['bio'].strip()
            changed_fields.append('bio')
        profile.save()

        if changed_fields:
            log_activity(user, 'UPDATE', 'Profile', 'Updated profile fields: ' + ', '.join(changed_fields))

        return Response({
            'message': 'Profile updated successfully.',
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': profile.phone,
            'bio': profile.bio,
        }, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return Response({'error': 'All three password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        # Reissue token so existing sessions don't break
        Token.objects.filter(user=user).delete()
        new_token, _ = Token.objects.get_or_create(user=user)

        log_activity(user, 'SECURITY', 'Profile', 'User changed their account password.')

        return Response({
            'message': 'Password changed successfully.',
            'token': new_token.key,
        }, status=status.HTTP_200_OK)


# --- AI-Driven Admin Analytics ---

class AdminAIAnalysisView(APIView):
    """Analyses every non-staff user's audit logs and produces an AI risk assessment."""

    def get(self, request):
        if not request.user.is_staff:
            raise PermissionDenied('Admin access required.')

        users = User.objects.filter(is_staff=False)
        results = []

        for user in users:
            profile = UserProfile.objects.filter(user=user).first()
            if not profile:
                continue

            logs      = ActivityLog.objects.filter(user=user).order_by('-timestamp')
            total_logs = logs.count()
            cutoff     = timezone.now() - datetime.timedelta(days=30)
            recent_logs = logs.filter(timestamp__gte=cutoff).count()

            # Days since / until check-in deadline
            days_since   = None
            days_until   = None
            if profile.last_check_in:
                days_since = (timezone.now() - profile.last_check_in).days
                days_until = 180 - days_since

            # ─── Activity Score (0-100) ──────────────────────────────
            score = 100

            if days_since is not None:
                if days_since > 150:  score -= 50
                elif days_since > 120: score -= 30
                elif days_since > 90:  score -= 15
            else:
                score -= 40

            if   recent_logs > 5: score = min(100, score + 20)
            elif recent_logs > 2: score = min(100, score + 10)
            elif recent_logs == 0: score -= 20

            if   profile.status == 'Pending Verification': score -= 30
            elif profile.status == 'Deceased':             score = 0
            score = max(0, min(100, score))

            # ─── Risk Level ──────────────────────────────────────────
            if profile.status == 'Deceased' or score < 30:
                risk = 'Critical'
            elif profile.status == 'Pending Verification' or score < 50:
                risk = 'High'
            elif score < 70:
                risk = 'Medium'
            else:
                risk = 'Low'

            # ─── OTP Needed? ─────────────────────────────────────────
            needs_otp = (
                profile.status == 'Pending Verification' or
                (days_until is not None and days_until <= 30) or
                days_since is None
            )

            # ─── AI Natural-Language Insights ────────────────────────
            insights = []
            if profile.status == 'Deceased':
                insights.append('Account is marked Deceased. Inheritance procedures may be in progress.')
            elif profile.status == 'Pending Verification':
                insights.append('CRITICAL: Check-in deadline has lapsed. Immediate OTP dispatch required.')

            if days_until is not None:
                if days_until < 0:
                    insights.append(f'Check-in window expired {abs(days_until)} day(s) ago.')
                elif days_until <= 7:
                    insights.append(f'URGENT: Check-in deadline is in {days_until} day(s). Auto-dispatch recommended immediately.')
                elif days_until <= 30:
                    insights.append(f'Warning: Check-in approaching — {days_until} days remaining.')
                else:
                    insights.append(f'Check-in window is healthy — {days_until} days remaining.')
            else:
                insights.append('No check-in record detected. User may have never verified liveness.')

            if recent_logs == 0:
                insights.append('No platform activity in the past 30 days — possible dormant account.')
            elif recent_logs < 3:
                insights.append(f'Low activity: only {recent_logs} event(s) recorded in the last 30 days.')
            else:
                insights.append(f'Active account: {recent_logs} event(s) recorded in the last 30 days.')

            asset_count   = Asset.objects.filter(owner=user).count()
            nominee_count = Nominee.objects.filter(owner=user).count()

            results.append({
                'user_id':           user.id,
                'username':          user.username,
                'email':             user.email,
                'status':            profile.status,
                'activity_score':    score,
                'risk_level':        risk,
                'needs_otp_dispatch':needs_otp,
                'days_since_checkin':days_since,
                'days_until_deadline':days_until,
                'recent_activity_count': recent_logs,
                'total_logs':        total_logs,
                'asset_count':       asset_count,
                'nominee_count':     nominee_count,
                'ai_insights':       insights,
                'last_check_in':     profile.last_check_in,
            })

        # Sort by risk severity
        risk_order = {'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3}
        results.sort(key=lambda r: risk_order.get(r['risk_level'], 4))

        summary = {
            'total_users':       len(results),
            'critical':          sum(1 for r in results if r['risk_level'] == 'Critical'),
            'high':              sum(1 for r in results if r['risk_level'] == 'High'),
            'medium':            sum(1 for r in results if r['risk_level'] == 'Medium'),
            'low':               sum(1 for r in results if r['risk_level'] == 'Low'),
            'needs_otp_dispatch':sum(1 for r in results if r['needs_otp_dispatch']),
        }

        return Response({'analysis': results, 'summary': summary, 'analyzed_at': timezone.now()})


class AdminAutoDispatchOTPView(APIView):
    """Auto-dispatches 6-month check-in OTPs to at-risk users."""

    def post(self, request):
        if not request.user.is_staff:
            raise PermissionDenied('Admin access required.')

        user_ids = request.data.get('user_ids', [])
        dispatched = []

        if user_ids:
            target_users = User.objects.filter(id__in=user_ids, is_staff=False)
        else:
            # Auto: any non-staff user whose 6-month window is within 30 days or already expired
            at_risk_ids = []
            for p in UserProfile.objects.filter(status__in=['Active', 'Pending Verification']):
                if not p.user.is_staff:
                    if p.last_check_in:
                        days_since = (timezone.now() - p.last_check_in).days
                        if days_since >= 150:
                            at_risk_ids.append(p.user_id)
                    else:
                        at_risk_ids.append(p.user_id)
            target_users = User.objects.filter(id__in=at_risk_ids)

        for user in target_users:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.status == 'Deceased':
                continue

            otp = str(random.randint(100000, 999999))
            profile.otp_code = otp
            profile.otp_created_at = timezone.now()
            profile.save()

            log_activity(
                None, 'CHECKIN', 'AutoDispatch',
                f'AI auto-dispatched 6-month check-in OTP to {user.username} (score-based). OTP: {otp}'
            )

            dispatched.append({
                'user_id':  user.id,
                'username': user.username,
                'email':    user.email,
                'otp_code': otp,
            })

        return Response({
            'dispatched_count': len(dispatched),
            'dispatched':       dispatched,
            'message':         f'OTP dispatched to {len(dispatched)} user(s) by AI auto-analysis.'
        })


# --- Scoped Asset/Nominee Viewsets ---

class NomineeViewSet(viewsets.ModelViewSet):
    serializer_class = NomineeSerializer

    def get_queryset(self):
        return Nominee.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        nominee = serializer.save(owner=self.request.user)
        log_activity(
            self.request.user, 
            'CREATE', 
            'Nominee', 
            f"Added nominee {nominee.name} ({nominee.relationship})"
        )

    def perform_update(self, serializer):
        nominee = serializer.save()
        log_activity(
            self.request.user, 
            'UPDATE', 
            'Nominee', 
            f"Updated nominee info: {nominee.name} ({nominee.relationship})"
        )

    def perform_destroy(self, instance):
        nominee_name = instance.name
        instance.delete()
        log_activity(
            self.request.user, 
            'DELETE', 
            'Nominee', 
            f"Deleted nominee: {nominee_name}"
        )

class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer

    def get_queryset(self):
        # Prevent deceased users from making changes, or allow them to view read-only.
        # But standard flow: return assets owned by this user
        return Asset.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        primary_id = self.request.data.get('primary_nominee')
        secondary_id = self.request.data.get('secondary_nominee')

        if primary_id:
            try:
                Nominee.objects.get(id=primary_id, owner=self.request.user)
            except Nominee.DoesNotExist:
                raise ValidationError({'primary_nominee': 'Selected primary nominee does not exist or does not belong to you.'})
        
        if secondary_id:
            try:
                Nominee.objects.get(id=secondary_id, owner=self.request.user)
            except Nominee.DoesNotExist:
                raise ValidationError({'secondary_nominee': 'Selected secondary nominee does not exist or does not belong to you.'})

        if primary_id and secondary_id and int(primary_id) == int(secondary_id):
            raise ValidationError({'secondary_nominee': 'Primary and secondary nominees must be different.'})
        
        asset = serializer.save(owner=self.request.user)
        log_activity(
            self.request.user, 
            'CREATE', 
            'Asset', 
            f"Created asset {asset.name} [{asset.type}] on {asset.platform} with Primary Nominee: {asset.primary_nominee.name if asset.primary_nominee else 'None'}, Secondary Nominee: {asset.secondary_nominee.name if asset.secondary_nominee else 'None'}"
        )

    def perform_update(self, serializer):
        primary_id = self.request.data.get('primary_nominee')
        secondary_id = self.request.data.get('secondary_nominee')

        if primary_id:
            try:
                Nominee.objects.get(id=primary_id, owner=self.request.user)
            except Nominee.DoesNotExist:
                raise ValidationError({'primary_nominee': 'Selected primary nominee does not belong to you.'})
        
        if secondary_id:
            try:
                Nominee.objects.get(id=secondary_id, owner=self.request.user)
            except Nominee.DoesNotExist:
                raise ValidationError({'secondary_nominee': 'Selected secondary nominee does not belong to you.'})

        if primary_id and secondary_id and int(primary_id) == int(secondary_id):
            raise ValidationError({'secondary_nominee': 'Primary and secondary nominees must be different.'})
        
        asset = serializer.save()
        log_activity(
            self.request.user, 
            'UPDATE', 
            'Asset', 
            f"Updated asset details: {asset.name} [{asset.type}]"
        )

    def perform_destroy(self, instance):
        asset_name = instance.name
        instance.delete()
        log_activity(
            self.request.user, 
            'DELETE', 
            'Asset', 
            f"Deleted asset: {asset_name}"
        )


# --- Dashboard and check-in Views ---

class DashboardSummaryView(APIView):
    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Check if the check-in has expired (older than 6 months / 180 days)
        # If last_check_in + 180 days < now, change status to 'Pending Verification'
        delta = timezone.now() - profile.last_check_in
        if delta.days >= 180 and profile.status == 'Active':
            profile.status = 'Pending Verification'
            profile.save()
            log_activity(user, 'SECURITY', 'Check-in', "Check-in expired automatically after 180 days. Status set to Pending Verification.")

        total_assets = Asset.objects.filter(owner=user).count()
        total_nominees = Nominee.objects.filter(owner=user).count()

        # Group assets by type
        type_counts = Asset.objects.filter(owner=user).values('type').annotate(count=Count('id'))
        asset_by_type = {t[0]: 0 for t in Asset.ASSET_TYPE_CHOICES}
        for tc in type_counts:
            asset_type = tc['type']
            if asset_type in asset_by_type:
                asset_by_type[asset_type] = tc['count']

        recent_assets = AssetSerializer(Asset.objects.filter(owner=user).order_by('-created_at')[:5], many=True).data
        recent_nominees = NomineeSerializer(Nominee.objects.filter(owner=user).order_by('-created_at')[:5], many=True).data

        return Response({
            'total_assets': total_assets,
            'total_nominees': total_nominees,
            'asset_by_type': asset_by_type,
            'recent_assets': recent_assets,
            'recent_nominees': recent_nominees,
            'check_in_status': profile.status,
            'last_check_in': profile.last_check_in,
            'next_check_in_deadline': profile.last_check_in + datetime.timedelta(days=180)
        }, status=status.HTTP_200_OK)


class SendOTPView(APIView):
    def post(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        if profile.status == 'Deceased':
            return Response({'error': 'Cannot request check-in OTP. This account is marked as Deceased.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a mock 6-digit code
        otp = str(random.randint(100000, 999999))
        profile.otp_code = otp
        profile.otp_created_at = timezone.now()
        profile.save()

        log_activity(user, 'SECURITY', 'Check-in', "Generated check-in OTP code")

        return Response({
            'message': 'OTP sent successfully (Simulated).',
            'otp_code': otp # Returned directly in response for local test simulation
        }, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    def post(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        submitted_code = request.data.get('code')
        if not submitted_code:
            return Response({'error': 'Please provide the verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        if profile.status == 'Deceased':
            return Response({'error': 'Verification rejected. Account is already marked Deceased.'}, status=status.HTTP_400_BAD_REQUEST)

        if profile.otp_code and profile.otp_code == submitted_code:
            profile.last_check_in = timezone.now()
            profile.status = 'Active'
            profile.otp_code = None
            profile.save()

            log_activity(user, 'CHECKIN', 'Check-in', "Check-in verified via OTP. Activity timer reset.")
            
            return Response({
                'message': 'Check-in verified successfully. Timer reset.',
                'status': profile.status,
                'last_check_in': profile.last_check_in
            }, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid verification code. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)


class SimulateLeapView(APIView):
    def post(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        # Leap last check in back by 181 days (beyond 6 months)
        profile.last_check_in = timezone.now() - datetime.timedelta(days=181)
        profile.status = 'Pending Verification'
        profile.save()

        log_activity(user, 'SECURITY', 'Check-in', "User triggered developer check-in time leap (+6 Months)")

        return Response({
            'message': 'Time leap simulated. Status set to Pending Verification.',
            'last_check_in': profile.last_check_in,
            'status': profile.status
        }, status=status.HTTP_200_OK)


# --- Staff-Only Admin View Endpoints ---

class AdminUserListView(APIView):
    def get(self, request):
        if not request.user.is_staff:
            raise PermissionDenied("You are not authorized to view this resource.")

        users = User.objects.all().exclude(is_superuser=True).order_by('-date_joined')
        data = []
        for u in users:
            profile, _ = UserProfile.objects.get_or_create(user=u)
            assets_count = Asset.objects.filter(owner=u).count()
            nominees_count = Nominee.objects.filter(owner=u).count()
            
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'status': profile.status,
                'last_check_in': profile.last_check_in,
                'assets_count': assets_count,
                'nominees_count': nominees_count,
                'date_joined': u.date_joined
            })

        return Response(data, status=status.HTTP_200_OK)

class AdminUserDetailView(APIView):
    def get(self, request, pk):
        if not request.user.is_staff:
            raise PermissionDenied("Unauthorized access.")

        target_user = get_object_or_404(User, id=pk)
        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        
        assets = AssetSerializer(Asset.objects.filter(owner=target_user), many=True).data
        nominees = NomineeSerializer(Nominee.objects.filter(owner=target_user), many=True).data
        logs = ActivityLogSerializer(ActivityLog.objects.filter(user=target_user).order_by('-timestamp'), many=True).data

        return Response({
            'user_id': target_user.id,
            'username': target_user.username,
            'email': target_user.email,
            'status': profile.status,
            'last_check_in': profile.last_check_in,
            'assets': assets,
            'nominees': nominees,
            'logs': logs
        }, status=status.HTTP_200_OK)

class AdminGlobalLogsView(APIView):
    def get(self, request):
        if not request.user.is_staff:
            raise PermissionDenied("Unauthorized access.")

        logs = ActivityLog.objects.all().order_by('-timestamp')[:100]
        data = ActivityLogSerializer(logs, many=True).data
        return Response(data, status=status.HTTP_200_OK)

class AdminMarkDeceasedView(APIView):
    def post(self, request, pk):
        if not request.user.is_staff:
            raise PermissionDenied("Unauthorized access.")

        target_user = get_object_or_404(User, id=pk)
        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        
        profile.status = 'Deceased'
        profile.save()

        # Log change
        log_activity(
            target_user, 
            'SECURITY', 
            'Check-in', 
            f"Account status manually overridden to DECEASED by admin '{request.user.username}'"
        )

        return Response({
            'message': f"User '{target_user.username}' marked as Deceased.",
            'status': profile.status
        }, status=status.HTTP_200_OK)
