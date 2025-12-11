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




// --- AUTO FILL LOGIC (VIA GOOGLE PROXY) ---
const btnFetch = document.getElementById('btnFetch');
const inputLink = document.getElementById('pLink');

// ⚠️ PASTE YOUR GOOGLE SCRIPT URL HERE ⚠️
const MY_PROXY_URL = "https://script.google.com/macros/s/AKfycbyzu1vV2RTxhlGf8lklgjk2kBYp7V9YEBs9LTuVjqsllTeX9oe6rIWRutxcae8Ul-9a/exec"; 

if(btnFetch) {
    btnFetch.addEventListener('click', async () => {
        const url = inputLink.value;
        if(!url) { alert("נא להדביק לינק קודם"); return; }

        // Loading UI
        btnFetch.classList.add('loading');
        btnFetch.disabled = true;
        const originalText = btnFetch.innerHTML;
        btnFetch.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> מחפש...`;

        try {
            // 1. Call YOUR Google Script
            const finalUrl = `${MY_PROXY_URL}?url=${encodeURIComponent(url)}`;
            const response = await fetch(finalUrl);
            const data = await response.json();

            if (data.error) throw new Error("Google Script Error: " + data.error);
            if (!data.html) throw new Error("Empty result");

            // 2. Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.html, "text/html");

            // --- EXTRACTION LOGIC ---
            
            // A. NAME
            let name = "";
            const h1 = doc.querySelector('h1');
            if (h1) {
                // Remove the #number if it exists
                let cleanName = h1.innerText.replace(/#\d+/, '').trim();
                // Sometimes Transfermarkt repeats the name in strong tags, just clean it up
                name = cleanName.replace(/\s+/g, ' '); 
            }

            // B. AGE
            // Strategy: Look for the specific "Age:" label in the table
            let age = "";
            const labels = Array.from(doc.querySelectorAll('.info-table__content--regular'));
            const ageLabel = labels.find(el => el.innerText.includes('Date of birth/Age'));
            if(ageLabel) {
                // The value is usually in the NEXT sibling or inside the same container
                const val = ageLabel.nextElementSibling?.innerText || ageLabel.innerText;
                // Look for number in parens (24)
                const match = val.match(/\((\d+)\)/); 
                if(match) age = match[1];
            }
            // Fallback for Age (Microdata)
            if(!age) {
                const birthSpan = doc.querySelector('[itemprop="birthDate"]');
                if(birthSpan) {
                     const match = birthSpan.innerText.match(/\((\d+)\)/);
                     if(match) age = match[1];
                }
            }

            // C. LEAGUE
            let league = "";
            const leagueHeader = doc.querySelector('.data-header__league');
            if(leagueHeader) league = leagueHeader.innerText.trim();

            // D. POSITION
            let position = "";
            const posLabel = labels.find(el => el.innerText.includes('Position'));
            if(posLabel) {
                 position = posLabel.nextElementSibling?.innerText.trim();
            }

            // 3. FILL INPUTS
            if(name) document.getElementById('pName').value = name;
            if(age) document.getElementById('pAge').value = age;
            if(league) document.getElementById('pLeague').value = league;
            if(position) document.getElementById('pPos').value = position;

        } catch (error) {
            console.error(error);
            alert("לא הצלחנו למשוך נתונים. הלינק תקין? \n(הערה: אם זה קורה תמיד, Google נחסם זמנית על ידי Transfermarkt)");
        } finally {
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
