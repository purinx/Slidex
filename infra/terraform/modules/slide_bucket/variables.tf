variable "bucket_name" {
  description = "Name of the private S3 bucket that stores slide decks."
  type        = string
}

variable "slides_prefix" {
  description = "Prefix under the bucket where deck objects are stored."
  type        = string
  default     = "decks"
}

variable "cors_allowed_origins" {
  description = "Allowed origins for browser direct uploads and reads."
  type        = list(string)
  default     = []
}

variable "force_destroy" {
  description = "Whether Terraform may delete a non-empty bucket. Keep false for production."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags applied to created resources."
  type        = map(string)
  default     = {}
}
