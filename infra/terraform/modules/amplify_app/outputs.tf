output "app_id" {
  description = "Amplify app ID."
  value       = aws_amplify_app.this.id
}

output "app_arn" {
  description = "Amplify app ARN."
  value       = aws_amplify_app.this.arn
}

output "default_domain" {
  description = "Amplify default domain."
  value       = aws_amplify_app.this.default_domain
}

output "branch_name" {
  description = "Amplify branch name."
  value       = aws_amplify_branch.this.branch_name
}

output "branch_url" {
  description = "Default URL for the Amplify branch."
  value       = "https://${aws_amplify_branch.this.branch_name}.${aws_amplify_app.this.default_domain}"
}
