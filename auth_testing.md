# Emergent Google Auth Testing Playbook

1. Verify `/api/auth/me` returns 401 without a session.
2. Seed a test user and session in MongoDB using custom `user_id`, then verify `/api/auth/me` with Authorization Bearer.
3. Verify the booking confirmation step opens Google sign-in before booking submission.
4. Verify Google callback exchanges `session_id`, sets an httpOnly `session_token` cookie, and returns to the app.
5. Verify authenticated booking submits customer name, email, profile photo, and required phone number.
6. Verify logout clears the session and protected admin review endpoints reject unauthenticated requests.
