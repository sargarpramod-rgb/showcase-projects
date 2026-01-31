Here’s a **plain‑text checklist** you can add directly to your AWS setup README. It covers both **requesting a new ACM certificate** and **adding the DNS validation record in GoDaddy** step by step:

---

### Requesting a New ACM Certificate (AWS Console)
1. Go to **AWS Management Console → ACM (Certificate Manager)**.  
2. Click **Request a certificate**.  
3. Choose **Request a public certificate**.  
4. Enter your domain name(s) (e.g., `example.com`, `www.example.com`).  
5. Click **Next**.  
6. Select **DNS validation** (recommended).  
7. Click **Request**.  
8. After submission, open the certificate details page.  
9. Under **Domain validation**, ACM will show one or more **CNAME records** that must be added to your DNS provider.  

---

### Adding ACM DNS Validation Record in GoDaddy
1. Log in to your **GoDaddy account**.  
2. Navigate to **My Products → Domains → DNS Management** for the domain you are validating.  
3. In the **DNS Records** section, click **Add Record**.  
4. Choose **CNAME** as the record type.  
5. Copy the **Name** (host) value provided by AWS ACM.  
   - Example: `_711c7c0b707fe49462ac5fda72fc04e1.jkddzztszm.acm-validations.aws`  
   - **Important:** If ACM shows a trailing dot (`.`), remove it when entering in GoDaddy.  
6. Copy the **Value/Target** provided by AWS ACM.  
   - Example: `xyz123.acm-validations.aws`  
   - Again, omit any trailing dot.  
7. Leave **TTL** at the default (usually 1 hour).  
8. Save the record.  
9. Wait for DNS propagation. Most updates take effect within an hour, but global propagation can take up to 48 hours.  
10. Return to the **AWS ACM Console → Certificates** page. Once ACM detects the CNAME record, the certificate status will change from **Pending validation** to **Issued**.  

---

### Verification (Optional but Recommended)
- Run:
  ```bash
  nslookup -type=CNAME _711c7c0b707fe49462ac5fda72fc04e1.jkddzztszm.acm-validations.aws
  ```
  or
  ```bash
  dig _711c7c0b707fe49462ac5fda72fc04e1.jkddzztszm.acm-validations.aws CNAME
  ```
- If the output shows the ACM validation target, ACM will issue the certificate shortly.

---

