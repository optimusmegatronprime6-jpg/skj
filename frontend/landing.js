/* ═══════════════════════════════════════
   Shree Kamakshi Jewellers — Landing JS
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ─── Theme Toggle ───
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('skj-landing-theme');
    if (savedTheme === 'light') document.body.classList.add('light-mode');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('skj-landing-theme', isLight ? 'light' : 'dark');
        });
    }

    // ─── Cursor Glow ───
    const glow = document.getElementById('cursorGlow');
    const heroLogo3d = document.getElementById('heroLogo3d');
    if (glow && window.innerWidth > 768) {
        document.addEventListener('mousemove', e => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
            glow.style.opacity = '1';

            // 3D parallax on hero logo
            if (heroLogo3d) {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const rotateY = ((e.clientX - centerX) / centerX) * 12;
                const rotateX = ((centerY - e.clientY) / centerY) * 8;
                heroLogo3d.style.transform = `translate(-50%, -50%) perspective(800px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
            }
        });
        document.addEventListener('mouseleave', () => {
            glow.style.opacity = '0';
            if (heroLogo3d) {
                heroLogo3d.style.transform = 'translate(-50%, -50%) perspective(800px) rotateY(0deg) rotateX(0deg)';
            }
        });
    }

    // ─── Gold Particles ───
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.1
            });
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
                ctx.fill();
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // ─── Nav Scroll Effect ───
    const nav = document.getElementById('mainNav');
    const scrollHint = document.getElementById('scrollHint');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
        if (scrollHint && window.scrollY > 200) {
            scrollHint.style.opacity = '0';
        } else if (scrollHint) {
            scrollHint.style.opacity = '1';
        }
    });

    // ─── Mobile Nav Toggle ───
    const toggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (toggle) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            const spans = toggle.querySelectorAll('span');
            if (navLinks.classList.contains('open')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
            } else {
                spans[0].style.transform = '';
                spans[1].style.opacity = '1';
                spans[2].style.transform = '';
            }
        });
    }

    // ─── Scroll Animations ───
    const animElements = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, parseInt(delay));
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    animElements.forEach(el => observer.observe(el));

    // ─── Counter Animation ───
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                let current = 0;
                const increment = target / 60;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = Math.floor(current).toLocaleString();
                }, 25);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    counters.forEach(c => counterObserver.observe(c));

    // ─── Smooth anchor scroll ───
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (navLinks.classList.contains('open')) {
                    navLinks.classList.remove('open');
                }
            }
        });
    });
});
