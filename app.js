const STORAGE_KEYS = {
  voters: "sdovs_voters",
  votes: "sdovs_votes",
};

const candidates = ["Asha Patel", "Rahul Gandhi", "Narendra Modi"];

const state = {
  currentVoterId: null,
  voterIdentified: false,
  faceVerified: false,
  registerFaceDescriptor: null,
  registerStream: null,
  verifyStream: null,
};

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const voteForm = document.getElementById("voteForm");

const regNameInput = document.getElementById("regName");
const regVoterIdInput = document.getElementById("regVoterId");
const regEmailInput = document.getElementById("regEmail");

const loginVoterIdInput = document.getElementById("loginVoterId");

const registerVideo = document.getElementById("registerVideo");
const verifyVideo = document.getElementById("verifyVideo");
const registerCanvas = document.getElementById("registerCanvas");
const verifyCanvas = document.getElementById("verifyCanvas");

const registerCameraBtn = document.getElementById("registerCameraBtn");
const captureFaceBtn = document.getElementById("captureFaceBtn");
const verifyCameraBtn = document.getElementById("verifyCameraBtn");
const verifyFaceBtn = document.getElementById("verifyFaceBtn");
const castVoteBtn = document.getElementById("castVoteBtn");
const resetDemoBtn = document.getElementById("resetDemoBtn");

const registerFaceStatus = document.getElementById("registerFaceStatus");
const verifyFaceStatus = document.getElementById("verifyFaceStatus");
const currentVoterName = document.getElementById("currentVoterName");
const sessionState = document.getElementById("sessionState");
const resultsList = document.getElementById("resultsList");
const activityLog = document.getElementById("activityLog");
const registeredCount = document.getElementById("registeredCount");
const ballotsCount = document.getElementById("ballotsCount");
const turnoutRate = document.getElementById("turnoutRate");
const systemState = document.getElementById("systemState");
const registerSnapshot = document.getElementById("registerSnapshot");
const verifySnapshot = document.getElementById("verifySnapshot");

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getVoters() {
  return loadJSON(STORAGE_KEYS.voters, []);
}

function setVoters(voters) {
  saveJSON(STORAGE_KEYS.voters, voters);
}

function getVotes() {
  return loadJSON(STORAGE_KEYS.votes, []);
}

function setVotes(votes) {
  saveJSON(STORAGE_KEYS.votes, votes);
}

async function startCamera(videoElement, streamKey) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported in this browser.");
  }

  if (state[streamKey]) {
    stopStream(streamKey);
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240, facingMode: "user" },
    audio: false,
  });

  videoElement.srcObject = stream;
  state[streamKey] = stream;
}

function stopStream(streamKey) {
  if (state[streamKey]) {
    state[streamKey].getTracks().forEach((track) => track.stop());
    state[streamKey] = null;
  }
}

function captureDescriptor(videoElement, canvasElement) {
  if (!videoElement.srcObject) {
    throw new Error("Start the camera before capturing a face.");
  }

  const context = canvasElement.getContext("2d", { willReadFrequently: true });
  canvasElement.width = 320;
  canvasElement.height = 240;
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  const { data } = context.getImageData(0, 0, canvasElement.width, canvasElement.height);
  const descriptor = [];
  const sampleWindow = 24;

  for (let y = 0; y < canvasElement.height; y += sampleWindow) {
    for (let x = 0; x < canvasElement.width; x += sampleWindow) {
      let total = 0;
      let count = 0;

      for (let sy = y; sy < Math.min(y + sampleWindow, canvasElement.height); sy += 4) {
        for (let sx = x; sx < Math.min(x + sampleWindow, canvasElement.width); sx += 4) {
          const index = (sy * canvasElement.width + sx) * 4;
          const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
          total += luminance;
          count += 1;
        }
      }

      descriptor.push(Number((total / count).toFixed(2)));
    }
  }

  return descriptor;
}

function captureSnapshot(videoElement, canvasElement) {
  const descriptor = captureDescriptor(videoElement, canvasElement);
  return {
    descriptor,
    imageDataUrl: canvasElement.toDataURL("image/jpeg", 0.92),
  };
}

function compareDescriptors(reference, candidate) {
  if (!reference || !candidate || reference.length !== candidate.length) {
    return 0;
  }

  const totalDifference = reference.reduce((sum, value, index) => sum + Math.abs(value - candidate[index]), 0);
  const averageDifference = totalDifference / reference.length;
  return Math.max(0, 100 - averageDifference) / 100;
}

function updateSessionUI() {
  const voters = getVoters();
  const voter = voters.find((entry) => entry.voterId === state.currentVoterId);
  currentVoterName.textContent = voter ? voter.name : "None";

  let text = "Not Authenticated";
  if (state.voterIdentified && !state.faceVerified) {
    text = "Voter Identified";
  } else if (state.voterIdentified && state.faceVerified) {
    text = "Face Verified";
  }

  sessionState.textContent = text;
  castVoteBtn.disabled = !(state.voterIdentified && state.faceVerified);
  systemState.textContent = state.faceVerified ? "Voting Window Open" : text;
}

function updateOverview() {
  const voters = getVoters();
  const votes = getVotes();
  const turnout = voters.length ? Math.round((votes.length / voters.length) * 100) : 0;

  registeredCount.textContent = String(voters.length);
  ballotsCount.textContent = String(votes.length);
  turnoutRate.textContent = `${turnout}%`;
}

function logActivity(message, tone = "neutral") {
  const entry = document.createElement("div");
  entry.className = "activity-entry";

  const title = document.createElement("strong");
  title.textContent = message;
  if (tone === "success") {
    title.classList.add("status-success");
  } else if (tone === "warning") {
    title.classList.add("status-warning");
  } else if (tone === "danger") {
    title.classList.add("status-danger");
  }

  const time = document.createElement("small");
  time.textContent = new Date().toLocaleString();

  entry.append(title, time);
  activityLog.prepend(entry);
}

function renderResults() {
  const votes = getVotes();
  const totalVotes = votes.length;

  resultsList.innerHTML = "";
  candidates.forEach((candidate) => {
    const count = votes.filter((vote) => vote.candidate === candidate).length;
    const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;

    const card = document.createElement("div");
    card.className = "result-card";

    const head = document.createElement("div");
    head.className = "result-head";
    head.innerHTML = `<span>${candidate}</span><span>${count} vote(s)</span>`;

    const track = document.createElement("div");
    track.className = "progress-track";

    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.width = `${percent}%`;

    const footer = document.createElement("small");
    footer.textContent = `${percent}% of total votes`;

    track.appendChild(bar);
    card.append(head, track, footer);
    resultsList.appendChild(card);
  });
}

function clearSession() {
  state.currentVoterId = null;
  state.voterIdentified = false;
  state.faceVerified = false;
  verifyFaceStatus.textContent = "Face verification pending.";
  verifyFaceStatus.className = "helper-text";
  loginForm.reset();
  updateSessionUI();
}

registerCameraBtn.addEventListener("click", async () => {
  try {
    await startCamera(registerVideo, "registerStream");
    registerFaceStatus.textContent = "Camera ready. Capture the voter face.";
    registerFaceStatus.className = "helper-text status-success";
  } catch (error) {
    registerFaceStatus.textContent = error.message;
    registerFaceStatus.className = "helper-text status-danger";
    logActivity(`Registration camera failed: ${error.message}`, "danger");
  }
});

captureFaceBtn.addEventListener("click", () => {
  try {
    const capture = captureSnapshot(registerVideo, registerCanvas);
    state.registerFaceDescriptor = capture.descriptor;
    registerSnapshot.src = capture.imageDataUrl;
    registerFaceStatus.textContent = "Face enrolled successfully for this voter.";
    registerFaceStatus.className = "helper-text status-success";
    logActivity("Face reference captured for voter registration.", "success");
  } catch (error) {
    registerFaceStatus.textContent = error.message;
    registerFaceStatus.className = "helper-text status-danger";
  }
});

registerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!state.registerFaceDescriptor) {
    registerFaceStatus.textContent = "Capture the face reference before registration.";
    registerFaceStatus.className = "helper-text status-danger";
    return;
  }

  const voters = getVoters();
  const voterId = regVoterIdInput.value.trim();
  const email = regEmailInput.value.trim().toLowerCase();

  if (voters.some((entry) => entry.voterId === voterId)) {
    registerFaceStatus.textContent = "A voter with this ID already exists.";
    registerFaceStatus.className = "helper-text status-danger";
    logActivity(`Duplicate registration blocked for voter ID ${voterId}.`, "warning");
    return;
  }

  voters.push({
    name: regNameInput.value.trim(),
    voterId,
    email,
    faceDescriptor: state.registerFaceDescriptor,
    hasVoted: false,
    registeredAt: new Date().toISOString(),
  });

  setVoters(voters);
  registerForm.reset();
  state.registerFaceDescriptor = null;
  registerSnapshot.removeAttribute("src");
  registerFaceStatus.textContent = "Voter registered. Credentials and face reference stored locally.";
  registerFaceStatus.className = "helper-text status-success";
  updateOverview();
  logActivity(`Voter ${voterId} registered successfully.`, "success");
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const voters = getVoters();
  const voterId = loginVoterIdInput.value.trim();
  const voter = voters.find((entry) => entry.voterId === voterId);

  if (!voter) {
    state.currentVoterId = null;
    state.voterIdentified = false;
    state.faceVerified = false;
    updateSessionUI();
    verifyFaceStatus.textContent = "No voter found with that ID.";
    verifyFaceStatus.className = "helper-text status-danger";
    logActivity(`Voter lookup failed for voter ID ${voterId}.`, "danger");
    return;
  }

  if (voter.hasVoted) {
    clearSession();
    verifyFaceStatus.textContent = "This voter has already cast a ballot.";
    verifyFaceStatus.className = "helper-text status-warning";
    logActivity(`Blocked repeat login for voter ID ${voterId} after completed vote.`, "warning");
    return;
  }

  state.currentVoterId = voterId;
  state.voterIdentified = true;
  state.faceVerified = false;
  verifyFaceStatus.textContent = "Voter found. Start the camera and confirm face authentication.";
  verifyFaceStatus.className = "helper-text status-success";
  updateSessionUI();
  logActivity(`Voter identified for voter ID ${voterId}.`, "success");
});

verifyCameraBtn.addEventListener("click", async () => {
  try {
    await startCamera(verifyVideo, "verifyStream");
    verifyFaceStatus.textContent = "Verification camera ready.";
    verifyFaceStatus.className = "helper-text status-success";
  } catch (error) {
    verifyFaceStatus.textContent = error.message;
    verifyFaceStatus.className = "helper-text status-danger";
    logActivity(`Verification camera failed: ${error.message}`, "danger");
  }
});

verifyFaceBtn.addEventListener("click", () => {
  if (!state.currentVoterId || !state.voterIdentified) {
    verifyFaceStatus.textContent = "Identify the voter before face verification.";
    verifyFaceStatus.className = "helper-text status-warning";
    return;
  }

  try {
    const voters = getVoters();
    const voter = voters.find((entry) => entry.voterId === state.currentVoterId);
    const capture = captureSnapshot(verifyVideo, verifyCanvas);
    verifySnapshot.src = capture.imageDataUrl;
    const similarity = compareDescriptors(voter.faceDescriptor, capture.descriptor);

    if (similarity >= 0.82) {
      state.faceVerified = true;
      verifyFaceStatus.textContent = `Face authentication passed with ${(similarity * 100).toFixed(1)}% match confidence.`;
      verifyFaceStatus.className = "helper-text status-success";
      logActivity(`Face verification passed for voter ID ${voter.voterId}.`, "success");
    } else {
      state.faceVerified = false;
      verifyFaceStatus.textContent = `Face authentication failed. Match confidence ${(similarity * 100).toFixed(1)}%.`;
      verifyFaceStatus.className = "helper-text status-danger";
      logActivity(`Face verification failed for voter ID ${voter.voterId}.`, "danger");
    }

    updateSessionUI();
  } catch (error) {
    verifyFaceStatus.textContent = error.message;
    verifyFaceStatus.className = "helper-text status-danger";
  }
});

voteForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!(state.voterIdentified && state.faceVerified && state.currentVoterId)) {
    logActivity("Vote attempt blocked because the session is not fully authenticated.", "warning");
    return;
  }

  const formData = new FormData(voteForm);
  const candidate = formData.get("candidate");

  if (!candidate) {
    logActivity("Vote submission blocked because no candidate was selected.", "warning");
    return;
  }

  const voters = getVoters();
  const votes = getVotes();
  const voter = voters.find((entry) => entry.voterId === state.currentVoterId);

  if (!voter || voter.hasVoted) {
    logActivity("Vote submission blocked because the voter is not eligible.", "warning");
    clearSession();
    return;
  }

  voter.hasVoted = true;
  votes.push({
    voterId: voter.voterId,
    candidate,
    submittedAt: new Date().toISOString(),
  });

  setVoters(voters);
  setVotes(votes);
  renderResults();
  updateOverview();
  logActivity(`Vote cast successfully by voter ID ${voter.voterId} for ${candidate}.`, "success");
  voteForm.reset();
  clearSession();
});

resetDemoBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEYS.voters);
  localStorage.removeItem(STORAGE_KEYS.votes);
  stopStream("registerStream");
  stopStream("verifyStream");
  clearSession();
  renderResults();
  registerForm.reset();
  state.registerFaceDescriptor = null;
  registerSnapshot.removeAttribute("src");
  verifySnapshot.removeAttribute("src");
  registerFaceStatus.textContent = "No face enrolled yet.";
  registerFaceStatus.className = "helper-text";
  updateOverview();
  logActivity("Demo data reset. All voters and votes were cleared from local storage.", "warning");
});

window.addEventListener("beforeunload", () => {
  stopStream("registerStream");
  stopStream("verifyStream");
});

renderResults();
updateOverview();
updateSessionUI();
logActivity("Secure digital online voting system initialized.", "success");
