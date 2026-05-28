locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  custom_origin = var.domain_name == null ? [] : [
    var.sub_domain_prefix == "" ? "https://${var.domain_name}" : "https://${var.sub_domain_prefix}.${var.domain_name}"
  ]
  cors_origins = distinct(compact(concat(
    var.cors_allowed_origins,
    local.custom_origin
  )))

  amplify_environment_variables = merge(
    {
      AWS_REGION              = var.aws_region
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

module "slide_bucket" {
  source = "../../modules/slide_bucket"

  bucket_name          = var.slides_bucket_name
  slides_prefix        = var.slides_prefix
  cors_allowed_origins = local.cors_origins
  force_destroy        = var.force_destroy_slide_bucket
  tags                 = local.tags
}

module "iam" {
  source = "../../modules/iam"

  project_name      = var.project_name
  environment       = var.environment
  slides_bucket_arn = module.slide_bucket.bucket_arn
  slides_prefix     = module.slide_bucket.slides_prefix
  tags              = local.tags
}

module "amplify" {
  source = "../../modules/amplify_app"

  project_name             = var.project_name
  environment              = var.environment
  repository               = var.amplify_repository
  branch_name              = var.amplify_branch_name
  access_token             = var.amplify_access_token
  iam_service_role_arn     = module.iam.amplify_compute_role_arn
  environment_variables    = local.amplify_environment_variables
  domain_name              = var.domain_name
  sub_domain_prefix        = var.sub_domain_prefix
  enable_auto_branch_build = true
  tags                     = local.tags
}
