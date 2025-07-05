const firebaseConfig = {
  apiKey: "AIzaSyA3kU6OZwTJGDoLLgcDI0iPyxCQXu-PoeU",
  authDomain: "challenges-rsv.firebaseapp.com",
  projectId: "challenges-rsv",
  storageBucket: "challenges-rsv.firebasestorage.app",
  messagingSenderId: "48484358922",
  appId: "1:48484358922:web:09a42733e88e53d7fb38f3",
  measurementId: "G-CCDL6VJV21"
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
const loader = document.getElementById("loader");

let currentUser = null;

// Auth events
signupBtn.onclick = () => {
  showLoader();
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => {
      hideLoader();
      alert(err.message);
    });
};

loginBtn.onclick = () => {
  showLoader();
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => {
      hideLoader();
      alert(err.message);
    });
};

logoutBtn.onclick = () => {
  showLoader(); // Afficher le loader pendant la déconnexion
  database.ref("connected/" + currentUser.uid).remove();
  database.ref("alreadyDrawn/" + currentUser.uid).remove();
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

// Tirage au sort limité
drawChallengeBtn.addEventListener("click", () => {
  const uid = currentUser.uid;
  const email = currentUser.email;

  database.ref("alreadyDrawn/" + uid).once("value", snap => {
    if (snap.exists()) {
      alert("❌ Tu as déjà tiré un défi.");
      return;
    }

    database.ref("connected").once("value", userSnap => {
      const connectedUsers = userSnap.val();
      const connectedCount = connectedUsers ? Object.keys(connectedUsers).length : 0;

      database.ref("drawCount").once("value", countSnap => {
        const drawCount = countSnap.val() || 0;

        if (drawCount >= connectedCount) {
          alert("🎯 Limite de tirages atteinte.");
          return;
        }

        database.ref("challenges").once("value", challengeSnap => {
          const data = challengeSnap.val();
          if (!data) {
            selectedChallenge.textContent = "Aucun défi disponible.";
            return;
          }

          const challengesArray = Object.values(data);
          const randomChallenge = challengesArray[Math.floor(Math.random() * challengesArray.length)];

          database.ref("selectedChallenge").set(randomChallenge);
          database.ref("drawCount").set(drawCount + 1);
          database.ref("alreadyDrawn/" + uid).set({ email: email });

          console.log("✅ Tirage enregistré.");
        });
      });
    });
  });
});

// Auth state change
auth.onAuthStateChanged(user => {
    hideLoader();

    if (user) {
    
    currentUser = user;
    userNameSpan.textContent = user.email;
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");

    database.ref("connected/" + user.uid).set({ name: user.email });
    database.ref("connected/" + user.uid).onDisconnect().remove();
    database.ref("alreadyDrawn/" + user.uid).onDisconnect().remove();

    database.ref("connected").once("value", snap => {
      if (snap.numChildren() === 1) {
        database.ref("drawCount").set(0);
      }
    });

    loadChallenges();
    loadConnectedUsers();

    database.ref("selectedChallenge").on("value", snapshot => {
      const challenge = snapshot.val();
      if (challenge) {
        selectedChallenge.textContent = `🎯 Défi tiré : ${challenge.text} (par ${challenge.user})`;
      } else {
        selectedChallenge.textContent = "Aucun défi tiré pour le moment.";
      }
    });

  } else {
    currentUser = null;
    authContainer.classList.remove("hidden");
    appContainer.classList.add("hidden");
    resetDataIfEmpty(); // ✅ Réinitialise si plus personne connecté
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

        if (currentUser && challenge.user === currentUser.email) {
          const delBtn = document.createElement("button");
          delBtn.textContent = "×";
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

// Loader animation
function showLoader() {
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function resetDataIfEmpty() {
  database.ref("connected").once("value", snap => {
    if (!snap.exists()) {
      // Tous les utilisateurs sont déconnectés : on réinitialise tout
      database.ref("drawCount").set(0);
      database.ref("selectedChallenge").remove();
      database.ref("alreadyDrawn").remove();
      console.log("♻️ Données réinitialisées (aucun utilisateur connecté)");
    }
  });
}


// Initial load
loadChallenges();
loadConnectedUsers();
