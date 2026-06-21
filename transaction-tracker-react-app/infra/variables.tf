# AWS Region
variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "eu-north-1"
}

# VPC Configuration
variable "vpc_id" {
  description = "VPC ID where resources will be created"
  type        = string
  default     = "" # Leave empty to use default VPC
}

# ALB Security Group
variable "alb_security_group_id" {
  description = "Security Group ID for ALB (optional - will be created if not provided)"
  type        = string
  default     = ""
}

# EC2 Security Group
variable "ec2_security_group_id" {
  description = "Security Group ID for EC2 (optional - will be created if not provided)"
  type        = string
  default     = ""
}

# EC2 Configuration
variable "ec2_ami_id" {
  description = "AMI ID for EC2 instance"
  type        = string
  default     = "" # Leave empty to use latest Amazon Linux 2
}

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "ec2_subnet_id" {
  description = "Subnet ID for EC2 instance (optional - will use default subnet if not provided)"
  type        = string
  default     = ""
}

variable "ec2_availability_zone" {
  description = "Availability Zone for EC2 instance"
  type        = string
  default     = "eu-north-1a"
}

# ACM Certificate
variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for ALB (must be in eu-north-1)"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for CloudFront and ACM certificate"
  type        = string
  default     = "www.wheresmymoneyat.in"
}

# CloudFront Configuration
variable "cloudfront_s3_bucket_name" {
  description = "S3 bucket name for CloudFront origin"
  type        = string
  default     = "transaction-tracker-react-app-pramod-2026"
}
