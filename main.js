/* ═══════════════════════════════════════════════════════════════════════
   Céline Audio — site behaviour: mobile menu, parts browser, scroll reveal.
   Shared by every page; each part does nothing where its markup is absent.

   Every hidden state is enabled by a class this file (or the inline script
   in <head>) sets, so a blocked or broken script leaves the page readable.
   ═══════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const $ = (selector) => Array.from(document.querySelectorAll(selector));


  /* ══ mobile menu ═════════════════════════════════════════════════════ */

  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("nav-mobile");

  if (menuBtn && mobileNav) {
    const setOpen = (open) => {
      mobileNav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", () => setOpen(!mobileNav.classList.contains("open")));
    mobileNav.addEventListener("click", (event) => { if (event.target.closest("a")) setOpen(false); });
  }


  /* ══ parts browser ═══════════════════════════════════════════════════ */

  /*  Vertical tabs, one per family. Arrows wrap, Home/End jump. The open
      family is kept in the fragment with replaceState — assigning
      location.hash would scroll it under the header — and a link to one
      part (#part-triode) opens its family and scrolls to it. */

  const tabs = $('#browser [role="tab"]');

  if (tabs.length) {
    const panelId = (tab) => tab.getAttribute("aria-controls");
    const steps = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

    const select = (tab, { focus = false, record = true } = {}) => {
      for (const other of tabs) {
        const on = other === tab;
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
        document.getElementById(panelId(other))?.classList.toggle("is-open", on);
      }
      if (focus) tab.focus();
      if (record) history.replaceState(null, "", "#" + panelId(tab));
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (event) => {
        const last = tabs.length - 1;
        const target =
          event.key in steps ? tabs[(index + steps[event.key] + tabs.length) % tabs.length] :
          event.key === "Home" ? tabs[0] :
          event.key === "End" ? tabs[last] : null;
        if (!target) return;
        event.preventDefault();
        select(target, { focus: true });
      });
    });

    // Opens whatever family the fragment points into, on arrival and whenever
    // an in-page link (a release-note card, say) changes it.
    const openFromHash = (fallback) => {
      let hash = location.hash.slice(1);
      try { hash = decodeURIComponent(hash); } catch { /* keep it raw */ }

      const targeted = hash ? document.getElementById(hash) : null;
      const group = targeted?.closest(".part-group");
      const requested = group ? tabs.find((tab) => panelId(tab) === group.id) : fallback;
      if (!requested) return;

      // Following a link should not rewrite the address bar, hence record: false.
      select(requested, { record: false });

      // The browser tried to scroll while the panel was hidden; retry once open.
      if (targeted) {
        requestAnimationFrame(() => targeted.scrollIntoView({ block: "start" }));
      }
    };

    openFromHash(tabs[0]);
    window.addEventListener("hashchange", () => openFromHash(null));
  }


  /* ══ scroll reveal ═══════════════════════════════════════════════════ */

  const revealTargets = $([
    ".section .section-title", ".section .lede", ".two-col > *", ".steps li",
    ".shot", ".sheet", ".keys", ".browser", ".card", ".figure", ".dl",
    ".callout", ".licences", ".credits",
  ].join(", "));

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (revealTargets.length && !reducedMotion && "IntersectionObserver" in window) {
    // The hidden state only exists in CSS once this class is set.
    document.documentElement.classList.add("js-anim");

    const reveal = (element) => element.classList.add("in");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

    revealTargets.forEach((element, index) => {
      element.classList.add("reveal");
      element.style.transitionDelay = (index % 4) * 60 + "ms";
      observer.observe(element);
    });

    // Failsafe: anything still hidden after five seconds is shown anyway.
    setTimeout(() => revealTargets.forEach(reveal), 5000);
  }
})();
