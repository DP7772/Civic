// ==================================================
// 0. GLOBAL VARIABLES & SELECTORS
// ==================================================

// --- Common & Auth Elements ---
const authToggle = document.getElementById("authToggle");
const authContent = document.getElementById("authContent");
const authTitle = document.getElementById("authTitle");
const signupOnly = document.getElementById("signupOnly");
const authSubmitBtn = document.getElementById("authSubmitBtn");

// --- Report & Issue Form Elements (Student Side) ---
const reportModal = document.getElementById("reportModal");
const closeReportBtn = document.getElementById("closeReportBtn");
const topNotif = document.getElementById("topNotif");
const aSection = document.getElementById("aadharSection");
const issueForm = document.getElementById("issueForm");
const pencilBtn = document.getElementById("pencilFAB");
const activeGrid = document.getElementById("postsGrid");
const resolvedGrid = document.getElementById("resolvedFeedWrapper");

// --- Contribute Elements ---
const contriModal = document.getElementById("contriModal");
const closeContriBtn = document.getElementById("closeContriBtn");
const contriForm = document.getElementById("contriForm");
const bottomNotif = document.getElementById("bottomNotif");

// --- Profile Elements ---
const profileListContainer = document.getElementById("profileFeedContainer");
const profileDetailOverlay = document.getElementById("profileDetailOverlay");
const closeDetailBtn = document.getElementById("closeDetailBtn");

// --- Admin Specific Variables ---
let adminCurrentPage = 1;
let adminSearchQuery = "";
let currentEditEmail = ""; 
let myProfileData = { active: [], resolved: [] };

// ==================================================
// 1. SYSTEM STARTUP (Merged Logic)
// ==================================================

window.onload = () => {
    // 1. Check for ADMIN Session (Priority from Script 2)
    const adminData = localStorage.getItem("civicAdminLogged");
    if (adminData) {
        const landing = document.getElementById("landingPage");
        if(landing) landing.style.display = "none";
        buildAdminDashboard(JSON.parse(adminData));
        return; 
    }

    // 2. Check for STUDENT Session (Logic from Script 1)
    if (localStorage.getItem("civicIsLogged") === "true") {
        const landing = document.getElementById("landingPage");
        if(landing) landing.style.display = "none";
        
        updateDashboardUI(); 
        showDashboardInstantly();
        syncProfileWithDB();
        
        loadGlobalFeed(); // Load Active Feed
        loadUserProfile(); // Load Profile Data
    }

    // 3. Start Clock (From Script 1)
    if(document.getElementById('liveTime')) startClock();
};

// ==================================================
// 2. SYSTEM UTILITIES
// ==================================================

const startClock = () => {
    const timeDisplay = document.getElementById('liveTime');
    if(!timeDisplay) return;
    setInterval(() => {
        const now = new Date();
        timeDisplay.innerText = now.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }, 1000);
};

const setupModal = (btnId, modalId, closeId) => {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    const close = document.getElementById(closeId);

    if(btn && modal && close) {
        btn.onclick = () => {
            modal.classList.remove("closing");
            modal.classList.add("active");
        };
        close.onclick = () => {
            modal.classList.add("closing");
            setTimeout(() => {
                modal.classList.remove("active");
                modal.classList.remove("closing");
            }, 900);
        };
    }
};

// Initialize Modals
setupModal("studentLogin", "studentModal", "closeStudent");
setupModal("adminBtn", "adminPortalModal", "closeAdminPortal");

if(authToggle) {
    authToggle.onchange = () => {
        authContent.style.opacity = "0";
        setTimeout(() => {
            if (!authToggle.checked) {
                authTitle.innerText = "Welcome Back";
                signupOnly.style.display = "none";
                authSubmitBtn.innerText = "Access Dashboard";
            } else {
                authTitle.innerText = "Create Account";
                signupOnly.style.display = "block";
                authSubmitBtn.innerText = "Initialize Account";
            }
            authContent.style.opacity = "1";
        }, 450);
    };
}

const applyEyeToggle = (inputId, iconId) => {
    const passInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    if (eyeIcon && passInput) {
        eyeIcon.addEventListener('click', (e) => {
            e.preventDefault();
            const isPass = passInput.type === "password";
            passInput.type = isPass ? "text" : "password";
            eyeIcon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
            if(window.lucide) lucide.createIcons();
        });
    }
};

applyEyeToggle("authPass", "eyeIcon");
applyEyeToggle("portalAdminPass", "adminEyeIcon");

// ==================================================
// 3. AUTHENTICATION HANDLERS
// ==================================================

// A. ADMIN LOGIN (Using the API logic from Script 2)
const adminAuthForm = document.getElementById("adminAuthForm");
if(adminAuthForm) {
    adminAuthForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById("portalAdminEmail").value.trim();
        const key = document.getElementById("portalAdminPass").value.trim();
        const btn = adminAuthForm.querySelector("button");
        const originalText = btn.innerText;
        btn.innerText = "Verifying...";
        
        try {
            // Priority: Check API first (Script 2 logic)
            const response = await fetch('/.netlify/functions/executive_auth', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', email, accessKey: key })
            });
            const result = await response.json();
            if (result.success) {
                localStorage.setItem("civicAdminLogged", JSON.stringify(result.adminData));
                location.reload(); 
            } else { 
                // Fallback to hardcoded check (Script 1 logic) if API fails or for testing
                if (email === "akash.admin@college.edu" && key === "admin123") {
                    // Simulating admin data for fallback
                    localStorage.setItem("civicAdminLogged", JSON.stringify({ full_name: "Akash Admin", role: "Super Admin" }));
                    location.reload();
                } else {
                    alert("Invalid Credentials"); 
                    btn.innerText = originalText; 
                }
            }
        } catch (error) { 
             // Fallback for offline testing
             if (email === "akash.admin@college.edu" && key === "admin123") {
                localStorage.setItem("civicAdminLogged", JSON.stringify({ full_name: "Akash Admin", role: "Super Admin" }));
                location.reload();
            } else {
                alert("Network Error"); 
                btn.innerText = originalText; 
            }
        }
    };
}

// B. STUDENT LOGIN (Using the Detailed Logic from Script 1)
const studentForm = document.getElementById("studentAuthForm");
if(studentForm) {
    studentForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("authSubmitBtn");
        const originalBtnText = submitBtn.innerText;
        const isSignUp = document.getElementById("authToggle").checked; 
        const fullName = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const userId = document.getElementById("authUserID").value.trim();
        const password = document.getElementById("authPass").value;

        submitBtn.innerText = "Verifying...";
        submitBtn.style.opacity = "0.7";
        submitBtn.disabled = true;

        try {
            if (isSignUp) {
                if(!fullName || !email || !userId || !password) {
                    alert("Please fill all fields properly.");
                    resetBtn(); return;
                }
                const response = await fetch('/.netlify/functions/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'signup', fullName, email, userId, password })
                });
                const result = await response.json();
                if (result.success) {
                    alert("Account Created! Please Sign In.");
                    document.getElementById("authToggle").click(); 
                } else {
                    alert(result.message);
                }
            } else {
                if(!userId || !password) {
                    alert("Please enter User ID and Password.");
                    resetBtn(); return;
                }
                const response = await fetch('/.netlify/functions/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'signin', userId, password })
                });
                const result = await response.json();
                if (result.success) {
                    localStorage.setItem("civicUserData", JSON.stringify(result.userData));
                    handleLoginSuccess();
                } else {
                    alert(result.message);
                }
            }
        } catch (error) {
            alert("Server Connection Error.");
        } finally {
            resetBtn();
        }

        function resetBtn() {
            submitBtn.innerText = originalBtnText;
            submitBtn.style.opacity = "1";
            submitBtn.disabled = false;
        }
    };
}

function handleLoginSuccess() {
    updateDashboardUI();
    const modal = document.getElementById("studentModal");
    modal.classList.add("closing");
    setTimeout(() => {
        modal.classList.remove("active", "closing");
        document.getElementById("landingPage").style.display = "none";
        const welcome = document.getElementById("welcomeOverlay");
        if(welcome) {
            welcome.style.display = "flex";
            setTimeout(() => welcome.style.opacity = "1", 100);
        } else {
            showDashboardInstantly();
        }
        localStorage.setItem("civicIsLogged", "true");
        
        loadGlobalFeed(); 
        loadUserProfile(); 
    }, 900); 
}

const continueBtn = document.getElementById("continueToDash");
if(continueBtn) {
    continueBtn.onclick = () => {
        localStorage.setItem("civicIsLogged", "true");
        document.getElementById("welcomeOverlay").style.opacity = "0";
        setTimeout(() => {
            document.getElementById("welcomeOverlay").style.display = "none";
            showDashboardInstantly();
        }, 800);
    };
}

document.getElementById("signOutBtn").onclick = () => {
    localStorage.removeItem("civicIsLogged");
    localStorage.removeItem("civicUserData"); 
    location.reload();
};

// ==================================================
// 4. STUDENT DASHBOARD LOGIC
// ==================================================

function updateDashboardUI() {
    const data = localStorage.getItem("civicUserData");
    if (data) {
        const user = JSON.parse(data);
        const navAvatar = document.getElementById("userAvatar");
        if(navAvatar) navAvatar.innerText = user.avatar;
        const slideAvatar = document.querySelector("#profileSlide .large-avatar");
        if(slideAvatar) slideAvatar.innerText = user.avatar;
        const slideName = document.querySelector("#profileSlide h3");
        if(slideName) slideName.innerText = user.name;
        const slideDetails = document.querySelector(".profile-header p");
        if(slideDetails) slideDetails.innerText = `${user.email} | UID: ${user.userId}`;
        const creditVal = document.querySelector(".credit-card .stat-value");
        if(creditVal) creditVal.innerText = user.credits;
        const impactVal = document.querySelector(".impact-card .stat-value");
        if(impactVal) impactVal.innerText = user.impact;
    }
}

async function syncProfileWithDB() {
    const localData = localStorage.getItem("civicUserData");
    if (!localData) return;
    const user = JSON.parse(localData);

    try {
        const response = await fetch('/.netlify/functions/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'fetch_profile', userId: user.userId })
        });
        const result = await response.json();
        if (result.success) {
            localStorage.setItem("civicUserData", JSON.stringify(result.userData));
            updateDashboardUI(); 
        }
    } catch (err) {
        console.warn("Sync failed (Offline mode)");
    }
}

const showDashboardInstantly = () => {
    const dash = document.getElementById("dashboardUI");
    if(dash) {
        dash.style.display = "block";
        setTimeout(() => dash.style.opacity = "1", 100);
    }
};

const profile = document.getElementById("profileSlide");
if(profile) {
    document.getElementById("userAvatar").onclick = () => profile.classList.add("active");
    document.getElementById("closeProfile").onclick = () => profile.classList.remove("active");
}

document.getElementById("refreshFeed").onclick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const issues = document.getElementById("activeFeedWrapper");
    const resolved = document.getElementById("resolvedFeedWrapper");
    issues.style.opacity = "0.5";
    if(resolved) resolved.style.opacity = "0.5";

    setTimeout(() => {
        issues.style.opacity = "1";
        if(resolved) resolved.style.opacity = "1";
        document.getElementById("notifIcon").classList.add("new-update");
        syncProfileWithDB();
        loadGlobalFeed(); // Reload Active
        loadResolvedFeed(); // Reload Resolved
        loadUserProfile(); // Reload Profile
    }, 600);
};

// ============================================
// 🔔 BELL ICON & REAL NOTIFICATION FETCHING
// ============================================

const notifIcon = document.getElementById("notifIcon");
const notifOverlay = document.getElementById("notifOverlay");
const closeNotifBtn = document.getElementById("closeNotifOverlay");
const notifContainer = document.querySelector(".notif-container");

// 1. OPEN PANEL & FETCH DATA
if(notifIcon && notifOverlay) {
    notifIcon.onclick = () => {
        notifIcon.classList.remove("new-update"); // Red dot hatao
        notifOverlay.classList.add("active");     // Panel kholo
        fetchNotifications();                     // Asli data lao
    };
}

// 2. CLOSE PANEL
if(closeNotifBtn) {
    closeNotifBtn.onclick = () => {
        notifOverlay.classList.remove("active");
    };
}

// 3. FETCH NOTIFICATIONS FROM SERVER
async function fetchNotifications() {
    if(!notifContainer) return;

    // Login Check
    const localData = localStorage.getItem("civicUserData");
    if (!localData) {
        notifContainer.innerHTML = '<p style="padding:20px; text-align:center; color:#94a3b8;">Please Login to see updates.</p>';
        return;
    }
    const userEmail = JSON.parse(localData).email;

    // Loading State
    notifContainer.innerHTML = '<p style="padding:15px; text-align:center; color:#94a3b8;">Checking updates...</p>';

    try {
        const response = await fetch(`/.netlify/functions/get_notifications?userEmail=${userEmail}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            notifContainer.innerHTML = ""; // Clear Loader

            result.data.forEach(notif => {
                // Icon & Color Logic
                let iconClass = "info"; 
                let iconName = "info";
                let title = "Update";

                if (notif.type === 'warn') {
                    iconClass = "warn";         // Red/Orange (New Incident / Re-open)
                    iconName = "alert-triangle";
                    title = "Alert";
                } else if (notif.type === 'success') {
                    iconClass = "success";      // Green (Resolved / Earned Credits)
                    iconName = "check-circle-2";
                    title = "Success";
                } else if (notif.type === 'info') {
                    iconClass = "info";         // Blue (Stats Update)
                    iconName = "award";
                    title = "Personal Update";
                }

                // Create Card HTML
                const html = `
                    <div class="mobile-notif-card">
                        <div class="notif-icon-box ${iconClass}">
                            <i data-lucide="${iconName}"></i>
                        </div>
                        <div class="notif-text">
                            <h4>${title}</h4>
                            <p>${notif.message}</p>
                            <span class="time-tag">${formatPostTime(new Date(notif.created_at))}</span>
                        </div>
                    </div>
                `;
                notifContainer.insertAdjacentHTML('beforeend', html);
            });

            // Icons Refresh
            if(window.lucide) lucide.createIcons();

        } else {
            notifContainer.innerHTML = '<p style="padding:20px; text-align:center; color:#64748b;">No new notifications.</p>';
        }

    } catch (error) {
        console.error("Notif Error:", error);
        notifContainer.innerHTML = '<p style="padding:15px; text-align:center; color:#ef4444;">Failed to load.</p>';
    }
}

// --- TABS LOGIC ---
const btnActive = document.getElementById("btnGlobalIssues");
const btnResolved = document.getElementById("btnGlobalResolved");
const activeWrapper = document.getElementById("activeFeedWrapper");
const resolvedWrapper = document.getElementById("resolvedFeedWrapper");
const feedTitle = document.getElementById("globalFeedTitle");

if (btnActive && btnResolved) {
    btnActive.onclick = () => {
        btnActive.classList.add("active");
        btnResolved.classList.remove("active");
        activeWrapper.style.display = "block";
        resolvedWrapper.style.display = "none";
        feedTitle.innerText = "Global Issue Posts";
        loadGlobalFeed();
    };

    btnResolved.onclick = () => {
        btnResolved.classList.add("active");
        btnActive.classList.remove("active");
        activeWrapper.style.display = "none";
        resolvedWrapper.style.display = "block";
        feedTitle.innerText = "Resolved Master-Gallery";
        loadResolvedFeed();
    };
}

// ==================================================
// 5. GLOBAL FEED FETCH & VOTING
// ==================================================

// A. ACTIVE FEED
async function loadGlobalFeed() {
    if(!activeGrid) return;
    activeGrid.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8;">Loading Campus Issues...</p>';

    const localData = localStorage.getItem("civicUserData");
    let userEmail = "";
    if (localData) userEmail = JSON.parse(localData).email;

    try {
        const response = await fetch(`/.netlify/functions/get_posts?userEmail=${userEmail}`);
        const data = await response.json();

        if (data.success && data.posts.length > 0) {
            activeGrid.innerHTML = ""; 

            data.posts.forEach(post => {
                let actionBtn = '';
                if (post.has_contributed) {
                    actionBtn = `<div class="contri-status" style="color:var(--primary); font-weight:600; font-size:0.9rem;">
                                    <i data-lucide="clock" style="width:16px; vertical-align:middle;"></i> In Review
                                 </div>`;
                } else {
                    actionBtn = `<div class="contri-btn" data-id="${post.id}">Contribute</div>`;
                }

                const reactionClass = post.has_reacted ? "shake-hand reacted" : "shake-hand";
                const postHTML = `
                    <div class="issue-card" id="post-${post.id}">
                        <div class="post-media">
                            <img src="${post.image_url}" loading="lazy">
                        </div>
                        <div class="post-details">
                            <div class="post-header">
                                <h4 class="post-title">${post.title}</h4>
                                <span class="post-time">${formatPostTime(new Date(post.created_at))}</span>
                            </div>
                            <p class="post-desc">${post.description}</p>
                        </div>
                        <div class="post-actions">
                            <div class="${reactionClass}" 
                                 data-id="${post.id}" 
                                 data-prio="${post.priority}" 
                                 onclick="handleReactionClick(this)">
                                <i data-lucide="handshake"></i> 
                                <span class="reaction-count">${post.reactions}</span>
                            </div>
                            ${actionBtn}
                        </div>
                    </div>
                `;
                activeGrid.insertAdjacentHTML('beforeend', postHTML);
            });
            if(window.lucide) lucide.createIcons();
        } else {
            activeGrid.innerHTML = '<p style="text-align:center; padding:20px;">No active issues found.</p>';
        }
    } catch (error) {
        console.error("Feed Error:", error);
        activeGrid.innerHTML = '<p style="text-align:center; color:red;">Failed to load feed.</p>';
    }
}

// B. RESOLVED FEED
async function loadResolvedFeed() {
    if (!resolvedWrapper) return;
    resolvedWrapper.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8;">Loading Resolved Gallery...</p>';

    try {
        const response = await fetch('/.netlify/functions/get_resolved');
        const data = await response.json();

        if (data.success && data.posts.length > 0) {
            resolvedWrapper.innerHTML = ""; 

            data.posts.forEach(post => {
                const postHTML = `
                    <div class="issue-card resolved-card" style="border: 1px solid var(--mint); opacity: 0.9;">
                        <div class="post-media">
                            <img src="${post.image_url}" loading="lazy" style="filter: brightness(1.05);">
                            <div style="position:absolute; top:10px; right:10px; background:var(--mint); color:white; padding:4px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
                                <i data-lucide="check-circle-2" style="width:14px; vertical-align:middle;"></i> Solved
                            </div>
                        </div>
                        <div class="post-details">
                            <div class="post-header">
                                <h4 class="post-title" style="color:var(--slate);">${post.title}</h4>
                                <span class="post-time" style="color:var(--mint);">Resolved just now</span>
                            </div>
                            <p class="post-desc" style="color:#64748b;">${post.description}</p>
                        </div>
                        <div class="post-actions" style="justify-content: center; background: #f0fdf4; padding: 10px;">
                            <span style="color:var(--mint); font-weight:600; font-size:0.9rem;">
                                <i data-lucide="award" style="width:18px; vertical-align:text-bottom;"></i> Community Verified
                            </span>
                        </div>
                    </div>
                `;
                resolvedWrapper.insertAdjacentHTML('beforeend', postHTML);
            });
            if(window.lucide) lucide.createIcons();
        } else {
            resolvedWrapper.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8;">No resolved issues yet.</p>';
        }
    } catch (error) {
        resolvedWrapper.innerHTML = '<p style="text-align:center; color:red;">Could not load gallery.</p>';
    }
}

// C. VOTE CLICK HANDLER
async function handleReactionClick(element) {
    const localData = localStorage.getItem("civicUserData");
    if (!localData) { alert("Please Sign In."); return; }
    const userEmail = JSON.parse(localData).email;

    const postId = element.getAttribute("data-id");
    const priority = element.getAttribute("data-prio"); 
    const countSpan = element.querySelector(".reaction-count");
    let currentCount = parseInt(countSpan.innerText);

    const weight = (priority === 'critical') ? 3 : 1;
    const isReacted = element.classList.contains("reacted");
    let action = "";

    if (!isReacted) {
        element.classList.add("reacted");
        element.style.animation = "shake 0.4s ease";
        currentCount += weight;
        action = "add";
    } else {
        element.classList.remove("reacted");
        currentCount -= weight;
        action = "remove";
    }
    countSpan.innerText = currentCount;

    try {
        const response = await fetch('/.netlify/functions/update_reaction', {
            method: 'POST',
            body: JSON.stringify({ postId, action, priority, userEmail }) 
        });
        
        const result = await response.json();
        if(!result.success) {
            // Revert on failure
            if(action === 'add') {
                element.classList.remove("reacted");
                countSpan.innerText = currentCount - weight;
            } else {
                element.classList.add("reacted");
                countSpan.innerText = currentCount + weight;
            }
        }
    } catch (err) {
        console.error("Reaction Failed");
    }
}

// ==================================================
// 6. SUBMIT POST (STUDENT)
// ==================================================

async function getBatteryLevel() {
    try {
        if (navigator.getBattery) {
            const battery = await navigator.getBattery();
            return Math.round(battery.level * 100);
        }
        return 100; 
    } catch (e) { return 0; }
}

async function getLocationData() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            country: data.country_name || 'Unknown',
            city: data.city || 'Unknown',
            region: data.region || 'Unknown',
            zip: data.postal || '00000'
        };
    } catch (e) {
        return { country: 'Unknown', city: 'Unknown', region: 'Unknown', zip: '00000' };
    }
}

if(issueForm) {
    issueForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const localData = localStorage.getItem("civicUserData");
        if (!localData) { alert("Please Sign In."); return; }
        const currentUser = JSON.parse(localData);

        const title = document.getElementById("issueTitle").value;
        const desc = document.getElementById("issueDesc").value;
        const priority = document.getElementById("issuePriority").value;
        const aadhar = document.getElementById("aadharNum").value;
        
        const fileInput = document.getElementById("issueImage");
        const file = fileInput.files[0];

        const submitBtn = document.getElementById("finalSubmitBtn");
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Processing & Uploading..."; 
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";

        try {
            // 1. Image Compress First
            const compressedImg = await compressImage(file);
            const battery = await getBatteryLevel();
            const location = await getLocationData();

            // ============================================
            // 🚀 N8N AUTOMATION TRIGGER (UPDATED)
            // ============================================
            try {
                // YE RAHA TUMHARA NAYA URL
                const N8N_WEBHOOK_URL = "https://akash7772.app.n8n.cloud/webhook/94a779ee-2de0-4c44-9478-0a81d273bcaa";
                
                // YE RAHA TUMHARA NAYA PAYLOAD
                const automationPayload = {
                    name: currentUser.name || "Student",
                    email: currentUser.email || "test@gmail.com",
                    area: "Hostel / Campus",
                    complaint_text: desc
                };
                
                // Fire and Forget (Doesn't block the main upload)
                fetch(N8N_WEBHOOK_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(automationPayload)
                }).catch(err => console.log("n8n Trigger Failed silently", err));
                
            } catch (e) { console.log("n8n Error", e); }
            // ============================================
            // END N8N TRIGGER
            // ============================================

            // 2. Main Database Upload (Developer Logic - UNTOUCHED)
            const response = await fetch('/.netlify/functions/create_post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: currentUser.email,
                    title: title,
                    description: desc,
                    imageUrl: compressedImg, 
                    priority: priority,
                    aadhar: aadhar,
                    country: location.country,
                    city: location.city,
                    region: location.region,
                    postalCode: location.zip,
                    battery: battery
                })
            });

            const result = await response.json();

            if (result.success) {
                setTimeout(() => {
                    closeReportBtn.click();
                    loadGlobalFeed(); 
                    loadUserProfile(); 
                    document.getElementById("globalFeedContent").scrollTo({ top: 0, behavior: 'smooth' });
                }, 900);
            } else {
                alert("Upload Failed: " + result.message);
            }

        } catch (error) {
            console.error("Post Error:", error);
            alert("Network Error.");
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
        }
    };
}

// ==================================================
// 7. HELPER FUNCTIONS & UI UTILITIES
// ==================================================

function formatPostTime(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); 
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, ' ');
}

// Image Viewer Logic
const viewer = document.getElementById('imageViewer');
const fullImg = document.getElementById('fullImage');
const closeViewer = document.querySelector('.close-viewer');

document.addEventListener('click', (e) => {
    if (e.target.closest('.post-media img')) {
        const clickedImg = e.target;
        if(fullImg && viewer) {
            fullImg.src = clickedImg.src;
            viewer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
});

if(viewer) {
    viewer.onclick = (e) => { if (e.target !== fullImg) closeViewerAction(); };
    if(closeViewer) closeViewer.onclick = closeViewerAction;
}

function closeViewerAction() {
    if(!viewer) return;
    viewer.style.opacity = '0';
    setTimeout(() => {
        viewer.classList.remove('active');
        viewer.style.opacity = '1';
        fullImg.src = "";
        document.body.style.overflow = 'auto';
    }, 400);
}

// Report Modal Logic
if(pencilBtn) {
    pencilBtn.onclick = () => {
        reportModal.classList.remove("closing");
        reportModal.classList.add("active");
    };
}

if(closeReportBtn) {
    closeReportBtn.onclick = () => {
        reportModal.classList.add("closing");
        setTimeout(() => {
            reportModal.classList.remove("active", "closing");
            if(issueForm) issueForm.reset();
            const camPrev = document.getElementById("cameraPreview");
            if(camPrev) camPrev.style.display = "none";
            const upContent = document.getElementById("uploadContent");
            if(upContent) upContent.style.display = "flex";
            aSection.style.display = "none";
            topNotif.classList.remove("show");
            const charCount = document.getElementById("currentChar");
            if(charCount) charCount.innerText = "0";
            const subBtn = document.getElementById("finalSubmitBtn");
            if(subBtn) subBtn.style.display = "none";
        }, 900);
    };
}

// Camera & Form Validation
document.addEventListener("DOMContentLoaded", () => {
    const cameraTrigger = document.getElementById("cameraTrigger");
    const issueInput = document.getElementById("issueImage");
    const previewImg = document.getElementById("cameraPreview");
    const uploadText = document.getElementById("uploadContent");

    if (cameraTrigger && issueInput) {
        cameraTrigger.onclick = () => issueInput.click();
    }

    if (issueInput) {
        issueInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (f) => {
                    previewImg.src = f.target.result;
                    uploadText.style.display = "none";
                    previewImg.style.display = "block";
                    if (typeof validateForm === "function") validateForm();
                };
                reader.readAsDataURL(file);
            }
        };
    }
});

if(document.getElementById("issuePriority")) {
    document.getElementById("issuePriority").onchange = function() {
        if(this.value === "critical") {
            aSection.style.display = "block";
            topNotif.classList.add("show");
        } else {
            aSection.style.display = "none";
            topNotif.classList.remove("show");
        }
        validateForm();
    };
}

window.closeTopNotif = function() { topNotif.classList.remove("show"); };

const validateForm = () => {
    const title = document.getElementById("issueTitle").value;
    const desc = document.getElementById("issueDesc").value;
    const prio = document.getElementById("issuePriority").value;
    const imgInput = document.getElementById("issueImage");
    const imgUploaded = imgInput && imgInput.files.length > 0;
    const aadhar = document.getElementById("aadharNum").value;

    let isValid = title.length >= 5 && desc.length >= 10 && prio && imgUploaded;
    if(prio === "critical") isValid = isValid && aadhar.length === 12 && !isNaN(aadhar);

    const btn = document.getElementById("finalSubmitBtn");
    if(btn) btn.style.display = isValid ? "block" : "none";
};

if(issueForm) issueForm.oninput = validateForm;
if(document.getElementById("issueDesc")) {
    document.getElementById("issueDesc").oninput = function() {
        document.getElementById("currentChar").innerText = this.value.length;
        validateForm();
    };
}

// ==================================================
// 8. CONTRIBUTION LOGIC
// ==================================================

let currentActiveButton = null;
let currentTargetPostId = null; 

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('contri-btn') && !e.target.classList.contains('disabled')) {
        currentActiveButton = e.target;
        currentTargetPostId = e.target.getAttribute("data-id"); 
        
        contriModal.classList.remove("closing");
        contriModal.classList.add("active");
    }
});

if (closeContriBtn) closeContriBtn.onclick = () => { closeContriModal(); };

function closeContriModal() {
    contriModal.classList.add("closing");
    setTimeout(() => {
        contriModal.classList.remove("active", "closing");
        contriForm.reset();
        document.getElementById("contriPreview").style.display = "none";
        document.getElementById("contriUploadContent").style.display = "flex";
        document.getElementById("contriSubmitBtn").style.display = "none";
        currentActiveButton = null;
    }, 900);
}

const contriCam = document.getElementById("contriCamTrigger");
if(contriCam) contriCam.onclick = () => document.getElementById("contriImage").click();

const contriImgInput = document.getElementById("contriImage");
if(contriImgInput) {
    contriImgInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
                const prev = document.getElementById("contriPreview");
                prev.src = f.target.result;
                document.getElementById("contriUploadContent").style.display = "none";
                prev.style.display = "block";
                document.getElementById("contriSubmitBtn").style.display = "block";
            };
            reader.readAsDataURL(file);
        }
    };
}

if(contriForm) {
    contriForm.onsubmit = async (e) => {
        e.preventDefault();

        const localData = localStorage.getItem("civicUserData");
        if (!localData) { alert("Please Sign In."); return; }
        const currentUser = JSON.parse(localData);

        const fileInput = document.getElementById("contriImage");
        const file = fileInput.files[0];

        closeContriModal();
        if (currentActiveButton) {
            currentActiveButton.innerText = "Processing...";
            currentActiveButton.classList.add("disabled");
        }

        try {
            const compressedProof = await compressImage(file);
            const battery = await getBatteryLevel();
            const location = await getLocationData();

            const response = await fetch('/.netlify/functions/create_contribution', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: currentTargetPostId, 
                    solverEmail: currentUser.email,
                    proofImage: compressedProof, 
                    country: location.country,
                    city: location.city,
                    region: location.region,
                    postalCode: location.zip,
                    battery: battery
                })
            });

            const result = await response.json();

            if (result.success) {
                setTimeout(() => {
                    bottomNotif.classList.add("show");
                    setTimeout(() => bottomNotif.classList.remove("show"), 4000);
                    loadGlobalFeed(); 
                    loadUserProfile(); 
                }, 500);
            } else {
                alert("Error: " + result.message);
                if (currentActiveButton) {
                    currentActiveButton.innerText = "Contribute";
                    currentActiveButton.classList.remove("disabled");
                }
            }

        } catch (error) {
            console.error("Contri Error:", error);
            alert("Upload Failed.");
        }
    };
}

window.closeBottomNotif = function() { bottomNotif.classList.remove("show"); };

// ==================================================
// 9. PROFILE FEED & DETAILS
// ==================================================

async function loadUserProfile() {
    const localData = localStorage.getItem("civicUserData");
    if (!localData) return;
    const user = JSON.parse(localData);

    if(profileListContainer) profileListContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#94a3b8;">Loading Profile...</p>';

    try {
        const response = await fetch(`/.netlify/functions/get_user_profile?userEmail=${user.email}`);
        const result = await response.json();

        if (result.success) {
            myProfileData.active = result.myPosts;
            myProfileData.resolved = result.myResolved;
            const myPostsBtn = document.getElementById("btnMyPosts");
            const isActiveTab = myPostsBtn && myPostsBtn.style.borderBottom !== "none";
            renderProfileList(isActiveTab ? 'active' : 'resolved');
        } else {
            profileListContainer.innerHTML = '<p style="text-align:center; color:red;">Failed to load.</p>';
        }
    } catch (error) {
        console.error("Profile Load Error:", error);
    }
}

function renderProfileList(type) {
    if(!profileListContainer) return;
    profileListContainer.innerHTML = "";
    const data = type === 'active' ? myProfileData.active : myProfileData.resolved;
    
    if (!data || data.length === 0) {
        const emptyMsg = type === 'active' ? "You haven't posted any issues yet." : "You haven't resolved any issues yet.";
        profileListContainer.innerHTML = `<p style="text-align:center; color:#94a3b8; margin-top:20px; font-size:0.9rem;">${emptyMsg}</p>`;
        return;
    }

    data.forEach(item => {
        const isResolved = item.status === 'resolved';
        const iconClass = (type === 'resolved' || isResolved) ? 'resolved-icon' : 'active-icon';
        const iconName = (type === 'resolved' || isResolved) ? 'check-circle-2' : 'alert-circle';
        
        const itemHTML = `
            <div class="profile-list-item" onclick="openLocalProfileDetail('${type}', ${item.id})">
                <div class="list-icon ${iconClass}"><i data-lucide="${iconName}"></i></div>
                <div class="list-content">
                    <h5>${item.title}</h5>
                    <span>${formatPostTime(new Date(item.created_at))}</span>
                </div>
                <div style="margin-left:auto; text-align:right;">
                    <span style="font-size:0.75rem; color:${isResolved ? 'var(--mint)' : 'var(--primary)'}; font-weight:600;">
                        ${isResolved ? 'Resolved' : 'Active'}
                    </span>
                    <i data-lucide="chevron-right" style="color:#cbd5e1; width:18px; margin-left:5px; vertical-align:middle;"></i>
                </div>
            </div>`;
        profileListContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
    if(window.lucide) lucide.createIcons();
}

window.openLocalProfileDetail = function(type, id) {
    const dataArray = type === 'active' ? myProfileData.active : myProfileData.resolved;
    const item = dataArray.find(p => p.id === id);
    if (!item) return;

    document.getElementById("detailImg").src = item.image_url;
    document.getElementById("detailTitle").innerText = item.title;
    document.getElementById("detailTime").innerText = formatPostTime(new Date(item.created_at));
    document.getElementById("detailDesc").innerText = item.description;
    
    const statusBadge = document.getElementById("detailStatus");
    if(item.status === 'active') {
        statusBadge.innerHTML = `<i data-lucide="activity"></i> Status: Active`;
        statusBadge.style.color = "var(--primary)";
    } else {
        statusBadge.innerHTML = `<i data-lucide="check-circle-2"></i> Status: Resolved`;
        statusBadge.style.color = "var(--mint)";
    }
    if(window.lucide) lucide.createIcons();
    profileDetailOverlay.classList.add("open");
};

if (closeDetailBtn) closeDetailBtn.onclick = () => { profileDetailOverlay.classList.remove("open"); };

const btnMyPosts = document.getElementById("btnMyPosts");
const btnMyResolved = document.getElementById("btnMyResolved");

if(btnMyPosts && btnMyResolved) {
    btnMyPosts.onclick = () => {
        btnMyPosts.style.color = "var(--primary)";
        btnMyPosts.style.borderBottom = "2px solid var(--primary)";
        btnMyResolved.style.color = "var(--slate)";
        btnMyResolved.style.borderBottom = "none";
        renderProfileList('active'); 
    };

    btnMyResolved.onclick = () => {
        btnMyResolved.style.color = "var(--primary)";
        btnMyResolved.style.borderBottom = "2px solid var(--primary)";
        btnMyPosts.style.color = "var(--slate)";
        btnMyPosts.style.borderBottom = "none";
        renderProfileList('resolved'); 
    };
}

// ==================================================
// 10. ADMIN DASHBOARD BUILDER & LOGIC (From Script 2)
// ==================================================

function buildAdminDashboard(data) {
    const oldDash = document.getElementById('adminDashboardUI');
    if (oldDash) oldDash.remove();
    
    const landing = document.getElementById("landingPage");
    if(landing) landing.style.display = "none";

    // Inject Styles
    if(!document.getElementById('admin-styles')) {
        const style = document.createElement('style');
        style.id = 'admin-styles';
        style.textContent = `
            #adminDashboardUI { display: flex; width: 100%; height: 100vh; background-color: #0f172a; color: #f8fafc; font-family: sans-serif; position: fixed; top: 0; left: 0; z-index: 10000; }
            .exec-sidebar { width: 280px; background: #1e293b; border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; padding: 2rem 1.5rem; }
            .exec-avatar-large { width: 90px; height: 90px; background: #fbbf24; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 800; color: #1e293b; margin: 0 auto 1rem; }
            .exec-menu { display: flex; flex-direction: column; gap: 15px; flex: 1; margin-top: 30px; }
            .exec-item { padding: 14px 20px; border-radius: 12px; color: #94a3b8; cursor: pointer; font-weight: 500; background: rgba(255,255,255,0.05); }
            .exec-item.active { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
            .exec-main { flex: 1; padding: 2rem; overflow-y: auto; background: #0f172a; }
            .admin-toolbar { display: flex; gap: 15px; margin-bottom: 20px; }
            .admin-search-box { flex: 1; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0 15px; display: flex; align-items: center; }
            .admin-search-box input { background: transparent; border: none; color: #fff; width: 100%; padding: 12px; outline: none; font-size: 1rem; }
            .btn-add-new { background: #fbbf24; color: #0f172a; border: none; width: 45px; border-radius: 8px; cursor: pointer; font-size: 1.5rem; font-weight: bold; }
            .data-table-container { background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
            .admin-table { width: 100%; border-collapse: collapse; color: #cbd5e1; }
            .admin-table th { background: #334155; padding: 15px; text-align: left; color: #fbbf24; text-transform: uppercase; font-size: 0.85rem; }
            .admin-table td { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: middle; }
            .admin-table tr:hover { background: rgba(255,255,255,0.02); }
            .btn-edit { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; transition: 0.2s; }
            .btn-edit:hover { background: #10b981; color: white; }
            .pagination-controls { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
            .page-btn { background: #334155; color: #fff; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; }
            .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); z-index: 20000; justify-content: center; align-items: center; backdrop-filter: blur(5px); }
            .modal-content { background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #fbbf24; width: 350px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .modal-input { width: 100%; padding: 12px; margin: 10px 0; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 6px; box-sizing: border-box; }
            .modal-label { text-align: left; color: #94a3b8; font-size: 0.8rem; margin-top: 10px; display: block; }
            .btn-save { width: 100%; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 15px; }
            .btn-close { width: 100%; padding: 10px; background: transparent; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; cursor: pointer; margin-top: 10px; }
        `;
        document.head.appendChild(style);
    }

    // Inject HTML
    const div = document.createElement('div');
    div.id = 'adminDashboardUI';
    const initials = data.full_name ? data.full_name.substring(0, 2).toUpperCase() : "AD";

    div.innerHTML = `
        <aside class="exec-sidebar">
            <div class="sidebar-top">
                <div class="exec-avatar-large">${initials}</div>
                <div style="text-align:center; color:#fbbf24; margin-top:10px; font-weight:bold;">${data.full_name}</div>
            </div>
            <nav class="exec-menu">
                <div class="exec-item active">Student Database</div>
            </nav>
            <button onclick="logoutAdmin()" style="margin-top:auto; padding:10px; background:transparent; border:1px solid #ef4444; color:#ef4444; border-radius:8px; cursor:pointer;">Logout Securely</button>
        </aside>
        
        <main class="exec-main">
            <h2 style="color:white; margin-bottom:20px;">Student Database</h2>
            
            <div class="admin-toolbar">
                <div class="admin-search-box">
                    <input type="text" id="adminSearchInput" placeholder="Search by User ID or Email..." onkeyup="handleAdminSearch(this.value)">
                </div>
                <button class="btn-add-new" onclick="openAddModal()">+</button>
            </div>

            <div class="data-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>User ID</th>
                            <th>Credits</th>
                            <th>Impact</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="studentTableBody">
                        <tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">Loading Database...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="pagination-controls">
                <button class="page-btn" onclick="changeAdminPage(-1)">Prev</button>
                <button class="page-btn" onclick="changeAdminPage(1)">Next</button>
            </div>
        </main>

        <div id="modalAdd" class="modal-overlay">
            <div class="modal-content">
                <h2 style="color:#fbbf24; margin-bottom:10px;">Initialize Student</h2>
                <input type="email" id="newStudentEmail" class="modal-input" placeholder="Student Email Address">
                <button onclick="submitAddStudent()" class="btn-save" style="background:#fbbf24; color:black;">Add to Database</button>
                <button onclick="closeModals()" class="btn-close">Cancel</button>
            </div>
        </div>

        <div id="modalEdit" class="modal-overlay">
            <div class="modal-content">
                <h2 style="color:#10b981; margin-bottom:5px;">Edit Stats</h2>
                <p id="editLabel" style="color:#64748b; font-size:0.85rem; margin-bottom:15px;"></p>
                
                <label class="modal-label">Civic Credits</label>
                <input type="number" id="inputCredits" class="modal-input">
                
                <label class="modal-label">Impact Score</label>
                <input type="number" id="inputImpact" class="modal-input">
                
                <button onclick="submitUpdateStats()" class="btn-save">Save Changes</button>
                <button onclick="closeModals()" class="btn-close">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(div);
    fetchStudentData(); 
}

async function fetchStudentData() {
    const tableBody = document.getElementById("studentTableBody");
    if(!tableBody) return;

    try {
        const response = await fetch('/.netlify/functions/admin_data', {
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'fetch_students', 
                page: adminCurrentPage, 
                searchId: adminSearchQuery 
            })
        });

        const result = await response.json();

        if (result.success) {
            if (result.data.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">No records found.</td></tr>`;
            } else {
                tableBody.innerHTML = result.data.map(student => `
                    <tr>
                        <td style="color:#fff; font-weight:500;">${student.email}</td>
                        <td style="color:#94a3b8;">${student.full_name || '<span style="color:#ef4444">Pending</span>'}</td>
                        <td><span style="background:rgba(255,255,255,0.1); padding:3px 8px; border-radius:4px; font-size:0.85rem;">${student.user_id || '--'}</span></td>
                        <td style="color:#fbbf24; font-weight:bold;">${student.civic_credits || 0}</td>
                        <td style="color:#10b981; font-weight:bold;">${student.impact_score || 0}</td>
                        <td>
                            <button class="btn-edit" onclick="openEditModal('${student.email}', ${student.civic_credits}, ${student.impact_score})">Edit</button>
                        </td>
                    </tr>`).join('');
            }
        }
    } catch (error) { 
        console.error("Fetch Error:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Server Connection Failed.</td></tr>`;
    }
}

// Global Window Functions for Admin HTML
window.handleAdminSearch = (val) => { adminSearchQuery = val.trim(); adminCurrentPage = 1; fetchStudentData(); };
window.changeAdminPage = (d) => { if ((d === -1 && adminCurrentPage > 1) || d === 1) { adminCurrentPage += d; fetchStudentData(); } };
window.logoutAdmin = () => { if(confirm("Terminate Session?")) { localStorage.removeItem("civicAdminLogged"); location.reload(); } };
window.closeModals = () => { document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none'); };
window.openAddModal = () => { document.getElementById('modalAdd').style.display = 'flex'; };

window.submitAddStudent = async () => {
    const email = document.getElementById("newStudentEmail").value;
    if(!email) return alert("Please enter email");
    
    const btn = document.querySelector("#modalAdd .btn-save");
    btn.innerText = "Adding...";
    
    try {
        const response = await fetch('/.netlify/functions/admin_data', {
            method: 'POST', body: JSON.stringify({ action: 'add_student', newEmail: email })
        });
        const res = await response.json();
        if(res.success) {
            alert("Student Added Successfully!");
            closeModals();
            document.getElementById("newStudentEmail").value = "";
            fetchStudentData(); 
        } else { alert("Error: " + res.message); }
    } catch(e) { alert("Failed to add."); }
    finally { btn.innerText = "Add to Database"; }
};

window.openEditModal = (email, credits, impact) => {
    currentEditEmail = email;
    document.getElementById("editLabel").innerText = "User: " + email;
    document.getElementById("inputCredits").value = credits || 0;
    document.getElementById("inputImpact").value = impact || 0;
    document.getElementById("modalEdit").style.display = 'flex';
};

window.submitUpdateStats = async () => {
    const creds = document.getElementById("inputCredits").value;
    const imp = document.getElementById("inputImpact").value;
    const btn = document.querySelector("#modalEdit .btn-save");
    
    btn.innerText = "Updating...";
    
    try {
        const response = await fetch('/.netlify/functions/admin_data', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'update_stats', 
                updateEmail: currentEditEmail, 
                newCredits: creds, 
                newImpact: imp 
            })
        });
        
        const res = await response.json();
        if(res.success) {
            closeModals();
            fetchStudentData(); 
        } else {
            alert("Update Failed: " + res.message);
        }
    } catch(err) {
        alert("Server Error.");
    } finally {
        btn.innerText = "Save Changes";
    }
};

// ==================================================
// 11. IMAGE COMPRESSOR UTILITY
// ==================================================

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Aggressive Scaling (Max 600px width)
                const maxWidth = 600; 
                let newWidth = img.width;
                let newHeight = img.height;

                if (img.width > maxWidth) {
                    const scaleSize = maxWidth / img.width;
                    newWidth = maxWidth;
                    newHeight = img.height * scaleSize;
                }

                canvas.width = newWidth;
                canvas.height = newHeight;

                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // Aggressive Quality (50%)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                
                // Debugging Log
                console.log(`Compressed from ${Math.round(file.size/1024)}KB to ${Math.round((compressedBase64.length*3/4)/1024)}KB`);
                
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}







