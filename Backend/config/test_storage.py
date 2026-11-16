import os
from unittest.mock import patch

from django.test import SimpleTestCase

os.environ.setdefault("CLOUDINARY_URL", "cloudinary://test:test@test")

from .storage import AuthenticatedRawMediaCloudinaryStorage


class AuthenticatedRawMediaCloudinaryStorageTests(SimpleTestCase):
    @patch(
        "config.storage.cloudinary.utils.private_download_url",
        return_value="https://api.cloudinary.test/private-download",
    )
    def test_authenticated_assets_use_time_limited_private_download_url(
        self,
        private_download_url,
    ):
        storage = AuthenticatedRawMediaCloudinaryStorage()

        with patch.object(
            storage,
            "_prepend_prefix",
            return_value="private/ticket_attachments/1/evidence.png",
        ):
            url = storage._get_url("ticket_attachments/1/evidence.png")

        self.assertEqual(url, "https://api.cloudinary.test/private-download")
        public_id, file_format = private_download_url.call_args.args
        options = private_download_url.call_args.kwargs
        self.assertEqual(public_id, "private/ticket_attachments/1/evidence.png")
        self.assertEqual(file_format, "png")
        self.assertEqual(options["resource_type"], "raw")
        self.assertEqual(options["type"], "authenticated")
        self.assertGreater(options["expires_at"], 0)

    def test_raw_asset_without_extension_is_rejected(self):
        storage = AuthenticatedRawMediaCloudinaryStorage()

        with patch.object(storage, "_prepend_prefix", return_value="private/no-extension"):
            with self.assertRaisesMessage(ValueError, "must include a file extension"):
                storage._get_url("no-extension")
