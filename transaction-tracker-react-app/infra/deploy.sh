#!/bin/bash

#############################################################################
# Transaction Tracker Infrastructure Setup Script
# This script uses AWS CLI to create all infrastructure resources
# Compatible with: Linux, macOS, CloudShell
#############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-eu-north-1}"
VPC_ID="${VPC_ID:-}"
ENVIRONMENT="PROD"
TIMESTAMP=$(date +%s)

#############################################################################
# Helper Functions
#############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    log_success "AWS CLI found"
}

check_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    log_success "AWS credentials validated"
}

get_default_vpc() {
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=isDefault,Values=true" \
        --region "$AWS_REGION" \
        --query 'Vpcs[0].VpcId' \
        --output text)
    
    if [ "$VPC_ID" == "None" ] || [ -z "$VPC_ID" ]; then
        log_error "No default VPC found in region $AWS_REGION"
        exit 1
    fi
    log_success "Using VPC: $VPC_ID"
}

get_default_subnet() {
    SUBNET_ID=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
        --region "$AWS_REGION" \
        --query 'Subnets[0].SubnetId' \
        --output text)
    
    if [ "$SUBNET_ID" == "None" ] || [ -z "$SUBNET_ID" ]; then
        log_error "No default subnet found in VPC $VPC_ID"
        exit 1
    fi
    log_success "Using Subnet: $SUBNET_ID"
}

get_latest_ami() {
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" \
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
        --output text \
        --region "$AWS_REGION")
    
    if [ -z "$AMI_ID" ] || [ "$AMI_ID" == "None" ]; then
        log_error "Could not find latest Amazon Linux 2 AMI"
        exit 1
    fi
    log_success "Using AMI: $AMI_ID"
}

#############################################################################
# Security Group Functions
#############################################################################

create_alb_security_group() {
    log_info "Creating ALB Security Group..."
    
    ALB_SG_ID=$(aws ec2 create-security-group \
        --group-name "TransactionTrackerALBSecurityGroup-$TIMESTAMP" \
        --description "Allows HTTP/HTTPS traffic for ALB" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --query 'GroupId' \
        --output text)
    
    log_success "ALB Security Group created: $ALB_SG_ID"
    
    # Add ingress rules for HTTP
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Add ingress rules for HTTPS
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region "$AWS_REGION" 2>/dev/null || true
    
    log_success "ALB Security Group rules added"
}

create_ec2_security_group() {
    log_info "Creating EC2 Security Group..."
    
    EC2_SG_ID=$(aws ec2 create-security-group \
        --group-name "TransactionTrackerEC2SecurityGroup-$TIMESTAMP" \
        --description "Security group for EC2 instances" \
        --vpc-id "$VPC_ID" \
        --region "$AWS_REGION" \
        --query 'GroupId' \
        --output text)
    
    log_success "EC2 Security Group created: $EC2_SG_ID"
    
    # Add ingress rule for port 8080 from ALB
    aws ec2 authorize-security-group-ingress \
        --group-id "$EC2_SG_ID" \
        --protocol tcp \
        --port 8080 \
        --source-group "$ALB_SG_ID" \
        --region "$AWS_REGION" 2>/dev/null || true
    
    # Add ingress rule for SSH
    aws ec2 authorize-security-group-ingress \
        --group-id "$EC2_SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$AWS_REGION" 2>/dev/null || true
    
    log_success "EC2 Security Group rules added"
}

#############################################################################
# IAM Role Functions
#############################################################################

create_iam_role() {
    log_info "Creating IAM Role for EC2..."
    
    # Create trust policy
    cat > /tmp/trust-policy.json << 'EOF'
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
    
    IAM_ROLE_NAME="EC2SecretsRole-$TIMESTAMP"
    
    aws iam create-role \
        --role-name "$IAM_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "Allows EC2 instances to access Secrets Manager" 2>/dev/null || true
    
    log_success "IAM Role created: $IAM_ROLE_NAME"
    
    # Create inline policy for Secrets Manager access
    cat > /tmp/secrets-policy.json << 'EOF'
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
    
    aws iam put-role-policy \
        --role-name "$IAM_ROLE_NAME" \
        --policy-name "EC2SecretsPolicy" \
        --policy-document file:///tmp/secrets-policy.json 2>/dev/null || true
    
    log_success "IAM Policy attached"
    
    # Create instance profile
    aws iam create-instance-profile \
        --instance-profile-name "EC2SecretsProfile-$TIMESTAMP" 2>/dev/null || true
    
    aws iam add-role-to-instance-profile \
        --instance-profile-name "EC2SecretsProfile-$TIMESTAMP" \
        --role-name "$IAM_ROLE_NAME" 2>/dev/null || true
    
    log_success "Instance Profile created: EC2SecretsProfile-$TIMESTAMP"
    
    INSTANCE_PROFILE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):instance-profile/EC2SecretsProfile-$TIMESTAMP"
    
    # Give IAM time to propagate
    sleep 10
}

#############################################################################
# EC2 Instance Functions
#############################################################################

create_ec2_instance() {
    log_info "Creating EC2 Instance..."
    
    EC2_INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0517aaaee33d8b971 \
  --instance-type t3.micro \
  --subnet-id subnet-008f0c5b183f1116a \
  --security-group-ids sg-00e7529dde0e40b0d \
  --iam-instance-profile Arn=arn:aws:iam::316502580034:instance-profile/EC2SecretsProfile-1782076503 \
  --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=8,VolumeType=gp3,DeleteOnTermination=true}' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WheresMyMoneyApp},{Key=Environment,Value=PROD}]' \
  --region us-east-1 \
  --query 'Instances[0].InstanceId' \
  --output text)
    
    log_success "EC2 Instance created: $EC2_INSTANCE_ID"
    
    # Wait for instance to be in running state
    log_info "Waiting for EC2 instance to start..."
    aws ec2 wait instance-running \
        --instance-ids "$EC2_INSTANCE_ID" \
        --region "$AWS_REGION"
    
    log_success "EC2 Instance is running"
}

#############################################################################
# ALB Functions
#############################################################################

create_alb() {
    log_info "Creating Application Load Balancer..."
    
    # Get all subnets in the VPC
    SUBNETS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" \
        --query 'Subnets[*].SubnetId' \
        --output text \
        --region "$AWS_REGION")
    
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name "TransactionTrackerALB-$TIMESTAMP" \
        --subnets $SUBNETS \
        --security-groups "$ALB_SG_ID" \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --tags "Key=Name,Value=TransactionTrackerALB" "Key=Environment,Value=$ENVIRONMENT" \
        --region "$AWS_REGION" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)
    
    ALB_NAME=$(echo "$ALB_ARN" | awk -F: '{print $NF}' | awk -F/ '{print $(NF-1)"/"$NF}')
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "$ALB_ARN" \
        --region "$AWS_REGION" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    log_success "ALB created with DNS: $ALB_DNS"
}

create_target_group() {
    log_info "Creating Target Group..."
    
    TG_ARN=$(aws elbv2 create-target-group \
        --name "TransactionTrackerTG-$TIMESTAMP" \
        --protocol HTTP \
        --port 8080 \
        --vpc-id "$VPC_ID" \
        --health-check-protocol HTTP \
        --health-check-path /actuator/health \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 5 \
        --unhealthy-threshold-count 2 \
        --matcher HttpCode=200 \
        --target-type instance \
        --region "$AWS_REGION" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)
    
    log_success "Target Group created: $TG_ARN"
    
    # Register EC2 instance with target group
    aws elbv2 register-targets \
        --target-group-arn "$TG_ARN" \
        --targets Id="$EC2_INSTANCE_ID",Port=8080 \
        --region "$AWS_REGION"
    
    log_success "EC2 instance registered with Target Group"
}

create_alb_listener() {
    log_info "Creating ALB Listener..."
    
    # Check if certificate ARN is provided
    if [ -z "$ACM_CERTIFICATE_ARN" ]; then
        log_warning "No ACM Certificate ARN provided. Creating HTTP listener only."
        log_warning "To add HTTPS, provide ACM_CERTIFICATE_ARN environment variable"
        
        aws elbv2 create-listener \
            --load-balancer-arn "$ALB_ARN" \
            --protocol HTTP \
            --port 80 \
            --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
            --region "$AWS_REGION" > /dev/null
        
        log_success "HTTP Listener created"
    else
        log_info "Creating HTTPS listener with certificate: $ACM_CERTIFICATE_ARN"
        
        aws elbv2 create-listener \
            --load-balancer-arn "$ALB_ARN" \
            --protocol HTTPS \
            --port 443 \
            --certificates CertificateArn="$ACM_CERTIFICATE_ARN" \
            --ssl-policy ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09 \
            --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
            --region "$AWS_REGION" > /dev/null
        
        log_success "HTTPS Listener created"
        
        # Also create HTTP -> HTTPS redirect
        aws elbv2 create-listener \
            --load-balancer-arn "$ALB_ARN" \
            --protocol HTTP \
            --port 80 \
            --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
            --region "$AWS_REGION" > /dev/null
        
        log_success "HTTP to HTTPS redirect created"
    fi
}

#############################################################################
# Output Functions
#############################################################################

save_outputs() {
    log_info "Saving infrastructure outputs..."
    
    OUTPUT_FILE="deployment-outputs.txt"
    
    cat > "$OUTPUT_FILE" << EOF
================================================================================
Transaction Tracker Infrastructure Deployment - Outputs
Deployment Date: $(date)
================================================================================

REGION: $AWS_REGION
VPC ID: $VPC_ID
SUBNET ID: $SUBNET_ID
TIMESTAMP: $TIMESTAMP

------- SECURITY GROUPS -------
ALB Security Group ID: $ALB_SG_ID
EC2 Security Group ID: $EC2_SG_ID

------- EC2 INSTANCE -------
Instance ID: $EC2_INSTANCE_ID
AMI ID: $AMI_ID
Instance Type: t3.micro
Availability Zone: ${AWS_REGION}a

------- IAM -------
IAM Role: EC2SecretsRole-$TIMESTAMP
Instance Profile: EC2SecretsProfile-$TIMESTAMP

------- LOAD BALANCER -------
ALB ARN: $ALB_ARN
ALB DNS Name: $ALB_DNS
ALB Name: $ALB_NAME
Target Group ARN: $TG_ARN

------- NEXT STEPS -------
1. Update CloudFront distribution with new ALB DNS: $ALB_DNS
   - Go to CloudFront console
   - Edit your distribution
   - Update the ALB origin domain name to: $ALB_DNS

2. SSH into EC2 instance:
   aws ec2-instance-connect open-tunnel --instance-id $EC2_INSTANCE_ID --region $AWS_REGION

3. Deploy your application to EC2 instance on port 8080

4. ALB will forward traffic to EC2 on port 8080

================================================================================
EOF
    
    log_success "Outputs saved to: $OUTPUT_FILE"
    cat "$OUTPUT_FILE"
}

#############################################################################
# Main Execution
#############################################################################

main() {
    log_info "=========================================="
    log_info "Transaction Tracker Infrastructure Setup"
    log_info "=========================================="
    
    log_info "Configuration:"
    log_info "  AWS Region: $AWS_REGION"
    log_info "  ACM Certificate ARN: ${ACM_CERTIFICATE_ARN:-Not provided}"
    echo ""
    
    # Pre-checks
    check_aws_cli
    check_credentials
    
    # Get/validate VPC and subnet
    if [ -z "$VPC_ID" ]; then
        get_default_vpc
    else
        log_success "Using specified VPC: $VPC_ID"
    fi
    get_default_subnet
    get_latest_ami
    
    # Create resources
    create_alb_security_group
    create_ec2_security_group
    create_iam_role
    create_ec2_instance
    create_alb
    create_target_group
    create_alb_listener
    
    # Output results
    echo ""
    log_success "=========================================="
    log_success "Infrastructure created successfully!"
    log_success "=========================================="
    echo ""
    
    save_outputs
}

# Run main function
main
