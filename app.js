import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ⚠️ PASTE YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyDXtG1lqiC8l4OL8z2fIfLFVwU2tNXGO84",
  authDomain: "coutingplatform.firebaseapp.com",
  projectId: "coutingplatform",
  storageBucket: "coutingplatform.firebasestorage.app",
  messagingSenderId: "539720969654",
  appId: "1:539720969654:web:3a0f3c9be02a6d5fc8a517"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const playersCol = collection(db, "players");

// --- AUTO FILL LOGIC (THE SCRAPER) ---
const btnFetch = document.getElementById('btnFetch');
const inputLink = document.getElementById('pLink');

if(btnFetch) {
    btnFetch.addEventListener('click', async () => {
        const url = inputLink.value;
        if(!url) { alert("נא להדביק לינק קודם"); return; }

        // Start Loading Animation
        btnFetch.classList.add('loading');
        btnFetch.disabled = true;

        try {
            // Use AllOrigins Proxy to bypass CORS security
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if(!data.contents) throw new Error("No data found");

            // Convert text to HTML Document
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, "text/html");

            // --- 1. GET NAME ---
            // Transfermarkt usually puts name in <h1>. We remove the jersey number if present.
            let name = "Unknown";
            const h1 = doc.querySelector('h1');
            if(h1) name = h1.innerText.replace(/^\d+\s*/, '').trim(); // Remove leading numbers

            // --- 2. GET AGE ---
            // Look for "Age:" in the table cells
            let age = "";
            const tableCells = doc.querySelectorAll('.info-table__content');
            // Try to find specific cell that is typically the age
            // Often logic requires searching text content because classes change
            // Fallback: look for itemProp="birthDate"
            const ageSpan = doc.querySelector('[itemprop="birthDate"]');
            if(ageSpan) {
                // Calculate age from birthdate
                const birthDate = new Date(ageSpan.innerText.trim());
                const diff = Date.now() - birthDate.getTime();
                age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
            }

            // --- 3. GET LEAGUE ---
            let league = "";
            // Try to find league header
            const leagueHeader = doc.querySelector('.data-header__league');
            if(leagueHeader) {
                league = leagueHeader.innerText.trim();
            } else {
                // Fallback attempt
                const leagueLink = doc.querySelector('.data-header__club a');
                if(leagueLink) league = leagueLink.innerText.trim();
            }

            // FILL THE INPUTS
            document.getElementById('pName').value = name;
            document.getElementById('pAge').value = age;
            document.getElementById('pLeague').value = league;

        } catch (error) {
            console.error(error);
            alert("לא הצלחנו למשוך נתונים אוטומטית. נא למלא ידנית.");
        } finally {
            // Stop Loading
            btnFetch.classList.remove('loading');
            btnFetch.disabled = false;
        }
    });
}


// --- SAVE PLAYER ---
document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPlayer = {
        name: document.getElementById('pName').value,
        age: document.getElementById('pAge').value,     // New
        league: document.getElementById('pLeague').value, // New
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
        alert("שחקן נוסף!");
        document.getElementById('addPlayerForm').reset();
        const modal = bootstrap.Modal.getInstance(document.querySelector('#addModal'));
        modal.hide();
    } catch (e) {
        alert("שגיאה בשמירה");
    }
});

// --- RENDER TABLE ---
onSnapshot(playersCol, (snapshot) => {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ''; 
    let topTargets = 0;

    snapshot.forEach((docSnap) => {
        const p = docSnap.data();
        const id = docSnap.id; 

        const scores = [p.s1, p.s2, p.s3, p.s4];
        const vCount = scores.filter(x => x === 'V').length;
        if(vCount >= 3) topTargets++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${p.name}</td>
            <td>${p.age || '-'}</td>
            <td><span class="badge bg-light text-dark border">${p.league || '-'}</span></td>
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

window.deletePlayer = async (id) => {
    if(confirm("למחוק?")) {
        await deleteDoc(doc(db, "players", id));
    }
}

function renderBadge(val) {
    if(val === 'V') return '<span class="status-v">V</span>';
    if(val === 'X') return '<span class="status-x">X</span>';
    if(val === '?') return '<span class="status-q">?</span>';
    return '<span class="text-muted">-</span>';
}
