variable "project_name" {
  description = "Project name used for the Amplify app."
  type        = string
}

variable "environment" {
  description = "Environment name."
  type        = string
}

variable "repository" {
  description = "Git repository URL connected to Amplify."
  type        = string
}

variable "branch_name" {
  description = "Git branch deployed by Amplify."
  type        = string
  default     = "main"
}

variable "access_token" {
  description = "Optional repository access token. Prefer setting repository connection outside Terraform to avoid state exposure."
  type        = string
  default     = null
  sensitive   = true
}

variable "iam_service_role_arn" {
  description = "IAM service role ARN used by Amplify."
  type        = string
}

variable "environment_variables" {
  description = "Amplify app environment variables. Do not include secrets."
  type        = map(string)
  default     = {}
}

variable "domain_name" {
  description = "Optional custom domain name for the Amplify app."
  type        = string
  default     = null
}

variable "sub_domain_prefix" {
  description = "Subdomain prefix used when domain_name is set. Empty string maps the apex."
  type        = string
  default     = ""
}

variable "enable_auto_branch_build" {
  description = "Whether Amplify automatically builds commits on the configured branch."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default     = {}
}
