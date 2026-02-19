# WSG-Check

A Web Sustainability Guidelines checker for websites. It checks a website against the Web Sustainability Guidelines and provides a report on the sustainability of the website.

## Architecture

The architecture of WSG-Check is based on a modular design. It consists of the following modules:

- **Core Module**: This module is responsible for the core functionality of the application, including fetching the website content, parsing it, and running the checks against the Web Sustainability Guidelines.
- **Checks Module**: This module contains the individual checks that are run against the website content. Each check is implemented as a separate function that takes the website content as input and returns a result indicating whether the check passed or failed.
- **Report Module**: This module is responsible for generating the report based on the results of the checks. It takes the results from the Checks Module and formats them into a readable report that can be displayed to the user.
- **CLI Module**: This module provides a command-line interface for users to interact with the application. It allows users to specify the website they want to check and displays the generated report in the terminal.
- **API Module**: This module provides an API for other applications to interact with WSG-Check. It allows other applications to send requests to WSG-Check and receive the generated report in response. 
- **Utils Module**: This module contains utility functions that are used across the application, such as functions for making HTTP requests, parsing HTML content, and handling errors.
- **Config Module**: This module is responsible for managing the configuration of the application, including settings for the checks, report generation, and API endpoints.
- **Frontend Module**: This module provides a user interface for users to interact with the application through a web browser. It allows users to input the website they want to check and displays the generated report in a user-friendly format.

## Technologies Used

- **Node.js**: The core runtime environment for the application, allowing us to run JavaScript on the server side.
- **Next.js**: A React framework used for building the frontend of the application, providing server-side rendering and a great developer experience.
- **React v19**: The JavaScript library used for building the user interface of the application.
- **ESLint**: A tool for identifying and fixing problems in JavaScript code, ensuring code quality and consistency across the project.
- **Prettier**: A code formatter that helps maintain a consistent style across the codebase, making it easier to read and maintain.
- **Jest**: A testing framework used for writing and running tests to ensure the correctness of the application.
- **Axios**: A promise-based HTTP client used for making requests to fetch website content and interact with APIs.
- **Cheerio**: A library for parsing and manipulating HTML content, used for extracting information from the fetched website content.
- **Dotenv**: A module that loads environment variables from a .env file into process.env, allowing for easy configuration of the application.
- **ES Modules**: The module system used for organizing the code into separate files and allowing for better code organization and maintainability. 
- **TypeScript**: A typed superset of JavaScript that adds static types to the language, improving code quality and developer experience.
- **Husky**: A tool for managing Git hooks, allowing us to run scripts before commits and pushes to ensure code quality and consistency.
- **Lint-staged**: A tool for running linters on staged Git files, ensuring that only the files that are being committed are checked for code quality issues.
- **ESLint Config Prettier**: A configuration for ESLint that disables rules that conflict with Prettier, allowing for seamless integration between the two tools.
- **PandaCSS**: A utility-first CSS framework used for styling the frontend of the application, providing a flexible and efficient way to create responsive designs.  
- **Netlify**: A platform for deploying and hosting the application, providing continuous deployment and a global content delivery network for fast performance.
- **GitHub Actions**: A CI/CD platform used for automating the testing and deployment of the application, ensuring that code changes are properly tested and deployed to production.
- **ArkUI**: A component library used for building the user interface of the application, providing a set of pre-built components that can be easily customized and integrated into the frontend.

## Feaures 

- **Website Analysis**: The core feature of WSG-Check is the ability to analyze a website against the Web Sustainability Guidelines. Users can input a website URL, and the application will fetch the content, run the checks, and generate a report on the sustainability of the website.
- **Detailed Reporting**: The application provides a detailed report that includes the results of each check, along with explanations and recommendations for improving the sustainability of the website. The report is designed to be user-friendly and easy to understand, making it accessible to users with varying levels of technical expertise.
- **Command-Line Interface**: WSG-Check includes a command-line interface that allows users to run checks and generate reports directly from the terminal. This feature is particularly useful for developers and technical users who prefer working in a command-line environment.

