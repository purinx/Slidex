variable "project_name" {
  description = "Project name used in resource names."
  type        = string
  default     = "slidex"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-northeast-1"
}

variable "slides_bucket_name" {
  description = "Private S3 bucket name for slide deck objects."
  type        = string
}

variable "slides_prefix" {
  description = "Prefix under the slides bucket where deck objects are stored."
  type        = string
  default     = "decks"
}

variable "amplify_repository" {
  description = "Git repository URL connected to Amplify."
  type        = string
}

variable "amplify_branch_name" {
  description = "Git branch deployed by Amplify."
  type        = string
  default     = "main"
}

variable "amplify_access_token" {
  description = "Optional repository access token. Prefer configuring repository access outside Terraform."
  type        = string
  default     = null
  sensitive   = true
}

variable "domain_name" {
  description = "Optional custom domain name."
  type        = string
  default     = null
}

variable "sub_domain_prefix" {
  description = "Subdomain prefix used when domain_name is set."
  type        = string
  default     = "dev"
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
  description = "Additional S3 CORS allowed origins."
  type        = list(string)
  default     = ["http://localhost:5173", "http://127.0.0.1:5173"]
}

variable "force_destroy_slide_bucket" {
  description = "Whether Terraform may delete the non-empty dev slide bucket."
  type        = bool
  default     = true
}
