
// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ------------------------------------------------------------------
// ⚠️ PASTE YOUR FIREBASE CONFIG HERE
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDXtG1lqiC8l4OL8z2fIfLFVwU2tNXGO84",
  authDomain: "coutingplatform.firebaseapp.com",
  projectId: "coutingplatform",
  storageBucket: "coutingplatform.firebasestorage.app",
  messagingSenderId: "539720969654",
  appId: "1:539720969654:web:3a0f3c9be02a6d5fc8a517"
};
// Initialize Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const playersCol = collection(db, "players");

// --- EVENT LISTENER: ADD PLAYER ---
const form = document.getElementById('addPlayerForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPlayer = {
            name: document.getElementById('pName').value,
            position: document.getElementById('pPos').value,
            s1: document.getElementById('pS1').value,
            s2: document.getElementById('pS2').value,
            s3: document.getElementById('pS3').value,
            s4: document.getElementById('pS4').value,
            data: document.getElementById('pData').value,
            link: document.getElementById('pLink').value,
            timestamp: new Date()
        };

        try {
            await addDoc(playersCol, newPlayer);
            alert("שחקן נוסף בהצלחה!");
            form.reset(); 
            
            // Close the modal using Bootstrap API
            const modalEl = document.querySelector('#addModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("שגיאה בשמירה: " + error.message);
        }
    });
}

// --- REAL-TIME LISTENER: LOAD PLAYERS ---
onSnapshot(playersCol, (snapshot) => {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ''; 
    let topTargets = 0;

    snapshot.forEach((docSnap) => {
        const p = docSnap.data();
        const id = docSnap.id; 

        // Count V's
        const scores = [p.s1, p.s2, p.s3, p.s4];
        const vCount = scores.filter(x => x === 'V').length;
        if(vCount >= 3) topTargets++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${p.name}</td>
            <td>${p.position}</td>
            <td>${renderBadge(p.s1)}</td>
            <td>${renderBadge(p.s2)}</td>
            <td>${renderBadge(p.s3)}</td>
            <td>${renderBadge(p.s4)}</td>
            <td>${renderBadge(p.data)}</td>
            <td>${p.link ? `<a href="${p.link}" target="_blank" class="btn btn-sm btn-primary">Link</a>` : '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deletePlayer('${id}')">🗑</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('total-count').innerText = snapshot.size;
    document.getElementById('top-targets-count').innerText = topTargets;
});

// --- HELPER FUNCTIONS ---

// We attach deletePlayer to 'window' so it can be called from the HTML string above
window.deletePlayer = async (id) => {
    if(confirm("האם למחוק את השחקן מהמערכת?")) {
        try {
            await deleteDoc(doc(db, "players", id));
        } catch(error) {
            console.error("Error deleting:", error);
        }
    }
}

function renderBadge(val) {
    if(val === 'V') return '<span class="status-v">V</span>';
    if(val === 'X') return '<span class="status-x">X</span>';
    if(val === '?') return '<span class="status-q">?</span>';
    return '<span class="text-muted">-</span>';
}
