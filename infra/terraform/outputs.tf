output "frontend_bucket_name" {
  description = "S3 bucket name for frontend assets."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.this.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.this.domain_name
}

output "cloudfront_url" {
  description = "CloudFront HTTPS URL."
  value       = "https://${aws_cloudfront_distribution.this.domain_name}"
}

output "lambda_function_name" {
  description = "Backend Lambda function name."
  value       = aws_lambda_function.backend.function_name
}

output "lambda_function_url" {
  description = "Backend Lambda Function URL."
  value       = aws_lambda_function_url.backend.function_url
}

output "slides_bucket_name" {
  description = "Slide storage bucket name."
  value       = module.slide_bucket.bucket_name
}
