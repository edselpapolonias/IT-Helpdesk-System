from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LoginSerializer, UserSummarySerializer


User = get_user_model()


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            account = User.objects.get(
                email__iexact=serializer.validated_data["email"]
            )
        except User.DoesNotExist:
            account = None

        user = None
        if account is not None:
            user = authenticate(
                request=request,
                username=account.username,
                password=serializer.validated_data["password"],
            )

        if user is None:
            return Response(
                {"detail": "The email or password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.role not in (
            User.Role.ADMIN,
            User.Role.USER,
            User.Role.TECHNICIAN,
        ):
            return Response(
                {"detail": "This account does not have an available portal."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=user)
        update_last_login(None, user)
        return Response(
            {
                "token": token.key,
                "user": UserSummarySerializer(user).data,
            }
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSummarySerializer(request.user).data)
