(() => {
  // <stdin>
  (function() {
    const htmlElement = document.documentElement;
    function setTheme(theme) {
      console.log("\u8DDF\u968F\u7CFB\u7EDF\u8BBE\u7F6E\u4E3B\u9898\u4E3A:", theme);
      if (theme === "dark") {
        htmlElement.setAttribute("data-theme", "dark");
      } else {
        htmlElement.removeAttribute("data-theme");
      }
    }
    function getSystemTheme() {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "dark" : "light";
    }
    function initializeTheme() {
      const systemTheme = getSystemTheme();
      setTheme(systemTheme);
    }
    function setupSystemThemeListener() {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      function handleSystemThemeChange(e) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        console.log("\u7CFB\u7EDF\u4E3B\u9898\u5DF2\u66F4\u6539\uFF0C\u7F51\u7AD9\u5DF2\u81EA\u52A8\u540C\u6B65\u5230:", newTheme);
      }
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    }
    function setupSidebarToggle() {
      const isTablet = window.innerWidth >= 769 && window.innerWidth <= 1024;
      const isMobile = window.innerWidth <= 768;
      if (!isTablet && !isMobile) return;
      if (document.querySelector(".sidebar-toggle")) {
        console.log("sidebar-toggle\u6309\u94AE\u5DF2\u5B58\u5728");
        return;
      }
      const sidebarToggle = document.createElement("button");
      sidebarToggle.className = "sidebar-toggle";
      sidebarToggle.innerHTML = "\u2139\uFE0F";
      sidebarToggle.setAttribute("aria-label", "Toggle sidebar");
      sidebarToggle.setAttribute("title", "Toggle sidebar");
      document.body.appendChild(sidebarToggle);
      console.log("\u521B\u5EFA\u4E86sidebar-toggle\u6309\u94AE");
      const sidebarOverlay = document.createElement("div");
      sidebarOverlay.className = "sidebar-overlay";
      document.body.appendChild(sidebarOverlay);
      const sidebarLeft = document.querySelector(".sidebar-left");
      if (!sidebarLeft) return;
      function toggleSidebar() {
        const isActive = sidebarLeft.classList.contains("active");
        if (isActive) {
          sidebarLeft.classList.remove("active");
          sidebarOverlay.classList.remove("active");
          document.body.style.overflow = "";
        } else {
          sidebarLeft.classList.add("active");
          sidebarOverlay.classList.add("active");
          document.body.style.overflow = "hidden";
        }
      }
      function hideSidebar() {
        sidebarLeft.classList.remove("active");
        sidebarOverlay.classList.remove("active");
        document.body.style.overflow = "";
      }
      sidebarToggle.addEventListener("click", function(e) {
        e.stopPropagation();
        toggleSidebar();
      });
      sidebarOverlay.addEventListener("click", hideSidebar);
      sidebarLeft.addEventListener("click", function(e) {
        e.stopPropagation();
      });
      document.addEventListener("click", function(e) {
        if (!sidebarLeft.contains(e.target) && !sidebarToggle.contains(e.target)) {
          hideSidebar();
        }
      });
      window.addEventListener("resize", function() {
        const isTablet2 = window.innerWidth >= 769 && window.innerWidth <= 1024;
        const isMobile2 = window.innerWidth <= 768;
        if (!isTablet2 && !isMobile2) {
          hideSidebar();
        }
      });
    }
    function setupMobileSearch() {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) return;
      const searchToggle = document.getElementById("search-toggle");
      const mobileSearchOverlay = document.getElementById("mobile-search-overlay");
      const mobileSearchClose = document.getElementById("mobile-search-close");
      const mobileSearchInput = document.getElementById("mobile-search-input");
      const mobileSearchResults = document.getElementById("mobile-search-results");
      if (!searchToggle || !mobileSearchOverlay) return;
      function showSearchOverlay() {
        mobileSearchOverlay.style.display = "flex";
        if (mobileSearchInput) {
          mobileSearchInput.focus();
        }
        document.body.style.overflow = "hidden";
      }
      function hideSearchOverlay() {
        mobileSearchOverlay.style.display = "none";
        if (mobileSearchInput) {
          mobileSearchInput.value = "";
        }
        if (mobileSearchResults) {
          mobileSearchResults.innerHTML = "";
        }
        document.body.style.overflow = "";
      }
      function performSearch(query) {
        if (!query.trim()) {
          if (mobileSearchResults) {
            mobileSearchResults.innerHTML = "";
          }
          return;
        }
        const posts = document.querySelectorAll(".post-card");
        const results = [];
        posts.forEach((post) => {
          const title = post.querySelector(".post-header h2")?.textContent || "";
          const content = post.querySelector(".post-content")?.textContent || "";
          const dateElement = post.querySelector("time");
          const date = dateElement ? dateElement.textContent : "";
          const venueElements = post.querySelectorAll(".tag-venue");
          const venues = Array.from(venueElements).map((tag) => tag.textContent).join(" ");
          const keywordElements = post.querySelectorAll(".tag-keyword");
          const keywords = Array.from(keywordElements).map((tag) => tag.textContent).join(" ");
          const metaElements = post.querySelectorAll(".post-meta *");
          const metaText = Array.from(metaElements).map((el) => el.textContent).join(" ");
          const searchText = `${title} ${content} ${date} ${venues} ${keywords} ${metaText}`.toLowerCase();
          const queryLower = query.toLowerCase();
          if (searchText.includes(queryLower)) {
            results.push({
              title,
              element: post,
              date,
              venue: venues,
              keywords
            });
          }
        });
        if (mobileSearchResults) {
          if (results.length === 0) {
            mobileSearchResults.innerHTML = '<div class="no-results">No results found</div>';
          } else {
            mobileSearchResults.innerHTML = results.map((result) => {
              const postId = result.element.querySelector(".post-header")?.getAttribute("data-post-id");
              return `<div class="search-result-item" data-post-id="${postId}">
              <div class="search-result-title"><strong>${result.title}</strong></div>
              ${result.date ? `<div class="search-result-meta">\u{1F4C5} ${result.date}</div>` : ""}
              ${result.venue ? `<div class="search-result-meta">\u{1F4C4} ${result.venue}</div>` : ""}
              ${result.keywords ? `<div class="search-result-meta">\u{1F3F7}\uFE0F ${result.keywords.split(" ").slice(0, 3).join(", ")}${result.keywords.split(" ").length > 3 ? "..." : ""}</div>` : ""}
            </div>`;
            }).join("");
            mobileSearchResults.querySelectorAll(".search-result-item").forEach((item, index) => {
              item.addEventListener("click", () => {
                const targetPost = results[index].element;
                if (window.expandAndCenterPost) {
                  window.expandAndCenterPost(targetPost);
                }
                hideSearchOverlay();
              });
            });
          }
        }
      }
      searchToggle.addEventListener("click", showSearchOverlay);
      mobileSearchClose.addEventListener("click", hideSearchOverlay);
      mobileSearchOverlay.addEventListener("click", function(e) {
        if (e.target === mobileSearchOverlay) {
          hideSearchOverlay();
        }
      });
      if (mobileSearchInput) {
        mobileSearchInput.addEventListener("input", function() {
          performSearch(this.value);
        });
        mobileSearchInput.addEventListener("keypress", function(e) {
          if (e.key === "Enter") {
            performSearch(this.value);
          }
        });
      }
      document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && mobileSearchOverlay.style.display === "flex") {
          hideSearchOverlay();
        }
      });
    }
    initializeTheme();
    setupSystemThemeListener();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        setupSidebarToggle();
        setupMobileSearch();
      });
    } else {
      setupSidebarToggle();
      setupMobileSearch();
    }
    window.addEventListener("resize", function() {
      setupSidebarToggle();
      setupMobileSearch();
    });
  })();
})();
