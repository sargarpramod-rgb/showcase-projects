# IAM Role for EC2 to access Secrets Manager
resource "aws_iam_role" "ec2_secrets_role" {
  name               = "EC2SecretsRole"   
  description        = "Allows EC2 instances to call AWS services on your behalf."
  path               = "/"
  max_session_duration = 3600             

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

# Optional: Attach a policy to allow EC2 to read secrets
resource "aws_iam_role_policy" "ec2_secrets_policy" {
  name = "EC2SecretsPolicy"
  role = aws_iam_role.ec2_secrets_role.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "*"   
    }
  ]
}
EOF
}

# Instance profile (needed to attach role to EC2)
resource "aws_iam_instance_profile" "ec2_secrets_profile" {
  name = "EC2SecretsProfile"   
  role = aws_iam_role.ec2_secrets_role.name
}