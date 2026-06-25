# Future WordPress Adapter

Do not add this in Phase 0.

When the sandbox proves stable, add:

```text
/functions/publish-wordpress
```

Required future variables:

```bash
WORDPRESS_ENABLED=false
WORDPRESS_SITE_URL=
WORDPRESS_USERNAME=
WORDPRESS_APPLICATION_PASSWORD=
```

Safety rule:

The function must refuse to publish unless:

```text
WORDPRESS_ENABLED=true
article_status=approved_sandbox
fact_check_status=passed
bias_check_status=passed
image_status=approved
```

Each website should have its own publishing credentials or credential reference.
