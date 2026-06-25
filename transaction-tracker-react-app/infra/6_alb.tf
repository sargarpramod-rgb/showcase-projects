############################################
# VARIABLES
############################################

variable "vpc_id" {
  description = "VPC ID where ALB will be created"
  type        = string
}

variable "ec2_instance_id" {
  description = "EC2 instance ID to attach"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group for ALB"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN (MUST be in same region as ALB)"
  type        = string
}

############################################
# DATA SOURCES
############################################

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

############################################
# TARGET GROUP
############################################

resource "aws_lb_target_group" "transaction_tracker_tg" {
  name     = "transaction-tracker-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/actuator/health"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }

  target_type = "instance"

  tags = {
    Name = "transaction-tracker-tg"
  }
}

############################################
# APPLICATION LOAD BALANCER
############################################

resource "aws_lb" "transaction_tracker_alb" {
  name               = "transaction-tracker-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = data.aws_subnets.default.ids

  tags = {
    Name = "transaction-tracker-alb"
  }
}

############################################
# HTTP LISTENER (REDIRECT TO HTTPS)
############################################

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.transaction_tracker_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

############################################
# HTTPS LISTENER
############################################

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.transaction_tracker_alb.arn
  port              = 443
  protocol          = "HTTPS"

  ssl_policy      = "ELBSecurityPolicy-2016-08"
  certificate_arn = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.transaction_tracker_tg.arn
  }
}

############################################
# ATTACH EC2 TO TARGET GROUP
############################################

resource "aws_lb_target_group_attachment" "ec2_attachment" {
  target_group_arn = aws_lb_target_group.transaction_tracker_tg.arn
  target_id        = var.ec2_instance_id
  port             = 8080
}

############################################
# OUTPUTS
############################################

output "alb_dns_name" {
  value = aws_lb.transaction_tracker_alb.dns_name
}
