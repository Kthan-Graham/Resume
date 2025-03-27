// Global function for download
function downloadResume() {
    const link = document.createElement('a');
    link.href = 'resume 2025.docx';
    link.download = 'Kthan_Graham_Resume.docx';
    
    const btn = document.querySelector('.download-btn');
    btn.classList.add('flip');
    
    setTimeout(() => {
        btn.classList.remove('flip');
    }, 2000);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
    // Theme management
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 
                       (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(currentTheme);
    
    themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Set initial theme
    function setTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        document.body.classList.toggle('light-mode', theme === 'light');
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // Add click handler for download button
    document.querySelector('.download-btn').addEventListener('click', downloadResume);

    // Add click handler for smooth scrolling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.hash) {
                e.preventDefault();
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetSection = document.querySelector(this.hash);
                
                window.scrollTo({
                    top: targetSection.offsetTop - navbarHeight,
                    behavior: 'smooth'
                });
                
                // Update URL without jumping
                history.pushState(null, null, this.hash);
            }
        });
    });

    // Scroll-based section highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    function highlightNav() {
        let current = '';
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= (sectionTop - navbarHeight - 100)) {
                current = '#' + section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === current) {
                link.classList.add('active');
            }
        });
    }

    // Initialize and set up listeners
    highlightNav();
    window.addEventListener('scroll', throttle(highlightNav, 100));
    window.addEventListener('hashchange', highlightNav);

    // Throttle scroll events for performance
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        }
    }
});
