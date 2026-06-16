from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from django.utils import timezone
import datetime
from django.db import connection
from .models import Nominee, Asset, UserProfile, ActivityLog

class ScopedDigitalAssetInheritanceTests(APITestCase):
    def setUp(self):
        # Create User A
        self.user_a = User.objects.create_user(username="alice", email="alice@example.com", password="password123")
        self.token_a = Token.objects.create(user=self.user_a)
        UserProfile.objects.get_or_create(user=self.user_a)
        
        # Create User B
        self.user_b = User.objects.create_user(username="bob", email="bob@example.com", password="password123")
        self.token_b = Token.objects.create(user=self.user_b)
        UserProfile.objects.get_or_create(user=self.user_b)
        
        # Create Nominees belonging to Alice
        self.nominee_a1 = Nominee.objects.create(
            owner=self.user_a,
            name="Charlie Primary",
            email="charlie@example.com",
            relationship="Child"
        )
        self.nominee_a2 = Nominee.objects.create(
            owner=self.user_a,
            name="Diana Backup",
            email="diana@example.com",
            relationship="Sibling"
        )
        
        # Create an asset belonging to Alice
        self.asset_a = Asset.objects.create(
            owner=self.user_a,
            name="Alice Savings Account",
            type="Bank",
            platform="Chase",
            description="Super Secret Passcode: 54321",
            primary_nominee=self.nominee_a1,
            secondary_nominee=self.nominee_a2
        )

        # Create a nominee belonging to Bob
        self.nominee_b = Nominee.objects.create(
            owner=self.user_b,
            name="David G",
            email="david@example.com",
            relationship="Sibling"
        )

    def test_user_registration(self):
        url = reverse('auth-register')
        data = {
            "username": "charlie_user",
            "email": "charlie_user@example.com",
            "password": "securepassword"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['username'], "charlie_user")

    def test_authenticated_view_nominees(self):
        url = reverse('nominee-list')
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return Charlie and Diana (2 nominees)
        self.assertEqual(len(response.data), 2)

    def test_create_asset_scoped_validation(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        url = reverse('asset-list')
        data = {
            "name": "Hacked Asset",
            "type": "Crypto",
            "platform": "Ledger",
            "description": "Unauthorized link",
            "primary_nominee": self.nominee_b.id, # Bob's nominee
            "secondary_nominee": self.nominee_a2.id
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('primary_nominee', response.data)

        # Alice creates asset with identical primary and secondary nominee
        data["primary_nominee"] = self.nominee_a1.id
        data["secondary_nominee"] = self.nominee_a1.id
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('secondary_nominee', response.data)

        # Alice creates asset with valid different nominees
        data["secondary_nominee"] = self.nominee_a2.id
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Asset.objects.get(id=response.data['id']).primary_nominee.id, self.nominee_a1.id)
        self.assertEqual(Asset.objects.get(id=response.data['id']).secondary_nominee.id, self.nominee_a2.id)

    def test_database_encryption_at_rest(self):
        # 1. Fetching via ORM should return decrypted plaintext
        nominee = Nominee.objects.get(id=self.nominee_a1.id)
        self.assertEqual(nominee.email, "charlie@example.com")
        
        asset = Asset.objects.get(id=self.asset_a.id)
        self.assertEqual(asset.description, "Super Secret Passcode: 54321")

        # 2. Querying raw SQL directly from the SQLite connection should return encrypted ciphertext
        with connection.cursor() as cursor:
            cursor.execute("SELECT email FROM core_nominee WHERE id = %s", [self.nominee_a1.id])
            raw_email = cursor.fetchone()[0]
            self.assertNotEqual(raw_email, "charlie@example.com")
            self.assertTrue(raw_email.startswith('gAAAA'))

            cursor.execute("SELECT description FROM core_asset WHERE id = %s", [self.asset_a.id])
            raw_desc = cursor.fetchone()[0]
            self.assertNotEqual(raw_desc, "Super Secret Passcode: 54321")
            self.assertTrue(raw_desc.startswith('gAAAA'))

class DeadManSwitchAndAdminTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="password")
        self.profile = UserProfile.objects.create(user=self.user)
        self.token = Token.objects.create(user=self.user)

        self.admin = User.objects.create_user(username="testadmin", email="admin@example.com", password="password", is_staff=True)
        self.admin_token = Token.objects.create(user=self.admin)

    def test_check_in_otp_verification_flow(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        
        # Send OTP
        url_send = reverse('checkin-send-otp')
        response = self.client.post(url_send)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        otp_code = response.data['otp_code']

        # Verify
        url_verify = reverse('checkin-verify-otp')
        response = self.client.post(url_verify, {'code': otp_code}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, 'Active')

    def test_admin_portal_authorized_flow(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.admin_token.key)
        
        # Mark target user as deceased
        url_deceased = reverse('admin-user-mark-deceased', kwargs={'pk': self.user.id})
        response = self.client.post(url_deceased)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, 'Deceased')
