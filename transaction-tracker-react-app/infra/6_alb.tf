# Target Group
resource "aws_lb_target_group" "transaction_tracker_tg" {
  name     = "TransactionTrackerTargetGroup"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = "vpc-00f38496cab1adde6"

  health_check {
    protocol            = "HTTP"
    port                = "traffic-port"
    path                = "/actuator/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 5
    unhealthy_threshold = 2
    matcher             = "200"
  }

  target_type      = "instance"
  protocol_version = "HTTP1"
  ip_address_type  = "ipv4"
}

# Get the default VPC
data "aws_vpc" "default" {
  default = true
}

# Get all default subnets in that VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Application Load Balancer using default subnets
resource "aws_lb" "transaction_tracker_alb" {
  name               = "TranscationTrackerALB"
  internal           = false
  load_balancer_type = "application"
  security_groups    = ["sg-032e06887c0406d25"]

  # Automatically use all default subnets
  subnets            = data.aws_subnets.default.ids

  ip_address_type    = "ipv4"

  tags = {
    Name = "TranscationTrackerALB"
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.transaction_tracker_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09"

  certificate_arn   = "arn:aws:acm:eu-north-1:316502580034:certificate/738ecd59-8c13-4ca7-855f-c4192301bd07"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.transaction_tracker_tg.arn

    forward {
      target_group {
        arn    = aws_lb_target_group.transaction_tracker_tg.arn
        weight = 1
      }

      stickiness {
        enabled  = false
        duration = 3600
      }
    }
  }
}