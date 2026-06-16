from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetViewSet, 
    NomineeViewSet, 
    DashboardSummaryView,
    UserRegisterView,
    UserLoginView,
    VerifyLoginOTPView,
    UserLogoutView,
    GetProfileView,
    UpdateProfileView,
    ChangePasswordView,
    SendOTPView,
    VerifyOTPView,
    SimulateLeapView,
    AdminUserListView,
    AdminUserDetailView,
    AdminGlobalLogsView,
    AdminMarkDeceasedView,
    AdminAIAnalysisView,
    AdminAutoDispatchOTPView,
)

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'nominees', NomineeViewSet, basename='nominee')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardSummaryView.as_view(), name='dashboard-summary'),

    # Auth — 2FA two-step
    path('auth/register/',           UserRegisterView.as_view(),   name='auth-register'),
    path('auth/login/',              UserLoginView.as_view(),       name='auth-login'),
    path('auth/verify-login-otp/',   VerifyLoginOTPView.as_view(),  name='auth-verify-login-otp'),
    path('auth/logout/',             UserLogoutView.as_view(),      name='auth-logout'),

    # User Profile
    path('profile/',                 GetProfileView.as_view(),      name='profile-get'),
    path('profile/update/',          UpdateProfileView.as_view(),   name='profile-update'),
    path('profile/change-password/', ChangePasswordView.as_view(),  name='profile-change-password'),

    # 6-month check-in (manual)
    path('checkin/send-otp/',        SendOTPView.as_view(),         name='checkin-send-otp'),
    path('checkin/verify-otp/',      VerifyOTPView.as_view(),       name='checkin-verify-otp'),
    path('checkin/simulate-leap/',   SimulateLeapView.as_view(),    name='checkin-simulate-leap'),

    # Admin Portal — staff-only
    path('admin/users/',                          AdminUserListView.as_view(),        name='admin-users-list'),
    path('admin/users/<int:pk>/',                 AdminUserDetailView.as_view(),      name='admin-user-detail'),
    path('admin/users/<int:pk>/mark-deceased/',   AdminMarkDeceasedView.as_view(),    name='admin-user-mark-deceased'),
    path('admin/logs/',                           AdminGlobalLogsView.as_view(),      name='admin-global-logs'),

    # AI Analytics — staff-only
    path('admin/ai-analysis/',       AdminAIAnalysisView.as_view(),     name='admin-ai-analysis'),
    path('admin/auto-dispatch-otp/', AdminAutoDispatchOTPView.as_view(),name='admin-auto-dispatch-otp'),
]
