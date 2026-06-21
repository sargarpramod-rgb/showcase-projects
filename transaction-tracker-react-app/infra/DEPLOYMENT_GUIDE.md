# Infrastructure Deployment Guide

This directory contains infrastructure as code (IaC) for the Transaction Tracker application in two formats:

## Option 1: AWS CLI Script (Recommended for current use)

### Prerequisites
- AWS CLI v2 installed
- AWS credentials configured
- Appropriate IAM permissions

### Quick Start

```bash
# Make script executable
chmod +x deploy.sh

# Deploy with default settings (uses default VPC)
./deploy.sh

# Deploy to specific region
AWS_REGION=us-east-1 ./deploy.sh

# Deploy with ACM certificate for HTTPS
ACM_CERTIFICATE_ARN="arn:aws:acm:eu-north-1:ACCOUNT:certificate/ID" ./deploy.sh

# Deploy to specific VPC
VPC_ID="vpc-xxxxxxxx" ./deploy.sh
```

### What the script creates

1. **Security Groups**
   - ALB Security Group (HTTP/HTTPS)
   - EC2 Security Group (port 8080 from ALB, SSH from anywhere)

2. **IAM Role & Instance Profile**
   - EC2 role with Secrets Manager access
   - Instance profile for EC2 instances

3. **EC2 Instance**
   - t3.micro instance with latest Amazon Linux 2
   - 8GB gp3 root volume
   - Tagged with environment and application name

4. **Application Load Balancer**
   - Internet-facing ALB
   - Target group on port 8080
   - HTTP listener (or HTTPS if certificate provided)
   - Health checks on `/actuator/health`

5. **Outputs**
   - All resource IDs and DNS names saved to `deployment-outputs.txt`

---

## Option 2: Terraform (For Infrastructure as Code)

### Prerequisites
- Terraform v1.0 or later
- AWS CLI configured
- Sufficient disk space (use v5 provider if space limited)

### Setup

```bash
# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
# Required: acm_certificate_arn (if using HTTPS)

# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan

# Apply changes
terraform apply
```

### Files

| File | Purpose |
|------|---------|
| `provider.tf` | AWS provider configuration |
| `variables.tf` | Input variables |
| `locals.tf` | Computed values (VPC detection) |
| `1_security_group.tf` | ALB security group |
| `2_ec2-security_group.tf` | EC2 security group |
| `4_iam_role.tf` | IAM role and policies |
| `5_ec2.tf` | EC2 instance configuration |
| `6_alb.tf` | ALB, target group, and listeners |
| `outputs.tf` | Output values |
| `7_cloudfront.tf` | CloudFront (manual update required) |

---

## Post-Deployment: Update CloudFront

After running either deployment method:

1. Get the ALB DNS name from outputs
2. Go to CloudFront console
3. Edit your distribution
4. Update the ALB origin with the new DNS name
5. Save and wait for distribution to update (~15-30 minutes)

---

## Environment Variables

### AWS CLI Script
```bash
AWS_REGION              # AWS region (default: eu-north-1)
VPC_ID                  # VPC ID (default: auto-detect default VPC)
ACM_CERTIFICATE_ARN     # ACM certificate ARN for HTTPS (optional)
```

### Terraform
```bash
TF_VAR_aws_region              # AWS region
TF_VAR_vpc_id                  # VPC ID
TF_VAR_acm_certificate_arn     # ACM certificate ARN
TF_VAR_ec2_instance_type       # Instance type (default: t3.micro)
TF_VAR_ec2_availability_zone   # Availability zone
TF_VAR_ec2_ami_id              # AMI ID (default: latest Amazon Linux 2)
```

---

## Troubleshooting

### AWS CLI Script fails

- Ensure AWS credentials are configured: `aws sts get-caller-identity`
- Check IAM permissions (need EC2, ELB, IAM permissions)
- Verify region has default VPC: `aws ec2 describe-vpcs --filters Name=isDefault,Values=true`

### Terraform fails to initialize

- Use Terraform v5 provider if disk space is limited
- Check `.terraform/lock.hcl` for lock conflicts
- Clear cache: `rm -rf .terraform ~/.terraform.d`

### ACM Certificate issues

- Certificate must be in the same region as ALB
- Certificate must be validated before use
- For CloudFront: Create separate cert in us-east-1

---

## Cleanup

### Destroy all AWS resources

**AWS CLI Script:**
```bash
# Script doesn't have destroy, use AWS Console or CLI manually:
aws ec2 terminate-instances --instance-ids <INSTANCE_ID>
aws elbv2 delete-load-balancer --load-balancer-arn <ALB_ARN>
aws ec2 delete-security-group --group-id <SG_ID>
aws iam delete-role --role-name <ROLE_NAME>
```

**Terraform:**
```bash
terraform destroy
```

---

## Support

For issues or questions, check:
- AWS CloudShell documentation
- Terraform AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS CLI documentation: https://docs.aws.amazon.com/cli/latest/userguide/
