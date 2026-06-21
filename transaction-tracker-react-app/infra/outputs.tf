# Output ALB DNS name for use in CloudFront
output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.transaction_tracker_alb.dns_name
}

# Output ALB security group ID
output "alb_security_group_id" {
  description = "Security Group ID of the ALB"
  value       = aws_security_group.transaction_tracker_alb_sg.id
}

# Output EC2 instance ID
output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.expense_tracker.id
}

# Output EC2 security group ID
output "ec2_security_group_id" {
  description = "Security Group ID of the EC2 instance"
  value       = aws_security_group.launch_wizard_1.id
}

# Output VPC ID being used
output "vpc_id" {
  description = "VPC ID being used for resources"
  value       = local.vpc_id
}
