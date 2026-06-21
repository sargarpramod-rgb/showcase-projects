# Get the default VPC
data "aws_vpc" "default" {
  default = true
}

# Local values to determine VPC and other resources
locals {
  vpc_id = var.vpc_id != "" ? var.vpc_id : data.aws_vpc.default.id
}
