resource "aws_security_group" "launch_wizard_1" {
  name        = "launch-wizard-1"   
  description = "launch-wizard-1 created 2026-01-01T12:24:51.899Z"
  vpc_id      = "vpc-00f38496cab1adde6"   

  # Inbound rules
  ingress {
    description = "Allow TCP 8080 from SG sg-0c280f224c5947049"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"

    #  SG ID of ALB to allow traffic from
    security_groups = ["sg-032e06887c0406d25"]
  }

  ingress {
    description = "Allow SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"

    cidr_blocks = ["0.0.0.0/0"]   
  }

  # Outbound rules
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "launch-wizard-1"  
  }
}
