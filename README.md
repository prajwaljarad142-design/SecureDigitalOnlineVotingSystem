# Secure Digital Online Voting System

This project is a browser-based voting prototype built with HTML, CSS, and JavaScript. It demonstrates:

- voter registration
- voter ID based verification
- webcam-based face authentication
- stored face snapshot preview during registration
- live verification snapshot during voter check
- one-vote-per-voter enforcement
- live vote results
- election overview metrics for registered voters, ballots cast, and turnout

## Files

- `index.html` - app structure
- `style.css` - responsive interface styling
- `app.js` - registration, voter verification, face verification, vote handling, and live results logic

## How to Run

1. Open `index.html` in a modern browser.
2. Allow camera access when prompted.
3. Register a voter and capture a face snapshot.
4. Enter the voter ID to begin verification.
5. Start the verification camera and verify the face.
6. Cast the vote after face authentication succeeds.

## Important Note

This is a front-end prototype for learning and demonstration. It is not a production-secure election platform because:

- data is stored in browser `localStorage`
- the face matching is a lightweight image-comparison demo, not a certified biometric engine
- there is no backend, database, audit trail, or real cryptographic ballot infrastructure

For a real deployment, the next step would be a secure backend with encrypted storage, verified identity checks, tamper-resistant logging, and server-side vote validation.
