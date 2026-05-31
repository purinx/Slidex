locals {
  account_id           = data.aws_caller_identity.current.account_id
  name_prefix          = "${var.project_name}-${var.environment}"
  frontend_bucket_name = coalesce(var.frontend_bucket_name, "${local.name_prefix}-${local.account_id}-frontend")
  slides_bucket_name   = coalesce(var.slides_bucket_name, "${local.name_prefix}-${local.account_id}-slides")
  slides_prefix        = trim(var.slides_prefix, "/")
  slides_object_arn    = local.slides_prefix == "" ? "${module.slide_bucket.bucket_arn}/*" : "${module.slide_bucket.bucket_arn}/${local.slides_prefix}/*"

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lambda_environment_variables = merge(
    {
      SLIDES_AWS_REGION       = var.aws_region
      SLIDES_BUCKET_NAME      = module.slide_bucket.bucket_name
      SLIDES_PREFIX           = module.slide_bucket.slides_prefix
      VITE_S3_BUCKET_NAME     = module.slide_bucket.bucket_name
      VITE_S3_REGION          = var.aws_region
      VITE_S3_PREFIX          = module.slide_bucket.slides_prefix
      FRONTEND_DIST_DIR       = "./frontend-dist"
      UPLOAD_MAX_FILE_SIZE_MB = tostring(var.upload_max_file_size_mb)
      UPLOAD_MAX_DECK_SIZE_MB = tostring(var.upload_max_deck_size_mb)
    },
    var.ogp_default_image_url == "" ? {} : {
      OGP_DEFAULT_IMAGE_URL = var.ogp_default_image_url
    }
  )
}

data "aws_caller_identity" "current" {}

data "archive_file" "lambda_placeholder" {
  type        = "zip"
  source_dir  = "${path.module}/lambda-placeholder"
  output_path = "${path.module}/.terraform/lambda-placeholder.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_slides_access" {
  statement {
    sid       = "ListSlidesBucket"
    actions   = ["s3:ListBucket"]
    resources = [module.slide_bucket.bucket_arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = [local.slides_prefix == "" ? "*" : "${local.slides_prefix}/*"]
    }
  }

  statement {
    sid = "ReadWriteSlidesObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = [local.slides_object_arn]
  }
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

module "slide_bucket" {
  source = "./modules/slide_bucket"

  bucket_name          = local.slides_bucket_name
  slides_prefix        = var.slides_prefix
  cors_allowed_origins = var.cors_allowed_origins
  force_destroy        = var.force_destroy_slide_bucket
  tags                 = local.tags
}

resource "aws_s3_bucket" "frontend" {
  bucket        = local.frontend_bucket_name
  force_destroy = var.force_destroy_frontend_bucket

  tags = local.tags
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.name_prefix}-backend-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_slides_access" {
  name   = "${local.name_prefix}-lambda-slides-access"
  policy = data.aws_iam_policy_document.lambda_slides_access.json

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_slides_access" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_slides_access.arn
}

resource "aws_lambda_function" "backend" {
  function_name    = "${local.name_prefix}-backend"
  role             = aws_iam_role.lambda.arn
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256
  handler          = "dist/lambda.handler"
  runtime          = "nodejs20.x"
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout_seconds

  environment {
    variables = local.lambda_environment_variables
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_iam_role_policy_attachment.lambda_slides_access
  ]

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash
    ]
  }

  tags = local.tags
}

resource "aws_lambda_function_url" "backend" {
  function_name      = aws_lambda_function.backend.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "backend_function_url" {
  statement_id           = "AllowFunctionUrlInvoke"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.backend.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-frontend"
  description                       = "OAC for ${aws_s3_bucket.frontend.bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${local.name_prefix}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Rewrite frontend routes to index.html"
  publish = true
  code    = <<-JS
    function handler(event) {
      var request = event.request;
      if (request.uri === "/" || !request.uri.includes(".")) {
        request.uri = "/index.html";
      }
      return request;
    }
  JS
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name_prefix} frontend and backend"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class

  origin {
    origin_id                = "frontend-s3"
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    origin_id   = "backend-lambda"
    domain_name = trimsuffix(trimprefix(aws_lambda_function_url.backend.function_url, "https://"), "/")

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "backend-lambda"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  ordered_cache_behavior {
    path_pattern             = "/deck/*"
    target_origin_id         = "backend-lambda"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.tags
}

data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    sid       = "AllowCloudFrontRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json
}
