 
(function () {
  var S = null;
  try { S = JSON.parse(sessionStorage.getItem("JAMALI_SYSTEM_SESSION") || "null"); } catch (e) {}
  if (!S) { try { console.log("[FC] no session - chips off"); } catch (e) {} return; }
  var ADMIN = S.role === "admin";
  var RAWURL = (window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation") && performance.getEntriesByType("navigation")[0] && performance.getEntriesByType("navigation")[0].name) || location.href; var ANCHOR = document.createElement("a"); ANCHOR.href = RAWURL; var PAGE = ANCHOR.pathname.replace(/^\//, "").replace(/\.html$/, "").replace(/\/+$/, "");
  var F = PAGE.split("/")[0];
  if (!PAGE || F === "system-admin" || F === "account-recovery") { try { console.log("[FC] page off: " + PAGE); } catch (e) {} return; }
  var ST = { fields: {} }, seq = 0;
  var st = document.createElement("style");
  st.textContent = ".jamali-fc-btns{position:absolute;top:2px;right:2px;display:flex;gap:2px;z-index:60}" +
    ".jamali-fc-btn{width:18px;height:18px;border-radius:5px;border:1px solid #fca5a5;background:#fff;color:#dc2626;font-size:12px;line-height:1;cursor:pointer;padding:0}" +
    ".jamali-fc-btn:hover{background:#fee2e2}.jamali-fc-btn.jamali-fc-on{background:#dc2626;color:#fff;border-color:#b91c1c}" +
    ".jamali-fc-off{outline:2px solid #dc2626;outline-offset:1px;background:rgba(220,38,38,.07)}"+".jamali-vis-host{position:relative}"+".jamali-ctl-host{display:inline-block;position:relative;max-width:100%}"+"#jamali-vis-panel{position:fixed;bottom:84px;right:14px;z-index:1002;width:340px;max-width:calc(100vw - 28px);max-height:60vh;overflow:auto;background:#111827;border:1px solid #334155;border-radius:12px;padding:12px 14px;font-size:13px;color:#e2e8f0;box-shadow:0 18px 40px rgba(0,0,0,.5)}"+".jamali-vis-show{border:1px solid #4ade80;background:#052e16;color:#4ade80;border-radius:8px;font-size:12px;font-weight:800;padding:4px 10px;cursor:pointer;flex:0 0 auto}";
  document.head.appendChild(st);
  function slug(t){return String(t||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);}
  function inUi(el){return !!(el.closest&&el.closest("#jamali-sidebar,#jamali-acct,#jamali-admin-btn,#jamali-burger,#jamali-overlay,.jamali-vis-notice,#jamali-hidden-chip,#jamali-vis-panel,.jamali-fc-btns"));}
  function vis(el){return !!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);}
  function cfg(k){return ST.fields[PAGE+":"+k]||{};}
  function load(){return import("/firebase.js").then(function(fb){return fb.getDoc(fb.doc(fb.db,"systemPageConfig","fieldControl"));}).then(function(sn){if(sn&&sn.exists())ST.fields=sn.data().fields||{};}).catch(function(){});}
  function save(){return import("/firebase.js").then(function(fb){return fb.setDoc(fb.doc(fb.db,"systemPageConfig","fieldControl"),{fields:ST.fields,updatedBy:S.username||"",updatedAt:fb.serverTimestamp?fb.serverTimestamp():null});});}
  function scan(root){
    var out=[],cs=root.querySelectorAll("input,select,textarea");
    for(var i=0;i<cs.length;i++){
      var c=cs[i];
      if(c.type==="hidden"||inUi(c)||!vis(c))continue;
      var row=c.closest?c.closest("label"):null;
      if(row&&inUi(row))row=null;
      var multi=row?Array.prototype.filter.call(row.querySelectorAll("input,select,textarea,button"),function(x){return !(x.classList&&x.classList.contains("jamali-fc-btn"));}).length>1:false;
      var key=c.id||("f-"+(slug(multi?(c.name||c.type):(row?row.textContent:(c.name||c.type)))||(++seq)));
      out.push({key:key,el:c,wrap:multi?null:(row||c)});
    }
    return out;
  }
  function adminScan(root){
    var list=scan(root);
    for(var i=0;i<list.length;i++)(function(t){
      var cf=cfg(t.key),el=t.el,host=(el.parentElement&&el.parentElement.classList.contains("jamali-ctl-host"))?el.parentElement:(t.wrap||t.el),bar=null;
      if(host.classList)host.classList.toggle("jamali-fc-off",!!cf.h);
      bar=host.querySelector(".jamali-fc-btns");
      if(!bar){
        if(/^(INPUT|SELECT|TEXTAREA)$/.test(host.tagName)){var sp=document.createElement("span");sp.className="jamali-ctl-host";host.parentNode.insertBefore(sp,host);sp.appendChild(host);host=sp;t.wrap=sp;}
        host.classList.add("jamali-vis-host");
        bar=document.createElement("span");bar.className="jamali-fc-btns";
        var bm=document.createElement("button");bm.type="button";bm.className="jamali-fc-btn";bm.textContent="\u2212";bm.title="Hide / restore for normal users";
        var bp=document.createElement("button");bp.type="button";bp.className="jamali-fc-btn";bp.textContent="+";bp.title="Fixed values";
        bm.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();toggle(t.key,bm);});
        bp.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();panel(t.key);});
        bar.appendChild(bm);bar.appendChild(bp);host.insertBefore(bar,host.firstChild);host.dataset.fcBar="1";
      }
      bar.firstChild.classList.toggle("jamali-fc-on",!!cf.h);
    })(list[i]);
  }
  function toggle(k,btn){
    var cf=Object.assign({},cfg(k));cf.h=!cf.h;ST.fields[PAGE+":"+k]=cf;
    save().then(function(){adminScan(document.body);}).catch(function(e){console.warn("field control save failed",e);btn.textContent="!";setTimeout(function(){btn.textContent="\u2212";},1500);});
  }
  function panel(k){
    var p=document.getElementById("jamali-vis-panel");
    if(!p){p=document.createElement("div");p.id="jamali-vis-panel";p.hidden=true;document.body.appendChild(p);}
    p.innerHTML="";
    var h=document.createElement("b");h.textContent="Fixed values - "+k;p.appendChild(h);
    var hint=document.createElement("div");hint.style.cssText="font-size:11px;color:#94a3b8;margin-bottom:6px";hint.textContent="One option per line. Empty = users type freely.";p.appendChild(hint);
    var ta=document.createElement("textarea");ta.style.cssText="width:100%;height:110px;background:#0b1220;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:8px;font-size:12px";ta.value=(cfg(k).o||[]).join("\n");p.appendChild(ta);
    var row=document.createElement("div");row.style.cssText="display:flex;gap:6px;margin-top:8px";
    function mk(t,fn){var b=document.createElement("button");b.type="button";b.className="jamali-vis-show";b.style.flex="1";b.textContent=t;b.addEventListener("click",fn);row.appendChild(b);}
    mk("Save",function(){var o=ta.value.split("\n").map(function(x){return x.trim();}).filter(Boolean);var c2=Object.assign({},cfg(k));if(o.length)c2.o=o;else delete c2.o;ST.fields[PAGE+":"+k]=c2;save().then(function(){p.hidden=true;}).catch(function(e){console.warn(e);});});
    mk("Close",function(){p.hidden=true;});
    p.appendChild(row);p.hidden=false;
  }
  function userScan(root){
    var list=scan(root);
    for(var i=0;i<list.length;i++)(function(t){
      var host=t.wrap||t.el,cf=cfg(t.key),el=t.el;
      if(cf.h){if(host.style.display!=="none")host.style.display="none";return;}
      if(cf.o&&cf.o.length){
        var sel=el.previousElementSibling;
        if(!(sel&&sel.dataset&&sel.dataset.fcSel)){
          sel=document.createElement("select");sel.dataset.fcSel="1";sel.className=el.className;
          el.parentNode.insertBefore(sel,el);
          sel.addEventListener("change",function(){el.value=sel.value;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));});
          if(el.required){sel.required=true;el.required=false;}
          el.style.display="none";
        }
        var sig=cf.o.join("|");
        if(sel.dataset.fcSig!==sig){
          sel.dataset.fcSig=sig;sel.innerHTML="";
          var ph=document.createElement("option");ph.value="";ph.textContent="-- select --";sel.appendChild(ph);
          for(var j=0;j<cf.o.length;j++){var op=document.createElement("option");op.value=cf.o[j];op.textContent=cf.o[j];if(el.value===cf.o[j])op.selected=true;sel.appendChild(op);}
        }
      } else {
        var s2=el.previousElementSibling;
        if(s2&&s2.dataset&&s2.dataset.fcSel){s2.parentNode.removeChild(s2);el.style.display="";}
      }
    })(list[i]);
  }
  load().then(function(){
    var fn=ADMIN?adminScan:userScan;
    var booted=false;
    var go=function(){fn(document.body);if(booted)return;booted=true;try{console.log("[FC] boot page="+PAGE+" admin="+ADMIN+" chips="+Math.floor(document.querySelectorAll(".jamali-fc-btn").length/2));}catch(e){}};
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go);else go();
    setInterval(function(){fn(document.body);},1200);
  });
})();
