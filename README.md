# showcase-projects
# 💸 Transaction Tracker App

A simple web application to help users upload, categorize, and visualize their financial transactions with ease.

## 🚀 Features

- 📁 **Upload Transactions**: Import transaction files (CSV, Excel, or PDF).
- 🏷️ **Categorize Transactions**: Assign or edit categories for individual transactions.
- 📊 **Visual Insights**: View a real-time pie chart breakdown of expenses by category.
- 🔄 **Auto Save**: All changes are saved to the backend instantly (or with Save button).

## 🖥️ Tech Stack

- **Frontend**: React.js
- **Backend**: Spring Boot (Java)
- **Database**: Need to implement save to database.
- **Visualization**: pie chart rendering

✨ Upcoming Features (Planned)

📅 Date filtering and monthly summaries
🧠 Auto-categorization using ML
📥 Export categorized reports


### ⚙️ React Setup

1. **Navigate to the React project directory**
   After cloning the repository, go to the folder containing the React frontend code:

   ```bash
   cd frontend
   ```

2. **Install dependencies and run the app**
   Use the following commands to install missing packages and start the development server:

   ```bash
   npm install
   npm start
   ```

   This will launch the app at `http://localhost:3000`.

3. **Build for production**
   Once development is complete, generate a production-ready build:

   ```bash
   npm run build
   ```

   This will create a `build/` folder with the optimized static files.

---

### 🔗 Integrating React with Spring Boot Backend

1. **Copy the production build to the backend**
   Move the contents of the `build/` folder into the `src/main/resources/static` directory of your Spring Boot project.

2. **Update static asset paths (if needed)**
   Open `index.html` in the build folder and ensure CSS and JS paths are relative.
   For example, change:

   ```html
   <link href="/static/css/main.e6c13ad2.css" rel="stylesheet" />
   ```

   to:

   ```html
   <link href="/css/main.e6c13ad2.css" rel="stylesheet" />
   ```

3. **Start the Spring Boot backend**
   Use the following command to run your backend:

   ```bash
   ./mvnw spring-boot:run
   ```

   App will now serve the React frontend directly from the backend.

