# Mergington High School Activities API

A super simple FastAPI application that allows students to view and sign up for extracurricular activities.

## Features

- View all available extracurricular activities
- Register student accounts with email and password
- Activate student accounts with an activation token
- Login to sign up for activities and manage your participation

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                                 |
| ------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count         |
| POST   | `/register`                                                      | Create a student account and receive an activation token                   |
| POST   | `/activate`                                                      | Activate a student account using the registration token                   |
| POST   | `/login`                                                         | Login with email and password to receive an auth token                    |
| POST   | `/activities/{activity_name}/signup`                             | Sign up for an activity using your authenticated student account           |
| DELETE | `/activities/{activity_name}/unregister`                         | Unregister from an activity using your authenticated student account       |

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

All data is stored in memory, which means data will be reset when the server restarts.
