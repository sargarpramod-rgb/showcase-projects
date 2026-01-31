provider "aws" {
  region = "eu-north-1"
}

resource "aws_security_group" "transaction_tracker_alb_sg" {
  name        = "TransactionTrackerALBSecurityGroup"
  description = "Allows HTTPS traffic for ALB"
  vpc_id      = "vpc-06ef886a2716c2fcc"

  # Ingress rules
  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress rules
  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "TransactionTrackerALBSecurityGroup"
  }
}