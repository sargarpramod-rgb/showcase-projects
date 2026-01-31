# --- Providers ---
# Default provider for eu-north-1 (S3 bucket, ALB, etc.)
provider "aws" {
  region = "eu-north-1"
}

# Additional provider for us-east-1 (CloudFront + ACM certificate)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# --- S3 Bucket in eu-north-1 ---
resource "aws_s3_bucket" "react_app" {
  provider = aws
  bucket   = "transaction-tracker-react-app-pramod-2026" # must be globally unique
  acl      = "private"

  tags = {
    Name = "TransactionTrackerReactApp"
  }
}

# Origin Access Identity (OAI) for CloudFront to access S3 privately
resource "aws_cloudfront_origin_access_identity" "oai" {
  provider = aws.us_east_1
  comment  = "OAI for CloudFront to access S3 bucket"
}

# Attach bucket policy so only CloudFront OAI can read objects
resource "aws_s3_bucket_policy" "react_app_policy" {
  provider = aws
  bucket   = aws_s3_bucket.react_app.id

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "${aws_cloudfront_origin_access_identity.oai.iam_arn}"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${aws_s3_bucket.react_app.bucket}/*"
    }
  ]
}
POLICY
}

# --- ACM Certificate in us-east-1 ---
resource "aws_acm_certificate" "cloudfront_cert" {
  provider          = aws.us_east_1
  domain_name       = "www.wheresmymoneyat.in"
  validation_method = "DNS"

  tags = {
    Name = "CloudFrontCert"
  }
}

# --- WAFv2 WebACL in us-east-1 (Global scope for CloudFront) ---
resource "aws_wafv2_web_acl" "cloudfront_acl" {
  provider    = aws.us_east_1
  name        = "cloudfront-acl"
  scope       = "CLOUDFRONT"
  description = "Basic WAF ACL for CloudFront"

  default_action {
    allow {}
  }

  visibility_config {
    cloud_watch_metrics_enabled = true
    metric_name                 = "cloudfrontAcl"
    sampled_requests_enabled    = true
  }

  tags = {
    Name = "CloudFrontWAF"
  }
}

# --- CloudFront Distribution (global, managed via us-east-1 provider) ---
resource "aws_cloudfront_distribution" "wheresmymoneyat" {
  provider            = aws.us_east_1
  enabled             = true
  default_root_object = "index.html"

  aliases = ["www.wheresmymoneyat.in"]

  # S3 Origin (eu-north-1 bucket)
  origin {
    domain_name = "${aws_s3_bucket.react_app.bucket}.s3.eu-north-1.amazonaws.com"
    origin_id   = "transaction-tracker-react-app-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  # ALB Origin (eu-north-1)
  origin {
    domain_name = "TranscationTrackerALB-1736677249.eu-north-1.elb.amazonaws.com"
    origin_id   = "TranscationTrackerALB-1736677249.eu-north-1.elb.amazonaws.com"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior (S3 origin)
  default_cache_behavior {
    target_origin_id       = "transaction-tracker-react-app-origin"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    compress        = true
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # Ordered cache behaviors (ALB origin)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "TranscationTrackerALB-1736677249.eu-north-1.elb.amazonaws.com"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    compress                 = true
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  ordered_cache_behavior {
    path_pattern           = "/login/oauth2/*"
    target_origin_id       = "TranscationTrackerALB-1736677249.eu-north-1.elb.amazonaws.com"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    compress                 = true
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  ordered_cache_behavior {
    path_pattern           = "/oauth2/*"
    target_origin_id       = "TranscationTrackerALB-1736677249.eu-north-1.elb.amazonaws.com"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods  = ["GET", "HEAD"]

    compress                 = true
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  # Custom error responses
  custom_error_response {
    error_code            = 403
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_page_path    = "/index.html"
    response_code         = 200
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Reference ACM certificate from us-east-1
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cloudfront_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.3_2025"
  }

  # Attach WAFv2 ACL created above
  web_acl_id = aws_wafv2_web_acl.cloudfront_acl.arn

  http_version    = "http2"
  is_ipv6_enabled = true
  price_class     = "PriceClass_All"

  tags = {
    Name = "WhereIsMyMoneyAt"
  }
}

# --- Outputs ---
output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.wheresmymoneyat.domain_name
}