import os

import cloudinary.uploader
import cloudinary.utils
from cloudinary_storage.storage import RawMediaCloudinaryStorage


class AuthenticatedRawMediaCloudinaryStorage(RawMediaCloudinaryStorage):
    """Store user uploads as non-public Cloudinary raw assets.

    Ticket attachments and profile images are downloaded through authenticated
    Django endpoints. Signed Cloudinary URLs preserve that access boundary
    instead of exposing public media URLs.
    """

    DELIVERY_TYPE = "authenticated"

    def _upload(self, name, content):
        options = {
            "use_filename": True,
            "resource_type": self.RESOURCE_TYPE,
            "type": self.DELIVERY_TYPE,
            "tags": self.TAG,
        }
        folder = os.path.dirname(name)
        if folder:
            options["folder"] = folder
        return cloudinary.uploader.upload(content, **options)

    def _get_url(self, name):
        public_id = self._prepend_prefix(name)
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type=self.RESOURCE_TYPE,
            type=self.DELIVERY_TYPE,
            sign_url=True,
            secure=True,
        )
        return url

    def delete(self, name):
        public_id = self._prepend_prefix(name)
        response = cloudinary.uploader.destroy(
            public_id,
            resource_type=self.RESOURCE_TYPE,
            type=self.DELIVERY_TYPE,
            invalidate=True,
        )
        return response.get("result") == "ok"
