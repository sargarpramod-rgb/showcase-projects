#!/bin/bash

set -e

echo "🚀 Starting deployment..."

APP_NAME="transaction-tracker-backend"
JAR_NAME="target/transaction-tracker-backend-0.0.1-SNAPSHOT.jar"
LOG_FILE="app.log"

# -----------------------------
# Install dependencies, use Java17
# -----------------------------
echo "📦 Installing dependencies..."

sudo yum update -y
sudo yum install -y git java-17-amazon-corretto

# -----------------------------
# Set JAVA_HOME (only if not set)
# -----------------------------
if ! grep -q "JAVA_HOME" ~/.bashrc; then
  echo "☕ Setting JAVA_HOME..."
  echo 'export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto' >> ~/.bashrc
  echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
  source ~/.bashrc
fi

# -----------------------------
# Install Maven (if not present)
# -----------------------------
if ! command -v mvn &> /dev/null; then
  echo "📦 Installing Maven..."
  MAVEN_VERSION=3.9.9
  wget -q https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz
  tar -xvf apache-maven-${MAVEN_VERSION}-bin.tar.gz
  sudo mv apache-maven-${MAVEN_VERSION} /opt/maven

  echo 'export M2_HOME=/opt/maven' >> ~/.bashrc
  echo 'export PATH=$M2_HOME/bin:$PATH' >> ~/.bashrc
  source ~/.bashrc
fi

# -----------------------------
# Fix H2 DB directory issue
# -----------------------------
echo "🛠️ Creating H2 database directory..."

mkdir -p data
chmod -R 755 data

# -----------------------------
# Build application
# -----------------------------
echo "🔨 Building application..."

mvn clean package -Dmaven.test.skip=true

# -----------------------------
# Stop existing app (if running)
# -----------------------------
echo "🛑 Stopping existing application (if any)..."

pkill -f $APP_NAME || true

# -----------------------------
# Start application
# -----------------------------
echo "▶️ Starting application..."

nohup java -jar $JAR_NAME --spring.profiles.active=prod > $LOG_FILE 2>&1 &

sleep 5

# -----------------------------
# Verify
# -----------------------------
echo "✅ Checking application status..."

ps -ef | grep $APP_NAME | grep -v grep || echo "⚠️ App may not have started"

echo "📄 Logs: tail -f $LOG_FILE"

echo "🎉 Deployment complete!"
