// app.js - simple roster + editor. No frameworks.
(function(){
  const LS_KEY = "dd_roster_v1";
  const rules = window.RULES_2024;

  // ---------- utilities ----------
  const $ = (id) => document.getElementById(id);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mod = (score) => Math.floor((Number(score || 10) - 10) / 2);
  const pbForLevel = (lvl) => 2 + Math.floor((lvl - 1) / 4);

  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  function nowISO(){
    return new Date().toISOString();
  }

  function uuid(){
    return "pc_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return { pcs: [], selectedId: null };
      const s = JSON.parse(raw);
      if(!s || !Array.isArray(s.pcs)) return { pcs: [], selectedId: null };
      return s;
    }catch{
      return { pcs: [], selectedId: null };
    }
  }

  function saveState(){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function download(filename, text){
    const blob = new Blob([text], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function defaultPC(){
    const skills = {};
    for(const s of rules.skills){
      skills[s.key] = { prof:false, expertise:false };
    }
    return {
      id: uuid(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      name: "New PC",
      level: 2,
      class: "Fighter",
      species: "Human (2024)",
      notes: "",
      ability: { STR:15, DEX:14, CON:14, INT:10, WIS:12, CHA:10 },
      vitals: { maxhp: 0, curhp: 0, ac: 10, speed: 30 },
      skills,
      features: [],
      attacks: [],
      inventory: { useWeight:true, coins:{ gp:0, sp:0, cp:0 }, items:[] }
    };
  }

  function computeDerived(pc){
    const dexMod = mod(pc.ability.DEX);
    const wisMod = mod(pc.ability.WIS);
    const pb = pbForLevel(pc.level);
    // Passive perception assumes proficient toggle set in skills (Perception).
    const perc = pc.skills["Perception"] || { prof:false, expertise:false };
    const profMult = perc.expertise ? 2 : (perc.prof ? 1 : 0);
    const passivePerception = 10 + wisMod + pb * profMult;

    return {
      pb,
      init: dexMod,
      passivePerception
    };
  }

  function totalWeight(pc){
    if(!pc.inventory.useWeight) return 0;
    let t = 0;
    for(const it of pc.inventory.items){
      const qty = Number(it.qty || 1);
      const w = Number(it.weight || 0);
      t += qty * w;
    }
    return Math.round(t * 100) / 100;
  }

  function rebuildClassFeatures(pc){
    const cls = rules.classes[pc.class];
    const byLvl = cls?.featuresByLevel || {};
    // Keep custom features/feats, but remove auto-generated ones.
    const kept = pc.features.filter(f => f.source !== "auto");
    const autos = [];
    for(let l=1; l<=pc.level; l++){
      const names = byLvl[l] || [];
      for(const n of names){
        autos.push({
          id: "feat_" + uuid(),
          type: "Feature",
          name: n,
          detail: "",
          source: "auto",
          levelGranted: l
        });
      }
    }
    pc.features = [...autos, ...kept];
  }

  // ---------- state ----------
  let state = loadState();

  // ---------- DOM wiring ----------
  const listEl = $("list");
  const editorEl = $("editor");
  const emptyEl = $("emptyState");
  const filePicker = $("filePicker");

  // Level dropdown 1..20
  const lvlSel = $("pc_level");
  for(let i=1;i<=20;i++){
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    lvlSel.appendChild(opt);
  }

  // Build skills UI
  const skillsEl = $("skills");
  function renderSkills(pc){
    skillsEl.innerHTML = "";
    for(const s of rules.skills){
      const row = document.createElement("div");
      row.className = "skill-row";
      const name = document.createElement("div");
      name.className = "skill-name";
      name.textContent = s.key;

      const abil = document.createElement("div");
      abil.className = "pill";
      abil.textContent = s.ability;

      const prof = document.createElement("label");
      prof.className = "row gap align small";
      const pchk = document.createElement("input");
      pchk.type = "checkbox";
      pchk.checked = !!pc.skills[s.key]?.prof;
      pchk.addEventListener("change", () => {
        pc.skills[s.key].prof = pchk.checked;
        if(!pchk.checked) pc.skills[s.key].expertise = false;
        touch(pc);
        refreshDerived(pc);
      });
      prof.appendChild(pchk);
      prof.appendChild(document.createTextNode("Prof"));

      const exp = document.createElement("label");
      exp.className = "row gap align small";
      const echk = document.createElement("input");
      echk.type = "checkbox";
      echk.checked = !!pc.skills[s.key]?.expertise;
      echk.disabled = pc.class !== "Rogue";
      echk.addEventListener("change", () => {
        pc.skills[s.key].expertise = echk.checked;
        if(echk.checked) pc.skills[s.key].prof = true;
        touch(pc);
        refreshDerived(pc);
        renderSkills(pc);
      });
      exp.appendChild(echk);
      exp.appendChild(document.createTextNode("Expert"));

      row.appendChild(name);
      row.appendChild(abil);
      row.appendChild(prof);
      row.appendChild(exp);
      skillsEl.appendChild(row);
    }
  }

  function setVisibleEditor(show){
    editorEl.classList.toggle("hidden", !show);
    emptyEl.classList.toggle("hidden", show);
  }

  function getSelected(){
    return state.pcs.find(p => p.id === state.selectedId) || null;
  }

  function touch(pc){
    pc.updatedAt = nowISO();
    saveState();
    renderList();
  }

  function renderList(){
    const q = ($("search").value || "").toLowerCase().trim();
    const pcs = state.pcs
      .filter(p => !q || (p.name||"").toLowerCase().includes(q) || (p.class||"").toLowerCase().includes(q))
      .sort((a,b) => (a.name||"").localeCompare(b.name||""));

    listEl.innerHTML = "";
    if(pcs.length === 0){
      const div = document.createElement("div");
      div.className = "muted small";
      div.style.padding = "10px";
      div.textContent = q ? "No matches." : "No characters yet.";
      listEl.appendChild(div);
      return;
    }

    for(const pc of pcs){
      const item = document.createElement("div");
      item.className = "list-item" + (pc.id === state.selectedId ? " active" : "");
      const left = document.createElement("div");
      left.innerHTML = `<div style="font-weight:700">${escapeHtml(pc.name||"")}</div>
                        <div class="muted small">Lv ${pc.level} ${escapeHtml(pc.class)}</div>`;
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "edit";
      item.appendChild(left);
      item.appendChild(badge);
      item.addEventListener("click", () => {
        state.selectedId = pc.id;
        saveState();
        render();
      });
      listEl.appendChild(item);
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  // ---------- editor render ----------
  function refreshDerived(pc){
    const d = computeDerived(pc);
    $("derived_pb").value = d.pb;
    $("vit_init").value = d.init;
    $("vit_pp").value = d.passivePerception;
    $("inv_weightTotal").value = totalWeight(pc) + (pc.inventory.useWeight ? " lb" : "");
  }

  function renderFeatures(pc){
    const box = $("features");
    box.innerHTML = "";

    for(const f of pc.features){
      const wrap = document.createElement("div");
      wrap.className = "feature";

      const head = document.createElement("div");
      head.className = "feature-head";

      const title = document.createElement("div");
      title.className = "feature-title";
      const tag = f.source === "auto" ? ` <span class="pill">auto L${f.levelGranted}</span>` : ` <span class="pill">custom</span>`;
      title.innerHTML = `${escapeHtml(f.name)}${tag}`;

      const actions = document.createElement("div");
      const del = document.createElement("button");
      del.className = "btn danger";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        pc.features = pc.features.filter(x => x.id !== f.id);
        touch(pc);
        renderFeatures(pc);
      });
      actions.appendChild(del);

      head.appendChild(title);
      head.appendChild(actions);

      const detail = document.createElement("textarea");
      detail.className = "input";
      detail.placeholder = "Details (how it works, uses, recharge, etc.)";
      detail.value = f.detail || "";
      detail.disabled = f.source === "auto";
      detail.addEventListener("input", () => {
        f.detail = detail.value;
        touch(pc);
      });

      wrap.appendChild(head);
      wrap.appendChild(detail);
      box.appendChild(wrap);
    }

    if(pc.features.length === 0){
      const d = document.createElement("div");
      d.className = "muted small";
      d.textContent = "No features yet.";
      box.appendChild(d);
    }
  }

  function renderAttacks(pc){
    const box = $("attacks");
    box.innerHTML = "";

    for(const a of pc.attacks){
      const wrap = document.createElement("div");
      wrap.className = "attack";

      const head = document.createElement("div");
      head.className = "attack-head";

      const title = document.createElement("div");
      title.className = "attack-title";
      title.textContent = a.name || "Attack";

      const actions = document.createElement("div");
      const del = document.createElement("button");
      del.className = "btn danger";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        pc.attacks = pc.attacks.filter(x => x.id !== a.id);
        touch(pc);
        renderAttacks(pc);
      });
      actions.appendChild(del);

      head.appendChild(title);
      head.appendChild(actions);

      const grid = document.createElement("div");
      grid.className = "grid two";
      grid.style.marginTop = "10px";
      grid.innerHTML = `
        <div class="field"><label>Name</label><input class="input" data-k="name" /></div>
        <div class="field"><label>To Hit</label><input class="input" data-k="toHit" placeholder="+5" /></div>
        <div class="field"><label>Damage</label><input class="input" data-k="damage" placeholder="1d8+3" /></div>
        <div class="field"><label>Notes</label><input class="input" data-k="notes" placeholder="reach, properties, mastery, etc." /></div>
      `;
      for(const inp of grid.querySelectorAll("input")){
        const k = inp.getAttribute("data-k");
        inp.value = a[k] || "";
        inp.addEventListener("input", () => {
          a[k] = inp.value;
          touch(pc);
          renderAttacks(pc); // keep header in sync with name
        });
      }

      wrap.appendChild(head);
      wrap.appendChild(grid);
      box.appendChild(wrap);
    }

    if(pc.attacks.length === 0){
      const d = document.createElement("div");
      d.className = "muted small";
      d.textContent = "No attacks yet. Add one for weapons, sneak attack notes, etc.";
      box.appendChild(d);
    }
  }

  function renderInventory(pc){
    const box = $("inventory");
    box.innerHTML = "";

    for(const it of pc.inventory.items){
      const wrap = document.createElement("div");
      wrap.className = "item";

      const head = document.createElement("div");
      head.className = "item-head";

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = it.name || "Item";

      const actions = document.createElement("div");
      const del = document.createElement("button");
      del.className = "btn danger";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        pc.inventory.items = pc.inventory.items.filter(x => x.id !== it.id);
        touch(pc);
        renderInventory(pc);
        refreshDerived(pc);
      });
      actions.appendChild(del);

      head.appendChild(title);
      head.appendChild(actions);

      const row = document.createElement("div");
      row.className = "grid three";
      row.style.marginTop = "10px";
      row.innerHTML = `
        <div class="field"><label>Name</label><input class="input" data-k="name" /></div>
        <div class="field"><label>Qty</label><input class="input" type="number" min="0" data-k="qty" /></div>
        <div class="field"><label>Weight (lb)</label><input class="input" type="number" min="0" step="0.1" data-k="weight" /></div>
      `;
      for(const inp of row.querySelectorAll("input")){
        const k = inp.getAttribute("data-k");
        inp.value = it[k] ?? "";
        inp.addEventListener("input", () => {
          it[k] = (inp.type === "number") ? Number(inp.value || 0) : inp.value;
          touch(pc);
          renderInventory(pc);
          refreshDerived(pc);
        });
      }

      const notes = document.createElement("textarea");
      notes.className = "input";
      notes.placeholder = "Notes (properties, container, attunement, etc.)";
      notes.value = it.notes || "";
      notes.addEventListener("input", () => {
        it.notes = notes.value;
        touch(pc);
      });

      wrap.appendChild(head);
      wrap.appendChild(row);
      wrap.appendChild(notes);
      box.appendChild(wrap);
    }

    if(pc.inventory.items.length === 0){
      const d = document.createElement("div");
      d.className = "muted small";
      d.textContent = "No items yet.";
      box.appendChild(d);
    }
  }

  function bindEditor(pc){
    // basics
    $("pc_name").value = pc.name || "";
    $("pc_level").value = String(pc.level || 1);
    $("pc_class").value = pc.class || "Fighter";
    $("pc_notes").value = pc.notes || "";

    $("pc_name").oninput = () => { pc.name = $("pc_name").value; touch(pc); };
    $("pc_notes").oninput = () => { pc.notes = $("pc_notes").value; touch(pc); };

    $("pc_class").onchange = () => {
      pc.class = $("pc_class").value;
      // Disable expertise toggles if not Rogue
      if(pc.class !== "Rogue"){
        for(const k of Object.keys(pc.skills)){
          pc.skills[k].expertise = false;
        }
      }
      rebuildClassFeatures(pc);
      touch(pc);
      render();
    };

    $("pc_level").onchange = () => {
      pc.level = clamp(Number($("pc_level").value || 1), 1, 20);
      rebuildClassFeatures(pc);
      touch(pc);
      render();
    };

    // abilities
    for(const k of ["STR","DEX","CON","INT","WIS","CHA"]){
      $("ab_"+k).value = pc.ability[k];
      $("ab_"+k).oninput = () => {
        pc.ability[k] = clamp(Number($("ab_"+k).value || 10), 1, 30);
        touch(pc);
        refreshDerived(pc);
        renderAbilityMods(pc);
      };
    }

    // vitals
    $("vit_maxhp").value = pc.vitals.maxhp ?? 0;
    $("vit_curhp").value = pc.vitals.curhp ?? 0;
    $("vit_ac").value = pc.vitals.ac ?? 10;
    $("vit_speed").value = pc.vitals.speed ?? 30;

    $("vit_maxhp").oninput = () => { pc.vitals.maxhp = Number($("vit_maxhp").value||0); touch(pc); };
    $("vit_curhp").oninput = () => { pc.vitals.curhp = Number($("vit_curhp").value||0); touch(pc); };
    $("vit_ac").oninput    = () => { pc.vitals.ac = Number($("vit_ac").value||0); touch(pc); };
    $("vit_speed").oninput = () => { pc.vitals.speed = Number($("vit_speed").value||0); touch(pc); };

    // inventory toggles + coins
    $("inv_useWeight").checked = !!pc.inventory.useWeight;
    $("inv_useWeight").onchange = () => { pc.inventory.useWeight = $("inv_useWeight").checked; touch(pc); refreshDerived(pc); };

    $("coin_gp").value = pc.inventory.coins.gp ?? 0;
    $("coin_sp").value = pc.inventory.coins.sp ?? 0;
    $("coin_cp").value = pc.inventory.coins.cp ?? 0;

    $("coin_gp").oninput = () => { pc.inventory.coins.gp = Number($("coin_gp").value||0); touch(pc); };
    $("coin_sp").oninput = () => { pc.inventory.coins.sp = Number($("coin_sp").value||0); touch(pc); };
    $("coin_cp").oninput = () => { pc.inventory.coins.cp = Number($("coin_cp").value||0); touch(pc); };

    // actions buttons
    $("btnDelete").onclick = () => {
      if(!confirm("Delete this character?")) return;
      state.pcs = state.pcs.filter(p => p.id !== pc.id);
      state.selectedId = state.pcs[0]?.id || null;
      saveState();
      render();
    };

    $("btnDuplicate").onclick = () => {
      const copy = deepClone(pc);
      copy.id = uuid();
      copy.name = (pc.name || "PC") + " (copy)";
      copy.createdAt = nowISO();
      copy.updatedAt = nowISO();
      state.pcs.push(copy);
      state.selectedId = copy.id;
      saveState();
      render();
    };

    $("btnExport").onclick = () => {
      const safeName = (pc.name || "character").replace(/[^a-z0-9\- _]/gi,"").trim().replace(/\s+/g,"_");
      download(`${safeName || "character"}_lvl${pc.level}.json`, JSON.stringify(pc, null, 2));
    };

    $("btnAddFeature").onclick = () => {
      pc.features.push({ id: uuid(), type:"Feature", name:"Custom Feature", detail:"", source:"custom" });
      touch(pc);
      renderFeatures(pc);
    };

    $("btnAddFeat").onclick = () => {
      pc.features.push({ id: uuid(), type:"Feat", name:"Custom Feat", detail:"", source:"custom" });
      touch(pc);
      renderFeatures(pc);
    };

    $("btnAutoFeatures").onclick = () => {
      rebuildClassFeatures(pc);
      touch(pc);
      renderFeatures(pc);
    };

    $("btnAddAttack").onclick = () => {
      pc.attacks.push({ id: uuid(), name:"Attack", toHit:"", damage:"", notes:"" });
      touch(pc);
      renderAttacks(pc);
    };

    $("btnAddItem").onclick = () => {
      pc.inventory.items.push({ id: uuid(), name:"Item", qty:1, weight:0, notes:"" });
      touch(pc);
      renderInventory(pc);
      refreshDerived(pc);
    };

    $("btnLevelUp").onclick = () => {
      // Simple level-up wizard: bump level by 1 and remind about choice points.
      if(pc.level >= 20) return alert("Already level 20.");
      const next = pc.level + 1;
      const cls = rules.classes[pc.class];
      const gained = (cls.featuresByLevel[next] || []).join(", ") || "(no listed features)";
      const msg = `Leveling to ${next}.\n\nGains: ${gained}\n\nReminder: if this is an ASI/Feat level, add it under Features & Feats (custom).`;
      if(!confirm(msg + "\n\nApply level up now?")) return;
      pc.level = next;
      $("pc_level").value = String(pc.level);
      rebuildClassFeatures(pc);
      touch(pc);
      render();
    };

    renderSkills(pc);
    renderFeatures(pc);
    renderAttacks(pc);
    renderInventory(pc);
    renderAbilityMods(pc);
    refreshDerived(pc);
  }

  function renderAbilityMods(pc){
    for(const k of ["STR","DEX","CON","INT","WIS","CHA"]){
      const m = mod(pc.ability[k]);
      $("mod_"+k).textContent = "mod " + (m>=0 ? "+"+m : String(m));
    }
  }

  function render(){
    renderList();
    const pc = getSelected();
    if(!pc){
      setVisibleEditor(false);
      return;
    }
    setVisibleEditor(true);
    bindEditor(pc);
  }

  // ---------- top level buttons ----------
  $("btnNew").addEventListener("click", () => {
    const pc = defaultPC();
    rebuildClassFeatures(pc);
    state.pcs.push(pc);
    state.selectedId = pc.id;
    saveState();
    render();
  });

  $("btnImport").addEventListener("click", () => filePicker.click());

  filePicker.addEventListener("change", async () => {
    const f = filePicker.files?.[0];
    filePicker.value = "";
    if(!f) return;
    const txt = await f.text();
    try{
      const pc = JSON.parse(txt);
      if(!pc || typeof pc !== "object") throw new Error("Bad JSON");
      // Normalize / guardrails
      pc.id = pc.id || uuid();
      pc.species = "Human (2024)";
      pc.class = (pc.class === "Rogue") ? "Rogue" : "Fighter";
      pc.level = clamp(Number(pc.level||1), 1, 20);

      // Ensure skills exist
      pc.skills = pc.skills || {};
      for(const s of rules.skills){
        pc.skills[s.key] = pc.skills[s.key] || { prof:false, expertise:false };
        if(pc.class !== "Rogue") pc.skills[s.key].expertise = false;
      }

      // Ensure inventory shape
      pc.inventory = pc.inventory || { useWeight:true, coins:{gp:0,sp:0,cp:0}, items:[] };
      pc.inventory.coins = pc.inventory.coins || {gp:0,sp:0,cp:0};
      pc.inventory.items = Array.isArray(pc.inventory.items) ? pc.inventory.items : [];

      // Features defaults
      pc.features = Array.isArray(pc.features) ? pc.features : [];
      pc.attacks = Array.isArray(pc.attacks) ? pc.attacks : [];

      // Ability/vitals defaults
      pc.ability = pc.ability || { STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10 };
      pc.vitals = pc.vitals || { maxhp:0, curhp:0, ac:10, speed:30 };

      // Rebuild auto features for consistency
      rebuildClassFeatures(pc);

      // Upsert: replace by id if exists
      const idx = state.pcs.findIndex(p => p.id === pc.id);
      if(idx >= 0) state.pcs[idx] = pc;
      else state.pcs.push(pc);

      state.selectedId = pc.id;
      saveState();
      render();
    }catch(e){
      alert("Import failed: " + (e?.message || "unknown error"));
    }
  });

  $("btnExportAll").addEventListener("click", () => {
    const pack = {
      exportedAt: nowISO(),
      version: "roster_v1",
      pcs: state.pcs
    };
    download("roster_export.json", JSON.stringify(pack, null, 2));
  });

  $("search").addEventListener("input", renderList);

  // First run seed: if empty, create one sample
  if(state.pcs.length === 0){
    const pc = defaultPC();
    pc.name = "Example PC";
    pc.class = "Rogue";
    rebuildClassFeatures(pc);
    state.pcs.push(pc);
    state.selectedId = pc.id;
    saveState();
  }

  render();
})();