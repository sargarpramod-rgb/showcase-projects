#!/bin/bash

set -e

echo "🚀 Starting deployment..."

############################################

# CONFIG

############################################

REPO_URL="https://github.com/sargarpramod-rgb/showcase-projects.git"
REPO_DIR="showcase-projects"

APP_NAME="transaction-tracker-backend"
JAR_NAME="target/transaction-tracker-backend-0.0.1-SNAPSHOT.jar"
LOG_FILE="app.log"

############################################

# INSTALL DEPENDENCIES

############################################

echo "📦 Installing dependencies..."

sudo yum update -y
sudo yum install -y git java-17-amazon-corretto wget

############################################

# SET JAVA_HOME

############################################

if ! grep -q "JAVA_HOME" ~/.bashrc; then
echo "☕ Setting JAVA_HOME..."
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-amazon-corretto' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
fi

############################################

# INSTALL MAVEN

############################################

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

############################################

# CLONE OR UPDATE REPO

############################################

echo "📥 Cloning repository..."

if [ -d "$REPO_DIR" ]; then
echo "📁 Repo exists. Pulling latest code..."
cd $REPO_DIR
git pull
else
git clone $REPO_URL
cd $REPO_DIR
fi

############################################

# MOVE INTO BACKEND PROJECT (IMPORTANT)

############################################

cd showcase-projects/transaction-tracker-react-app/backend/

############################################

# FIX H2 DB DIR

############################################

echo "🛠️ Creating H2 database directory..."

mkdir -p data1/H2
chmod -R 755 data1/H2

############################################

# BUILD APP

############################################

echo "🔨 Building application..."

mvn clean package -Dmaven.test.skip=true

############################################

# STOP EXISTING APP

############################################

echo "🛑 Stopping existing application..."

pkill -f $APP_NAME || true

############################################

# START APP

############################################

echo "▶️ Starting application..."

nohup java -jar $JAR_NAME --spring.profiles.active=prod > $LOG_FILE 2>&1 &

sleep 5

############################################

# VERIFY

############################################

echo "✅ Checking application status..."

ps -ef | grep $APP_NAME | grep -v grep || echo "⚠️ App may not have started"

echo "📄 Logs: tail -f $LOG_FILE"

echo "🎉 Deployment complete!"
