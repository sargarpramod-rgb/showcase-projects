# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)



## Various Categories:

### EMI
    -- Home Loan EMI
    -- Great Learning loan EMI
    -- AC Loan EMI
### Investments
    -- Mutual Fund Investments
    -- NPS Investments
    -- PPF Investments
    -- Others
### Education
    -- Stationary (Books, Printout, item for school project etc)
    -- School Activities Fees (Annual DAy, Field Trip etc)
    -- School fees
    -- Tuition fees
### House running expenses
    -- Society Maintainence
    -- Groceries
       -- Online (BB Daily, Zepto)
       -- Offline
    -- Vegetables
### Food/Going Out (weekends mostly)
    -- Mall visits
    -- Online Food Order (e.g. Zomato)
    -- Restaurants visit
    -- Prashant Corner
### Medical Expenses
    -- Son's body wash, creams etc.
    -- General doctor visits and expenses
    -- Skin doctor
    -- Baby expenses
       -- Medical items (Diaper , wipes etc)
       -- Doctor visits and vaccination
### Shopping
    -- Clothes
    -- Home Items (TV, Fridge, Sofa etc)
### Leisure
    -- Travel (Domestic, International)
    -- Hotel Stay
### Home Repairs/Service
    -- AC Service
    -- Pest Control
    -- Breakdown of existing item
### Adhoc
    -- God's pooja at home
    -- Temple visits


### Changes required (Must haves)
    -- Tooltip to show complete Name of the the Payee till @ or add new column if its easy.
    -- Integration with Backend and File Upload
    -- Git Commit, working from File Upload to Pie chart breakup.

### Changes required (Phase-2)

     --> Two tables, one for Debit and one for Credit
     --> Filter and sort on the table.
     --> When user clicks on the show pie chart and if ay transactions haven't been assigned 
         category, show alert.
     --> Dropdowns should have empty value to remove it from all categories.

### AI customization
      -- Payee name being similar should be shown on UI (Prashant Corner, MS Prashant Corner should be categorized as same)
      -- Based on Past data, show predication for next month expenses.

### Customizations
    -- Ability to change small transaction limit.
    -- Ability to add/update categories/sub-categories

### Good to Have
    --> Ability to exclude certain transactions from report. (ADhoc Investementss, Self Transfer etc).


{
"payee": "Small Transactions",
"totalAmount": 35,
"transactionCount": 1,
"transactions": [
{
"number": null,
"date": null,
"payee": "Hidaram Sopaji Choud",
"amount": 35,
"memo": null
}
],
"category": "Uncategorized",
"subcategory": "Uncategorized"
},
{
"payee": "Hidaram Sopaji Choud",
"totalAmount": 0,
"transactionCount": 0,
"transactions": []
},

this extra Payee is problem