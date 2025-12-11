import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ------------------------------------------------------------------
// ⚠️ PASTE YOUR FIREBASE CONFIG HERE ⚠️
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDXtG1lqiC8l4OL8z2fIfLFVwU2tNXGO84",
  authDomain: "coutingplatform.firebaseapp.com",
  projectId: "coutingplatform",
  storageBucket: "coutingplatform.firebasestorage.app",
  messagingSenderId: "539720969654",
  appId: "1:539720969654:web:3a0f3c9be02a6d5fc8a517"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const playersCol = collection(db, "players");

// --- AUTO FILL LOGIC (UPDATED FOR YOUR HTML) ---
const btnFetch = document.getElementById('btnFetch');
const inputLink = document.getElementById('pLink');

if(btnFetch) {
    btnFetch.addEventListener('click', async () => {
        const url = inputLink.value;
        if(!url) { alert("נא להדביק לינק קודם"); return; }

        // Start Loading Animation
        btnFetch.classList.add('loading');
        btnFetch.disabled = true;
        const originalText = btnFetch.innerHTML;
        btnFetch.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> טוען...`;

        try {
            // using corsproxy.io (often faster/better than allorigins)
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error("Network response was not ok");
            
            const htmlText = await response.text();
            
            // Convert text to HTML Document
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            // --- 1. GET NAME (Fix: Remove Shirt Number #8) ---
            let name = "Unknown";
            const headerBox = doc.querySelector('.data-header__headline-wrapper');
            if(headerBox) {
                // We clone the element to modify it without breaking anything
                const clone = headerBox.cloneNode(true);
                // Find and remove the shirt number span (e.g. #8)
                const numberSpan = clone.querySelector('.data-header__shirt-number');
                if(numberSpan) numberSpan.remove();
                
                name = clone.innerText.trim(); 
                // Cleanup: remove extra spaces or newlines
                name = name.replace(/\s+/g, ' ').trim();
            }

            // --- 2. GET AGE (Fix: Extract from "(25)") ---
            let age = "";
            // Based on your HTML: <span itemprop="birthDate"> 25/10/2000 (25) </span>
            const birthSpan = doc.querySelector('[itemprop="birthDate"]');
            if(birthSpan) {
                const text = birthSpan.innerText; // "25/10/2000 (25)"
                const match = text.match(/\((\d+)\)/); // Regex to find number inside ()
                if(match && match[1]) {
                    age = match[1];
                }
            }

            // --- 3. GET LEAGUE ---
            let league = "";
            // Based on your HTML: <span class="data-header__league">...Premier League...</span>
            const leagueSpan = doc.querySelector('.data-header__league');
            if(leagueSpan) {
                league = leagueSpan.innerText.trim();
            }

            // --- 4. FILL THE INPUTS ---
            if(name === "Unknown" && age === "") {
                throw new Error("Could not parse data");
            }

            document.getElementById('pName').value = name;
            document.getElementById('pAge').value = age;
            document.getElementById('pLeague').value = league;

        } catch (error) {
            console.error(error);
            alert("שגיאה במשיכת נתונים. ייתכן שהאתר חוסם גישה או שהלינק לא תקין.\nנא למלא ידנית.");
        } finally {
            // Stop Loading
            btnFetch.classList.remove('loading');
            btnFetch.disabled = false;
            btnFetch.innerHTML = originalText;
        }
    });
}


// --- SAVE PLAYER (Standard) ---
const form = document.getElementById('addPlayerForm');
if(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPlayer = {
            name: document.getElementById('pName').value,
            age: document.getElementById('pAge').value,
            league: document.getElementById('pLeague').value,
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
            // Close Modal
            const modalEl = document.querySelector('#addModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } catch (e) {
            console.error("Error adding: ", e);
            alert("שגיאה בשמירה: " + e.message);
        }
    });
}

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
    if(confirm("למחוק שחקן זה?")) {
        await deleteDoc(doc(db, "players", id));
    }
}

function renderBadge(val) {
    if(val === 'V') return '<span class="status-v">V</span>';
    if(val === 'X') return '<span class="status-x">X</span>';
    if(val === '?') return '<span class="status-q">?</span>';
    return '<span class="text-muted">-</span>';
}
