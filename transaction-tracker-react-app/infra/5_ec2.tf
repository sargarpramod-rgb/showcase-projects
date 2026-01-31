resource "aws_instance" "expense_tracker" {
  ami           = "ami-04233b5aecce09244"   # 🔄 Replace with a valid AMI ID for your region
  instance_type = "t3.micro"                # 🔄 Replace with desired instance type
  subnet_id     = "subnet-0177ca2deaa3c0574" # 🔄 Replace with your subnet ID

  vpc_security_group_ids = ["sg-0c6d7b799250fe548"] # 🔄 Replace with your security group ID
  iam_instance_profile   = aws_iam_instance_profile.ec2_secrets_profile.name         # 🔄 Replace with your IAM instance profile name

  root_block_device {
    volume_size           = 8             
    volume_type           = "gp3"          
    delete_on_termination = true
  }

  cpu_options {
   core_count       = 1
   threads_per_core = 2
  }

  metadata_options {
    http_tokens               = "required"
    http_endpoint             = "enabled"
    http_put_response_hop_limit = 2
    instance_metadata_tags    = "disabled"
  }

  availability_zone = "eu-north-1c"   

  tags = {
    Name        = "WheresMyMoneyApp" 
    Environment = "PROD"              
  }
}
