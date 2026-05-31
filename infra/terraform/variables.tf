variable "project_name" {
  description = "Project name used in resource names."
  type        = string
  default     = "slidex"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region for regional resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "frontend_bucket_name" {
  description = "S3 bucket name for frontend assets. Defaults to a project/account based name."
  type        = string
  default     = null
}

variable "slides_bucket_name" {
  description = "Private S3 bucket name for slide deck objects."
  type        = string
  default     = null
}

variable "slides_prefix" {
  description = "Prefix under the slides bucket where deck objects are stored."
  type        = string
  default     = "decks"
}

variable "upload_max_file_size_mb" {
  description = "Maximum allowed upload file size in MiB."
  type        = number
  default     = 20
}

variable "upload_max_deck_size_mb" {
  description = "Maximum allowed deck size in MiB."
  type        = number
  default     = 200
}

variable "ogp_default_image_url" {
  description = "Fallback OGP image URL."
  type        = string
  default     = ""
}

variable "cors_allowed_origins" {
  description = "S3 CORS allowed origins for browser direct uploads."
  type        = list(string)
  default     = ["*"]
}

variable "force_destroy_slide_bucket" {
  description = "Whether Terraform may delete the non-empty slide bucket."
  type        = bool
  default     = false
}

variable "force_destroy_frontend_bucket" {
  description = "Whether Terraform may delete the non-empty frontend bucket."
  type        = bool
  default     = true
}

variable "lambda_memory_size" {
  description = "Backend Lambda memory size in MB."
  type        = number
  default     = 512
}

variable "lambda_timeout_seconds" {
  description = "Backend Lambda timeout in seconds."
  type        = number
  default     = 30
}

variable "cloudfront_price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_200"
}
