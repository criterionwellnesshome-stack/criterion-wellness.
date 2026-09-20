// The Criterion Holistic Wellness Home — Hero Ambient Motion & Sequential Text Reveal

(function() {
    'use strict';

    // 1. Controlled Sequential Text Reveal
    function initHeroTextReveal() {
        const stage = document.getElementById('hero-text-sequence-stage');
        const activeWordEl = document.getElementById('hero-active-word');
        const finalWordsEl = document.getElementById('hero-final-words');
        const heroSection = document.querySelector('.hero-campaign-section');

        if (!stage || !activeWordEl || !finalWordsEl) return;

        // Check prefers-reduced-motion
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            stage.style.display = 'none';
            finalWordsEl.classList.add('settled');
            return;
        }

        const sequence = [
            { text: 'PEACE.', colorClass: 'word-primary', duration: 1500 },
            { text: 'JOY.', colorClass: 'word-primary', duration: 1400 },
            { text: 'VITALITY.', colorClass: 'word-primary', duration: 1500 },
            { text: 'FOR YOU.', colorClass: 'word-accent', duration: 1700 }
        ];

        let isSettled = false;

        function settleFinalState() {
            if (isSettled) return;
            isSettled = true;
            stage.classList.add('fade-out');
            setTimeout(() => {
                stage.style.display = 'none';
                finalWordsEl.classList.add('settled');
            }, 350);
        }

        // Allow click anywhere on hero to skip straight to final state
        if (heroSection) {
            heroSection.addEventListener('click', (e) => {
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    settleFinalState();
                }
            }, { once: true });
        }

        function playStep(index) {
            if (isSettled) return;

            if (index >= sequence.length) {
                settleFinalState();
                return;
            }

            const item = sequence[index];
            activeWordEl.textContent = item.text;
            activeWordEl.className = 'hero-sequence-word ' + item.colorClass;
            
            // Trigger enter animation
            activeWordEl.classList.remove('word-exit');
            activeWordEl.classList.add('word-enter');

            // Set timeout for exit
            const displayTime = item.duration - 380;
            setTimeout(() => {
                if (isSettled) return;
                activeWordEl.classList.remove('word-enter');
                activeWordEl.classList.add('word-exit');

                setTimeout(() => {
                    if (isSettled) return;
                    playStep(index + 1);
                }, 350);
            }, displayTime);
        }

        // Begin sequence after small initial page mount delay
        setTimeout(() => {
            playStep(0);
        }, 250);
    }

    // 2. Ambient Organic Living Motion Canvas (Fertility + Wellness + Natural Care)
    function initHeroAmbientMotion() {
        const container = document.getElementById('hero-ambient-motion');
        const canvas = document.getElementById('hero-ambient-canvas');
        if (!container || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Check prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            container.classList.add('reduced-motion');
            return;
        }

        let width = 0;
        let height = 0;
        let animationFrameId = null;

        function resize() {
            const rect = container.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }

        resize();
        window.addEventListener('resize', debounce(resize, 150));

        // Create subtle floating fertility/botanical pollen nodes
        const particleCount = Math.min(30, Math.floor(width / 16) || 22);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2.8 + 1.2,
                vx: (Math.random() - 0.5) * 0.28,
                vy: -Math.random() * 0.35 - 0.1, // gentle upward floating drift
                alpha: Math.random() * 0.5 + 0.2,
                baseAlpha: Math.random() * 0.5 + 0.2,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                pulseOffset: Math.random() * Math.PI * 2,
                colorType: Math.random() > 0.4 ? 'emerald' : 'gold'
            });
        }

        let time = 0;

        function render() {
            if (document.hidden) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            time += 0.008;
            ctx.clearRect(0, 0, width, height);

            // Draw subtle ambient organic gradient background
            const cx = width * 0.5;
            const cy = height * 0.5;
            const bgGradient = ctx.createRadialGradient(
                cx + Math.sin(time * 0.5) * 20, 
                cy + Math.cos(time * 0.5) * 15, 
                20, 
                cx, 
                cy, 
                Math.max(width, height) * 0.65
            );
            bgGradient.addColorStop(0, 'rgba(31, 77, 58, 0.18)');
            bgGradient.addColorStop(0.5, 'rgba(79, 138, 91, 0.08)');
            bgGradient.addColorStop(1, 'rgba(250, 248, 245, 0)');

            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Draw floating botanical & fertility micro-particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx + Math.sin(time + p.pulseOffset) * 0.15;
                p.y += p.vy;

                // Wrap around edges
                if (p.y < -10) {
                    p.y = height + 10;
                    p.x = Math.random() * width;
                }
                if (p.x < -10) p.x = width + 10;
                if (p.x > width + 10) p.x = -10;

                // Gentle pulsing opacity
                const currentAlpha = p.baseAlpha + Math.sin(time * 2 + p.pulseOffset) * 0.15;
                const safeAlpha = Math.max(0.1, Math.min(0.8, currentAlpha));

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

                if (p.colorType === 'gold') {
                    ctx.fillStyle = `rgba(184, 134, 11, ${safeAlpha * 0.75})`;
                } else {
                    ctx.fillStyle = `rgba(79, 138, 91, ${safeAlpha * 0.85})`;
                }
                ctx.fill();
            }

            // Draw subtle interconnecting nutrient lines between nearby particles
            ctx.lineWidth = 0.6;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 65) {
                        const lineAlpha = (1 - dist / 65) * 0.12;
                        ctx.strokeStyle = `rgba(79, 138, 91, ${lineAlpha})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameId = requestAnimationFrame(render);
        }

        animationFrameId = requestAnimationFrame(render);
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        initHeroTextReveal();
        initHeroAmbientMotion();
    });
})();
