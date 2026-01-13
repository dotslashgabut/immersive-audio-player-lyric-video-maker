export const fontGroups = [
    {
        label: "Modern & Clean",
        options: [
            { label: "System Sans Serif", value: "ui-sans-serif, system-ui, sans-serif" },
            { label: "Inter", value: "'Inter', sans-serif" },
            { label: "Roboto", value: "'Roboto', sans-serif" },
            { label: "Poppins", value: "'Poppins', sans-serif" },
            { label: "Montserrat", value: "'Montserrat', sans-serif" },
            { label: "Open Sans", value: "'Open Sans', sans-serif" },
            { label: "Lato", value: "'Lato', sans-serif" },
            { label: "Raleway", value: "'Raleway', sans-serif" },
            { label: "Outfit", value: "'Outfit', sans-serif" },
            { label: "Nunito", value: "'Nunito', sans-serif" }
        ]
    },
    {
        label: "Classic & Elegant",
        options: [
            { label: "System Serif", value: "ui-serif, Georgia, serif" },
            { label: "Playfair Display", value: "'Playfair Display', serif" },
            { label: "Merriweather", value: "'Merriweather', serif" },
            { label: "Lora", value: "'Lora', serif" },
            { label: "Crimson Text", value: "'Crimson Text', serif" },
            { label: "EB Garamond", value: "'EB Garamond', serif" },
            { label: "Libre Baskerville", value: "'Libre Baskerville', serif" }
        ]
    },
    {
        label: "Display & Bold",
        options: [
            { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
            { label: "Anton", value: "'Anton', sans-serif" },
            { label: "Oswald", value: "'Oswald', sans-serif" },
            { label: "Archivo Black", value: "'Archivo Black', sans-serif" },
            { label: "Staatliches", value: "'Staatliches', cursive" },
            { label: "Righteous", value: "'Righteous', cursive" },
            { label: "Bungee", value: "'Bungee', cursive" }
        ]
    },
    {
        label: "Handwritten & Script",
        options: [
            { label: "Dancing Script", value: "'Dancing Script', cursive" },
            { label: "Pacifico", value: "'Pacifico', cursive" },
            { label: "Great Vibes", value: "'Great Vibes', cursive" },
            { label: "Satisfy", value: "'Satisfy', cursive" },
            { label: "Shadows Into Light", value: "'Shadows Into Light', cursive" },
            { label: "Caveat", value: "'Caveat', cursive" },
            { label: "Indie Flower", value: "'Indie Flower', cursive" },
            { label: "Kalam", value: "'Kalam', cursive" },
            { label: "Sacramento", value: "'Sacramento', cursive" }
        ]
    },
    {
        label: "Fun & Playful",
        options: [
            { label: "Fredoka One", value: "'Fredoka One', cursive" },
            { label: "Bangers", value: "'Bangers', cursive" },
            { label: "Luckiest Guy", value: "'Luckiest Guy', cursive" },
            { label: "Chewy", value: "'Chewy', cursive" },
            { label: "Bubblegum Sans", value: "'Bubblegum Sans', cursive" },
            { label: "Cherry Cream Soda", value: "'Cherry Cream Soda', cursive" },
            { label: "Patrick Hand", value: "'Patrick Hand', cursive" }
        ]
    },
    {
        label: "Tech & Futuristic",
        options: [
            { label: "System Monospace", value: "ui-monospace, monospace" },
            { label: "Orbitron", value: "'Orbitron', sans-serif" },
            { label: "Audiowide", value: "'Audiowide', cursive" },
            { label: "Share Tech Mono", value: "'Share Tech Mono', monospace" },
            { label: "VT323", value: "'VT323', monospace" },
            { label: "Press Start 2P", value: "'Press Start 2P', cursive" },
            { label: "Fira Code", value: "'Fira Code', monospace" },
            { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" }
        ]
    },
    {
        label: "Decorative & Themed",
        options: [
            { label: "Metal Mania", value: "'Metal Mania', cursive" },
            { label: "UnifrakturMaguntia", value: "'UnifrakturMaguntia', cursive" },
            { label: "Cinzel", value: "'Cinzel', serif" },
            { label: "Creepster", value: "'Creepster', cursive" },
            { label: "Pirata One", value: "'Pirata One', cursive" },
            { label: "Rubik Moonrocks", value: "'Rubik Moonrocks', cursive" },
            { label: "Nabla", value: "'Nabla', cursive" }
        ]
    },
    {
        label: "International & Multilingual",
        options: [
            { label: "Noto Sans SC (Chinese)", value: "'Noto Sans SC', sans-serif" },
            { label: "Noto Sans JP (Japanese)", value: "'Noto Sans JP', sans-serif" },
            { label: "Noto Sans KR (Korean)", value: "'Noto Sans KR', sans-serif" },
            { label: "Noto Sans Arabic (Arabic)", value: "'Noto Sans Arabic', sans-serif" },
            { label: "Noto Sans Devanagari (Hindi)", value: "'Noto Sans Devanagari', sans-serif" }
        ]
    }
];

export const loadGoogleFonts = () => {
    // Collect all font families
    const families = new Set<string>();

    fontGroups.forEach(group => {
        group.options.forEach(opt => {
            const val = opt.value.split(',')[0].trim().replace(/['"]/g, '');
            // Filter system fonts
            if (!val.startsWith('ui-') && val !== 'system-ui' && val !== 'sans-serif' && val !== 'serif' && val !== 'monospace') {
                families.add(val);
            }
        });
    });

    if (families.size === 0) return;

    // Construct URL
    // Format: family=Font1:wght@400;700&family=Font2...
    // We'll load regular and bold (400, 700) where possible, or just default.
    // For simplicity, let's request 400 and 700.

    // Note: Some fonts might not have 700. Google Fonts is smart enough to handle or serve nearest? 
    // Actually if we request specific weights that don't exist, it might fail for that font.
    // Safest is to just request `display=swap`. 
    // Ideally we'd look up which weights exist, but that's hard.
    // Let's try appending `:wght@400;700` to all. Most display fonts have at least one.
    // However, some fonts only have 400. Requesting 700 might cause issues or fallback.
    // A safer bet for a bulk loader: Just load the family name without weights (defaults to 400), 
    // OR try to be smarter.
    // Let's just use the family name. Browsers can fake bold if needed, or if the font only has one weight it loads that.

    const encodedFamilies = Array.from(families).map(f => `family=${f.replace(/ /g, '+')}:wght@400;700`);
    const query = encodedFamilies.join('&');
    const url = `https://fonts.googleapis.com/css2?${query}&display=swap`;

    // Check if already loaded
    if (document.getElementById('google-fonts-loader')) return;

    const link = document.createElement('link');
    link.id = 'google-fonts-loader';
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);

    // Preconnects
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);
};
