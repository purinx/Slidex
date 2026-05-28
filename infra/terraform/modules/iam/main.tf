locals {
  name_prefix   = "${var.project_name}-${var.environment}"
  clean_prefix  = trim(var.slides_prefix, "/")
  object_prefix = local.clean_prefix == "" ? "*" : "${local.clean_prefix}/*"
}

data "aws_iam_policy_document" "amplify_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["amplify.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "slides_access" {
  statement {
    sid = "ListSlidesBucket"
    actions = [
      "s3:ListBucket"
    ]
    resources = [var.slides_bucket_arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = [local.clean_prefix == "" ? "*" : "${local.clean_prefix}/*"]
    }
  }

  statement {
    sid = "ReadWriteSlidesObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]
    resources = [
      "${var.slides_bucket_arn}/${local.object_prefix}"
    ]
  }
}

resource "aws_iam_role" "amplify_compute" {
  name               = "${local.name_prefix}-amplify-compute"
  assume_role_policy = data.aws_iam_policy_document.amplify_assume_role.json

  tags = var.tags
}

resource "aws_iam_policy" "slides_access" {
  name   = "${local.name_prefix}-slides-access"
  policy = data.aws_iam_policy_document.slides_access.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "slides_access" {
  role       = aws_iam_role.amplify_compute.name
  policy_arn = aws_iam_policy.slides_access.arn
}
