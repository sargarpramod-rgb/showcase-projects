# 💸 Transaction Tracker App
Secure, Cloud-Native Personal Finance Management System

A full-stack, production-ready web application that allows users to upload, categorize, and analyze financial transactions securely using modern cloud and authentication best practices.

Live Demo: https://www.wheresmymoneyat.in
---

## 👋 Why This Project?

This project demonstrates:
- End-to-end system design
- Secure OAuth 2.0 authentication
- Cloud-native AWS architecture
- Clean frontend UX ( Improved furhter in the upcoming releases).
- Scalable backend patterns

---

## ⚡ Key Highlights

- Secure Google OAuth 2.0 login
- CloudFront + S3 + ALB + EC2 architecture
- Secrets managed via AWS Secrets Manager
- Spring Boot backend with REST APIs
- React frontend with interactive visualization
- Designed for extensibility (ML, exports, DB upgrades)

---

## 🏗️ Architecture Overview

The system follows cloud-native and security-first design principles.

### High-Level Architecture

User -> CloudFront (SSL + CDN)  
CloudFront -> S3 (Static Content)  
CloudFront -> Application Load Balancer  
Application Load Balancer -> Spring Boot Backend (EC2)  
Spring Boot Backend -> Google OAuth 2.0  

### Low-Level Architecture (Security & OAuth)

- OAuth 2.0 Authorization Code Flow
- IAM Role based access to AWS Secrets Manager
- OAuth Client ID & Secret stored securely
- Tokens exchanged securely with Google OAuth

---

## 🧾 Functional Capabilities

### Transaction Upload
- Upload transaction reports (MSMoney format)
- Backend parsing and validation

### Categorization
- Inline category editing
- Bulk update support
- Persistent storage

### Visual Insights
- Category and sub-category breakdown
- Monthly and yearly views

### Security
- OAuth 2.0 Authorization Code flow
- No secrets stored in code
- IAM-based secret access

---

## 🖥️ Tech Stack

Frontend: React.js  
Backend: Spring Boot, Spring Security  
Authentication: Google OAuth 2.0  
Database: H2 (file-based)  
Cloud: AWS (CloudFront, S3, ALB, EC2, IAM, Secrets Manager)  
Visualization: Chart-based UI  

---

## 🚀 Future Enhancements

- PDF / Excel / CSV transaction support
- Encrypted, per-user data storage
- ML-based auto-categorization
- Exportable financial reports
- Advanced analytics dashboards

---

## 🤝 Contact

If you are a recruiter or engineer:
- Feel free to explore the repository
- Star the project if you find it useful
- Reach out for collaboration


## 🖼️ Screenshots

### 🧾 Transaction Upload View
![Transaction Upload](https://github.com/sargarpramod-rgb/showcase-projects/blob/4727c9a1386a15ed1d694f9e4ecbb711f1320f21/transaction-tracker-react-app/frontend/assets/images/%401_Landing%20Page.png)

### 🏷️ Categorization View
![Categorization](https://github.com/sargarpramod-rgb/showcase-projects/blob/377c8e3f8e5ca4f49e3219e883db99d47ab9a515/transaction-tracker-react-app/frontend/assets/images/%402_View%20Transactions.PNG)

### 📊 Expense Visualization
![Pie Chart](https://github.com/sargarpramod-rgb/showcase-projects/blob/4727c9a1386a15ed1d694f9e4ecbb711f1320f21/transaction-tracker-react-app/frontend/assets/images/%406_Category%20and%20sub%20category%20breakdown.PNG)
