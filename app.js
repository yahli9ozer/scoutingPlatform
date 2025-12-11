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



// --- AUTO FILL LOGIC (With Country Support) ---
const btnFetch = document.getElementById('btnFetch');
const inputLink = document.getElementById('pLink');

// ⚠️ KEEP YOUR GOOGLE SCRIPT URL HERE
const MY_PROXY_URL = "https://script.google.com/macros/s/AKfycbyzu1vV2RTxhlGf8lklgjk2kBYp7V9YEBs9LTuVjqsllTeX9oe6rIWRutxcae8Ul-9a/exec"; 

if(btnFetch) {
    btnFetch.addEventListener('click', async () => {
        let url = inputLink.value;
        if(!url) { alert("נא להדביק לינק קודם"); return; }

        // Force .com (English)
        if (url.includes('transfermarkt')) {
            url = url.replace(/transfermarkt\.[a-z.]+(\/)/, 'transfermarkt.com$1');
        }

        // Loading UI
        btnFetch.classList.add('loading');
        btnFetch.disabled = true;
        const originalText = btnFetch.innerHTML;
        btnFetch.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> מחפש...`;

        try {
            const finalUrl = `${MY_PROXY_URL}?url=${encodeURIComponent(url)}`;
            const response = await fetch(finalUrl);
            const data = await response.json();

            if (!data.html) throw new Error("Empty result");

            const parser = new DOMParser();
            const doc = parser.parseFromString(data.html, "text/html");

            // A. NAME
            let name = "";
            const h1 = doc.querySelector('h1');
            if (h1) name = h1.innerText.replace(/#\d+/, '').replace(/\s+/g, ' ').trim();

            // B. AGE
            let age = "";
            const labels = Array.from(doc.querySelectorAll('.info-table__content--regular'));
            const ageLabel = labels.find(el => el.innerText.includes('Date of birth/Age')); 
            if(ageLabel) {
                const val = ageLabel.nextElementSibling?.innerText || ageLabel.innerText;
                const match = val.match(/\((\d+)\)/); 
                if(match) age = match[1];
            }
            if(!age) {
                const birthSpan = doc.querySelector('[itemprop="birthDate"]');
                if(birthSpan) {
                     const match = birthSpan.innerText.match(/\((\d+)\)/);
                     if(match) age = match[1];
                }
            }

            // C. LEAGUE & COUNTRY (New Logic)
            let league = "";
            let country = "";

            // 1. Get League Name
            const leagueHeader = doc.querySelector('.data-header__league');
            if(leagueHeader) league = leagueHeader.innerText.trim();

            // 2. Get Country (Search for the flag image class 'flaggenrahmen')
            // Usually located inside the club info or league info box
            const flagImg = doc.querySelector('.data-header__club-info img.flaggenrahmen');
            if (flagImg) {
                country = flagImg.title; // e.g. "Brazil"
            } else {
                // Fallback: Check the league box for a flag
                const leagueFlag = doc.querySelector('.data-header__league img');
                if(leagueFlag) country = leagueFlag.title;
            }

            // Combine them: "Brazil - Serie B"
            let finalLeagueString = league;
            if (country && league) {
                finalLeagueString = `${country} - ${league}`;
            } else if (country && !league) {
                 finalLeagueString = country; // Just country if no league found
            }

            // D. POSITION
            let position = "";
            const posLabel = labels.find(el => el.innerText.includes('Position'));
            if(posLabel) position = posLabel.nextElementSibling?.innerText.trim();

            // FILL INPUTS
            if(name) document.getElementById('pName').value = name;
            if(age) document.getElementById('pAge').value = age;
            if(finalLeagueString) document.getElementById('pLeague').value = finalLeagueString;
            if(position) document.getElementById('pPos').value = position;

        } catch (error) {
            console.error(error);
            alert("לא הצלחנו למשוך נתונים.");
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

// --- GLOBAL VARIABLES ---
let allPlayersData = []; // Store raw data here

// --- LISTEN TO DATABASE ---
onSnapshot(playersCol, (snapshot) => {
    // 1. Save data to our global array whenever DB changes
    allPlayersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // 2. Run the filter logic immediately to show data
    applyFilters();
});

// --- FILTER LOGIC ---
// Listen to inputs: Run filtering whenever user types or changes a dropdown
['filterLeague', 'filterAgeMin', 'filterAgeMax', 'filterS1', 'filterS2', 'filterS3', 'filterS4'].forEach(id => {
    document.getElementById(id).addEventListener('input', applyFilters);
});

function applyFilters() {
    // A. Get values from inputs
    const leagueSearch = document.getElementById('filterLeague').value.toLowerCase();
    const ageMin = parseInt(document.getElementById('filterAgeMin').value) || 0;
    const ageMax = parseInt(document.getElementById('filterAgeMax').value) || 100;
    
    const s1Filter = document.getElementById('filterS1').value; // Izhar
    const s2Filter = document.getElementById('filterS2').value; // Rami
    const s3Filter = document.getElementById('filterS3').value; // Avidan
    const s4Filter = document.getElementById('filterS4').value; // Yahli

    // B. Filter the Global Array
    const filteredList = allPlayersData.filter(p => {
        // 1. League Filter (Text contains)
        const pLeague = (p.league || "").toLowerCase();
        if (leagueSearch && !pLeague.includes(leagueSearch)) return false;

        // 2. Age Filter
        const pAge = parseInt(p.age) || 0;
        // Only filter by age if the player actually has an age listed, otherwise show them? 
        // Or hide unknown ages? Let's show unknown ages only if no filter is set.
        if (document.getElementById('filterAgeMin').value && pAge < ageMin) return false;
        if (document.getElementById('filterAgeMax').value && pAge > ageMax) return false;

        // 3. Scout Filters (The "AND" Logic)
        // If filter is "V", player MUST be "V". If filter is empty, ignore.
        if (s1Filter && p.s1 !== s1Filter) return false;
        if (s2Filter && p.s2 !== s2Filter) return false;
        if (s3Filter && p.s3 !== s3Filter) return false;
        if (s4Filter && p.s4 !== s4Filter) return false;

        return true; // Passed all tests
    });

    // C. Render the result
    renderTable(filteredList);
}

// --- RENDER FUNCTION (Separated) ---
function renderTable(dataList) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = ''; 
    let topTargets = 0;

    dataList.forEach((p) => {
        // Count V's
        const scores = [p.s1, p.s2, p.s3, p.s4];
        const vCount = scores.filter(x => x === 'V').length;
        if(vCount >= 3) topTargets++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold player-name">${p.name}</td>
            <td><span class="badge badge-league text-dark">${p.age || '-'}</span></td>
            <td>${p.league || '-'}</td>
            <td><span class="badge badge-pos">${p.position || '-'}</span></td>
            
            <td class="text-center">${renderBadge(p.s1)}</td>
            <td class="text-center">${renderBadge(p.s2)}</td>
            <td class="text-center">${renderBadge(p.s3)}</td>
            <td class="text-center">${renderBadge(p.s4)}</td>
            <td class="text-center">${renderBadge(p.data)}</td>
            
            <td>
                ${p.link ? `<a href="${p.link}" target="_blank" class="btn-tm">Link</a>` : '-'}
            </td>
            <td>
                <button class="btn btn-sm text-danger border-0" onclick="window.deletePlayer('${p.id}')">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update Stats based on CURRENT VIEW
    document.getElementById('total-count').innerText = dataList.length;
    document.getElementById('top-targets-count').innerText = topTargets;
    
    // Show empty message if needed
    document.getElementById('empty-msg').style.display = dataList.length === 0 ? 'block' : 'none';
}
