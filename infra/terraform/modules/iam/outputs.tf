output "amplify_compute_role_arn" {
  description = "IAM role ARN used by Amplify Hosting."
  value       = aws_iam_role.amplify_compute.arn
}

output "slides_access_policy_arn" {
  description = "IAM policy ARN for slide object access."
  value       = aws_iam_policy.slides_access.arn
}
