const fs = require('fs');

let html = fs.readFileSync('f:/Vscode/TO DO LIST/index.html', 'utf8');

// 1. Change rounded corners to rounded-[20px]
html = html.replace(/rounded-\[2rem\]/g, 'rounded-[20px]');
html = html.replace(/rounded-\[2\.5rem\]/g, 'rounded-[20px]');
html = html.replace(/rounded-3xl/g, 'rounded-[20px]');

// 2. Update FABs
html = html.replace(/class=\"w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-center text-3xl btn-action pb-1 touch-target\"/g, 'class=\"w-16 h-16 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl btn-action pb-1 touch-target z-10\"');
html = html.replace(/class=\"w-14 h-14 bg-\[#7EACB5\] text-white rounded-2xl shadow-lg flex items-center justify-center text-xl btn-action touch-target\"/g, 'class=\"w-12 h-12 bg-[#7EACB5] text-white rounded-full shadow-lg flex items-center justify-center text-xl btn-action touch-target\"');
html = html.replace(/class=\"w-14 h-14 bg-\[#BF4646\] text-white rounded-2xl shadow-lg flex items-center justify-center text-xl btn-action touch-target\"/g, 'class=\"w-12 h-12 bg-[#BF4646] text-white rounded-full shadow-lg flex items-center justify-center text-xl btn-action touch-target\"');

// 3. Modals slide-up
let slideUpTransition = 'x-transition:enter=\"transition ease-out duration-300\" x-transition:enter-start=\"opacity-0 translate-y-10\" x-transition:enter-end=\"opacity-100 translate-y-0\" x-transition:leave=\"transition ease-in duration-200\" x-transition:leave-start=\"opacity-100 translate-y-0\" x-transition:leave-end=\"opacity-0 translate-y-10\"';
html = html.replace(/x-transition\.scale\.origin\.bottom\.right/g, slideUpTransition);

// 4. Add fade-in-up class to glass-cards
html = html.replace(/class=\"glass-card/g, 'class=\"glass-card animate-fade-in-up');

fs.writeFileSync('f:/Vscode/TO DO LIST/index.html', html);
console.log('Updated index.html');

// 5. Update CSS
let css = fs.readFileSync('f:/Vscode/TO DO LIST/style.css', 'utf8');
// Update box-shadow for softer look
css = css.replace(/box-shadow: 0 10px 30px rgba\(0, 0, 0, 0\.03\);/g, 'box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.08);');
css = css.replace(/box-shadow: 0 20px 40px rgba\(0, 0, 0, 0\.06\);/g, 'box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.12);');
css = css.replace(/border: 1px solid var\(--card-border\);/g, 'border: 1px solid var(--card-border);\n    border-top: 1px solid rgba(255, 255, 255, 0.15); /* Slight elevation feel */');

if (!css.includes('animate-fade-in-up')) {
    css += `\n
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.animate-fade-in-up {
    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
`;
}

fs.writeFileSync('f:/Vscode/TO DO LIST/style.css', css);
console.log('Updated style.css');
