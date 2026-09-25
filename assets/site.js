// Small progressive enhancements. The page is complete without this file.
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Nav gets a solid background once the page scrolls.
  var nav = document.querySelector("[data-nav]");
  if (nav) {
    var onNavScroll = function () {
      nav.toggleAttribute("data-scrolled", window.scrollY > 24);
    };
    onNavScroll();
    window.addEventListener("scroll", onNavScroll, { passive: true });
  }

  // Pointer position (-0.5..0.5) into --px / --py; CSS turns it into motion.
  if (!reduceMotion.matches && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll("[data-pointer]").forEach(function (el) {
      var raf = 0;
      var set = function (x, y) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          el.style.setProperty("--px", x.toFixed(3));
          el.style.setProperty("--py", y.toFixed(3));
        });
      };
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      });
      el.addEventListener("pointerleave", function () {
        set(0, 0);
      });
    });
  }

  // Looping clips play only while visible, and never with reduced motion.
  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("video[data-loop]").forEach(function (v) {
      io.observe(v);
    });
  }

  // Mouse drag scrolls horizontal rails. Touch and trackpads scroll natively.
  document.querySelectorAll("[data-drag-scroll]").forEach(function (rail) {
    var startX = 0;
    var startScroll = 0;
    var moved = false;
    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      moved = false;
      rail.setPointerCapture(e.pointerId);
      rail.classList.add("is-dragging");
    });
    rail.addEventListener("pointermove", function (e) {
      if (!rail.classList.contains("is-dragging")) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      rail.scrollLeft = startScroll - dx;
    });
    var end = function () {
      rail.classList.remove("is-dragging");
    };
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    // Swallow the click that ends a drag.
    rail.addEventListener("click", function (e) {
      if (moved) e.preventDefault();
    }, true);
  });

  // Photos: on wide screens the section pins and vertical scroll pans the
  // gallery sideways. Otherwise it stays a native scroll-snap strip.
  var section = document.querySelector("[data-pan]");
  var track = section && section.querySelector("[data-track]");
  if (!section || !track) return;

  var panQuery = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
  var distance = 0;
  var raf = 0;
  var active = false;

  function apply() {
    var top = section.getBoundingClientRect().top;
    var p = distance > 0 ? Math.min(1, Math.max(0, -top / distance)) : 0;
    track.style.transform = "translate3d(" + (-p * distance).toFixed(1) + "px, 0, 0)";
    section.style.setProperty("--progress", p.toFixed(4));
  }
  function measure() {
    if (!active) return;
    distance = Math.max(0, track.scrollWidth - window.innerWidth);
    section.style.height = window.innerHeight + distance + "px";
    apply();
  }
  function onScroll() {
    if (!active) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(apply);
  }
  function update() {
    active = panQuery.matches;
    section.classList.toggle("photos-pinned", active);
    if (active) {
      measure();
    } else {
      section.style.height = "";
      section.style.removeProperty("--progress");
      track.style.transform = "";
    }
  }

  update();
  panQuery.addEventListener("change", update);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(track);
  // Lazy images change the track width as they load.
  track.querySelectorAll("img").forEach(function (img) {
    img.addEventListener("load", measure);
  });
})();
