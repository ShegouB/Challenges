// Remplace les valeurs ci-dessous par les tiennes depuis Firebase console
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "4",
  appId: "",
  measurementId: ""
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Elements
const authContainer = document.getElementById("authContainer");
const appContainer = document.getElementById("appContainer");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const userNameSpan = document.getElementById("userName");
const challengeForm = document.getElementById("challengeForm");
const challengeInput = document.getElementById("challengeInput");
const challengeList = document.getElementById("challengeList");
const drawChallengeBtn = document.getElementById("drawChallengeBtn");
const selectedChallenge = document.getElementById("selectedChallenge");
const connectedUsers = document.getElementById("connectedUsers");

let currentUser = null;

// Auth events
signupBtn.onclick = () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(err => alert(err.message));
};

loginBtn.onclick = () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(err => alert(err.message));
};

logoutBtn.onclick = () => {
    database.ref("connected/" + currentUser.uid).remove();
    auth.signOut();
};

// Challenge add
challengeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = challengeInput.value.trim();
    if (text) {
        database.ref("challenges").push({
            text: text,
            user: currentUser.email,
            timestamp: Date.now()
        });
        challengeInput.value = "";
    }
});

// Tirage au sort
drawChallengeBtn.addEventListener("click", () => {
    database.ref("challenges").once("value", snapshot => {
        const data = snapshot.val();
        if (!data) {
            selectedChallengeDiv.textContent = "Aucun défi disponible";
            return;
        }
        const challengesArray = Object.values(data);
        const randomChallenge = challengesArray[Math.floor(Math.random() * challengesArray.length)];
        
        // Stocker dans Firebase sous "selectedChallenge"
        database.ref("selectedChallenge").set(randomChallenge);

    });
});


// Auth state change
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userNameSpan.textContent = user.email;
        authContainer.classList.add("hidden");
        appContainer.classList.remove("hidden");

        database.ref("connected/" + user.uid).set({ name: user.email });
        database.ref("connected/" + user.uid).onDisconnect().remove();

        loadChallenges();
        loadConnectedUsers();

        // Afficher les défis tirés
            database.ref("selectedChallenge").once("value", snapshot => {
                const challenge = snapshot.val();
                if (challenge) {
                    selectedChallengeDiv.textContent = `Défi tiré : ${challenge.text} (par ${challenge.user})`;
                } else {
                    selectedChallengeDiv.textContent = "Aucun défi tiré pour le moment.";
                }
            });
    } else {
        currentUser = null;
        authContainer.classList.remove("hidden");
        appContainer.classList.add("hidden");
    }
});


// Charger défis
function loadChallenges() {
    database.ref("challenges").on("value", snapshot => {
        const data = snapshot.val();
        challengeList.innerHTML = "";
        if (data) {
            Object.entries(data).forEach(([id, challenge]) => {
                const li = document.createElement("li");
                li.textContent = `${challenge.text} (par ${challenge.user})`;

                // Supprimer si auteur
                if (currentUser && challenge.user === currentUser.email) {
                    const delBtn = document.createElement("button");
                    delBtn.textContent = "x";
                    delBtn.onclick = () => {
                        if (confirm("Supprimer ce défi ?")) {
                            database.ref("challenges/" + id).remove();
                            database.ref(`completed/${currentUser.uid}/${id}`).remove();
                        }
                    };
                    li.appendChild(delBtn);
                }


                challengeList.appendChild(li);
            });
        }
    });
}


// Charger utilisateurs connectés
function loadConnectedUsers() {
    database.ref("connected").on("value", snapshot => {
        const data = snapshot.val();
        connectedUsers.innerHTML = "";
        if (data) {
            Object.values(data).forEach(user => {
                const li = document.createElement("li");
                li.textContent = user.name;
                connectedUsers.appendChild(li);
            });
        }
    });
}


loadChallenges();
loadConnectedUsers();

