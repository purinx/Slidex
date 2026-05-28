variable "project_name" {
  description = "Project name used in IAM resource names."
  type        = string
}

variable "environment" {
  description = "Environment name used in IAM resource names."
  type        = string
}

variable "slides_bucket_arn" {
  description = "ARN of the slide storage bucket."
  type        = string
}

variable "slides_prefix" {
  description = "Prefix containing slide deck objects."
  type        = string
  default     = "decks"
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default     = {}
}
