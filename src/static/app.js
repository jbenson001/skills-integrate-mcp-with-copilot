document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authMessage = document.getElementById("auth-message");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const activateForm = document.getElementById("activate-form");
  const userInfo = document.getElementById("user-info");
  const userEmailSpan = document.getElementById("user-email");
  const logoutButton = document.getElementById("logout-button");
  const showLoginButton = document.getElementById("show-login");
  const showRegisterButton = document.getElementById("show-register");
  const activateEmailInput = document.getElementById("activate-email");
  const activationTokenInput = document.getElementById("activation-token");

  let authToken = localStorage.getItem("mergingtonAuthToken");
  let currentUserEmail = localStorage.getItem("mergingtonUserEmail");

  function showForm(form) {
    [loginForm, registerForm, activateForm].forEach((element) => {
      element.classList.add("hidden");
    });
    form.classList.remove("hidden");
  }

  function setActiveTab(tabButton) {
    [showLoginButton, showRegisterButton].forEach((button) => {
      button.classList.remove("active");
    });
    tabButton.classList.add("active");
  }

  function setAuthState(token, email) {
    authToken = token;
    currentUserEmail = email;
    localStorage.setItem("mergingtonAuthToken", token);
    localStorage.setItem("mergingtonUserEmail", email);
    updateAuthUi();
  }

  function clearAuthState() {
    authToken = null;
    currentUserEmail = null;
    localStorage.removeItem("mergingtonAuthToken");
    localStorage.removeItem("mergingtonUserEmail");
    updateAuthUi();
  }

  function showAuthMessage(text, type = "info") {
    authMessage.textContent = text;
    authMessage.className = `message ${type}`;
    authMessage.classList.remove("hidden");
    setTimeout(() => {
      authMessage.classList.add("hidden");
    }, 6000);
  }

  function updateAuthUi() {
    if (authToken && currentUserEmail) {
      userEmailSpan.textContent = currentUserEmail;
      userInfo.classList.remove("hidden");
      showForm(loginForm);
      loginForm.classList.add("hidden");
      registerForm.classList.add("hidden");
      activateForm.classList.add("hidden");
    } else {
      userInfo.classList.add("hidden");
      setActiveTab(showLoginButton);
      showForm(loginForm);
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    const showRemove = currentUserEmail === email;
                    return `<li><span class="participant-email">${email}</span>${showRemove ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Leave</button>` : ""}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");

    if (!authToken) {
      showAuthMessage("You must be logged in to unregister.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        messageDiv.classList.remove("hidden");
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const activity = activitySelect.value;
    if (!activity) {
      showAuthMessage("Please select an activity.", "error");
      return;
    }
    if (!authToken) {
      showAuthMessage("You must be logged in to sign up.", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        messageDiv.classList.remove("hidden");
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        setAuthState(result.token, result.email);
        showAuthMessage("Logged in successfully.", "success");
        fetchActivities();
      } else {
        showAuthMessage(result.detail || "Login failed.", "error");
      }
    } catch (error) {
      showAuthMessage("Login request failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("register-name").value;
    const grade = document.getElementById("register-grade").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, grade, email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        showAuthMessage("Registration created. Check your token to activate your account.", "success");
        activateEmailInput.value = email;
        activationTokenInput.value = result.activation_token || "";
        setActiveTab(showRegisterButton);
        showForm(activateForm);
      } else {
        showAuthMessage(result.detail || "Registration failed.", "error");
      }
    } catch (error) {
      showAuthMessage("Registration request failed. Please try again.", "error");
      console.error("Error registering:", error);
    }
  });

  activateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = activateEmailInput.value;
    const token = activationTokenInput.value;

    try {
      const response = await fetch("/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token }),
      });

      const result = await response.json();
      if (response.ok) {
        showAuthMessage("Account activated. You can now log in.", "success");
        setActiveTab(showLoginButton);
        showForm(loginForm);
      } else {
        showAuthMessage(result.detail || "Activation failed.", "error");
      }
    } catch (error) {
      showAuthMessage("Activation request failed. Please try again.", "error");
      console.error("Error activating account:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    clearAuthState();
    showAuthMessage("You have been logged out.", "info");
    fetchActivities();
  });

  showLoginButton.addEventListener("click", () => {
    setActiveTab(showLoginButton);
    showForm(loginForm);
  });

  showRegisterButton.addEventListener("click", () => {
    setActiveTab(showRegisterButton);
    showForm(registerForm);
  });

  updateAuthUi();
  fetchActivities();
});
