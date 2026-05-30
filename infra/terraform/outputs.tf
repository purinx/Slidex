output "slides_bucket_name" {
  description = "Slide storage bucket name."
  value       = module.slide_bucket.bucket_name
}

output "amplify_app_id" {
  description = "Amplify app ID."
  value       = module.amplify.app_id
}

output "amplify_branch_url" {
  description = "Default Amplify branch URL."
  value       = module.amplify.branch_url
}

output "amplify_compute_role_arn" {
  description = "Amplify compute role ARN."
  value       = module.iam.amplify_compute_role_arn
}
