"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import os
from pathlib import Path
from uuid import uuid4
import uvicorn

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# In-memory activity database
activities = {
    "Chess Club": {
        "description": "Learn strategies and compete in chess tournaments",
        "schedule": "Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 12,
        "participants": ["michael@mergington.edu", "daniel@mergington.edu"]
    },
    "Programming Class": {
        "description": "Learn programming fundamentals and build software projects",
        "schedule": "Tuesdays and Thursdays, 3:30 PM - 4:30 PM",
        "max_participants": 20,
        "participants": ["emma@mergington.edu", "sophia@mergington.edu"]
    },
    "Gym Class": {
        "description": "Physical education and sports activities",
        "schedule": "Mondays, Wednesdays, Fridays, 2:00 PM - 3:00 PM",
        "max_participants": 30,
        "participants": ["john@mergington.edu", "olivia@mergington.edu"]
    },
    "Soccer Team": {
        "description": "Join the school soccer team and compete in matches",
        "schedule": "Tuesdays and Thursdays, 4:00 PM - 5:30 PM",
        "max_participants": 22,
        "participants": ["liam@mergington.edu", "noah@mergington.edu"]
    },
    "Basketball Team": {
        "description": "Practice and play basketball with the school team",
        "schedule": "Wednesdays and Fridays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["ava@mergington.edu", "mia@mergington.edu"]
    },
    "Art Club": {
        "description": "Explore your creativity through painting and drawing",
        "schedule": "Thursdays, 3:30 PM - 5:00 PM",
        "max_participants": 15,
        "participants": ["amelia@mergington.edu", "harper@mergington.edu"]
    },
    "Drama Club": {
        "description": "Act, direct, and produce plays and performances",
        "schedule": "Mondays and Wednesdays, 4:00 PM - 5:30 PM",
        "max_participants": 20,
        "participants": ["ella@mergington.edu", "scarlett@mergington.edu"]
    },
    "Math Club": {
        "description": "Solve challenging problems and participate in math competitions",
        "schedule": "Tuesdays, 3:30 PM - 4:30 PM",
        "max_participants": 10,
        "participants": ["james@mergington.edu", "benjamin@mergington.edu"]
    },
    "Debate Team": {
        "description": "Develop public speaking and argumentation skills",
        "schedule": "Fridays, 4:00 PM - 5:30 PM",
        "max_participants": 12,
        "participants": ["charlotte@mergington.edu", "henry@mergington.edu"]
    }
}

# In-memory student account store
users = {}
activation_tokens = {}
active_sessions = {}

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    grade: str


class ActivateRequest(BaseModel):
    email: str
    token: str


class LoginRequest(BaseModel):
    email: str
    password: str


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")

    token = authorization.split(" ", 1)[1]
    email = active_sessions.get(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    user = users.get(email)
    if not user or not user.get("active"):
        raise HTTPException(status_code=401, detail="Account is not activated")

    return user


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.get("/me")
def read_current_user(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    return {"email": user["email"], "name": user["name"], "grade": user["grade"]}


@app.post("/register")
def register(payload: RegisterRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password must not be empty")
    if email in users:
        raise HTTPException(status_code=400, detail="Email already registered")

    activation_token = uuid4().hex
    users[email] = {
        "email": email,
        "password": payload.password,
        "name": payload.name,
        "grade": payload.grade,
        "active": False
    }
    activation_tokens[email] = activation_token

    return {
        "message": "Account created. Activate your account using the token sent to your email.",
        "activation_token": activation_token
    }


@app.post("/activate")
def activate(payload: ActivateRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if email not in users:
        raise HTTPException(status_code=404, detail="Account not found")

    expected_token = activation_tokens.get(email)
    if not expected_token or payload.token != expected_token:
        raise HTTPException(status_code=400, detail="Invalid activation token")

    users[email]["active"] = True
    activation_tokens.pop(email, None)
    return {"message": "Account activated successfully. You can now log in."}


@app.post("/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    user = users.get(email)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("active"):
        raise HTTPException(status_code=401, detail="Account is not activated")

    token = uuid4().hex
    active_sessions[token] = email
    return {"message": "Login successful", "token": token, "email": email, "name": user["name"]}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, authorization: Optional[str] = Header(None), email: Optional[str] = None):
    user = get_current_user(authorization)
    if email:
        if email.lower() != user["email"]:
            raise HTTPException(status_code=403, detail="Cannot sign up another user")

    email = user["email"]

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    if email in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is already signed up")

    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, authorization: Optional[str] = Header(None), email: Optional[str] = None):
    user = get_current_user(authorization)
    if email:
        if email.lower() != user["email"]:
            raise HTTPException(status_code=403, detail="Cannot unregister another user")

    email = user["email"]

    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    activity = activities[activity_name]
    if email not in activity["participants"]:
        raise HTTPException(status_code=400, detail="Student is not signed up for this activity")

    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
