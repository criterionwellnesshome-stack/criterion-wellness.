const CRITERION_PRODUCTS = {
    "gonado-guard": {
        id: "gonado-guard",
        name: "Criterion Life Gonado-Guard",
        category: "Male Fertility Care",
        badge: "Flagship Male Formula",
        price: 35000,
        formattedPrice: "₦35,000",
        form: "60 Concentrated Capsules",
        image: "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80",
        shortDesc: "Specialized male reproductive formula engineered to nourish testicles, enhance healthy spermatogenesis, sperm count, motility, morphology, and hormonal vitality.",
        description: "Criterion Life Gonado-Guard is formulated using clinically researched botanical adaptogens and bioactive phytonutrients specifically indicated for male reproductive health. It works deep at the cellular level to improve testicular perfusion, protect spermatocytes against oxidative apoptosis, and encourage normal testosterone synthesis.",
        ingredients: [
            { name: "Red Maca Extract", percentage: "25%", role: "Supports spermatogenesis, endurance, and hormonal vitality." },
            { name: "Ashwagandha (KSM-66) Extract", percentage: "25%", role: "Adaptogenic support to lower cortisol and boost sperm motility." },
            { name: "Tribulus Terrestris Extract", percentage: "25%", role: "Stimulates luteinizing hormone and androgen receptors." },
            { name: "Garlic Extract", percentage: "19.7%", role: "Improves testicular microcirculation and acts as an antioxidant." },
            { name: "Bee Pollen", percentage: "10%", role: "Rich source of zinc, bioflavonoids, and amino acids for seminal fluid." }
        ],
        usage: "Take 2 capsules twice daily with warm water after meals, or as directed by your Criterion naturopath.",
        duration: "Minimum 90-day protocol recommended for full spermatogenesis cycle."
    },
    "vitality-tonic": {
        id: "vitality-tonic",
        name: "Criterion Vitality & Stamina Tonic",
        category: "Male Reproductive Care",
        badge: "Daily Tonic",
        price: 25000,
        formattedPrice: "₦25,000",
        form: "500ml Liquid Herbal Tonic",
        image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
        shortDesc: "Adaptogenic cellular restorative that rejuvenates adrenal reserves, combats physical fatigue, and enhances circulatory blood flow for peak performance.",
        description: "A potent liquid herbal extraction that restores depleted energy reserves, supports nitric oxide production for vascular health, and reduces cellular fatigue in hardworking men.",
        ingredients: [
            { name: "Panax Ginseng Extract", percentage: "30%", role: "Deep cellular energy and endocrine stimulation." },
            { name: "Maca Root Extract", percentage: "25%", role: "Stamina, libido, and physical endurance." },
            { name: "Fenugreek Powder Extract", percentage: "20%", role: "Free testosterone bioavailability." },
            { name: "Moringa Oleifera", percentage: "15%", role: "Dense bio-available micronutrients." },
            { name: "Black Seed (Nigella Sativa)", percentage: "10%", role: "Systemic antioxidant and anti-inflammatory." }
        ],
        usage: "Take 30ml (two tablespoons) morning and evening before meals.",
        duration: "Recommended daily for continuous vitality."
    },
    "womens-cycle-support": {
        id: "womens-cycle-support",
        name: "Criterion Life Women's Cycle Support",
        category: "Female Hormonal Balance",
        badge: "Top Female Formulation",
        price: 35000,
        formattedPrice: "₦35,000",
        form: "60 Concentrated Capsules",
        image: "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=800&q=80",
        shortDesc: "Flagship female reproductive formula created to harmonize estrogen-progesterone ratios, encourage timely ovulatory function, and restore feminine wellness.",
        description: "Crafted specifically for women navigating irregular cycles, anovulation, or hormonal imbalances. The synergism of Vitex and Maca stimulates the pituitary gland to optimize luteal phase progesterone while calming excessive androgen production.",
        ingredients: [
            { name: "Vitex (Chaste Tree Berry) Extract", percentage: "47.6%", role: "Regulates prolactin, balances pituitary LH/FSH secretion, and boosts progesterone." },
            { name: "Maca Root Extract", percentage: "28.6%", role: "Nourishes the endocrine axis and supports ovulatory stamina." },
            { name: "Ceylon Cinnamon Powder", percentage: "11.9%", role: "Supports insulin sensitivity and healthy ovarian metabolism." },
            { name: "Ginger Powder", percentage: "11.9%", role: "Clears pelvic stagnation and relieves menstrual discomfort." }
        ],
        usage: "Take 2 capsules once daily in the morning with food and warm water.",
        duration: "Continuous use for 3 to 6 cycles recommended for lasting hormonal harmony."
    },
    "hormone-tea": {
        id: "hormone-tea",
        name: "Criterion Endocrine Harmony Tea",
        category: "Female Hormonal Balance",
        badge: "Botanical Infusion",
        price: 18000,
        formattedPrice: "₦18,000",
        form: "150g Organic Loose-Leaf Herbal Tea",
        image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
        shortDesc: "Therapeutic botanical loose-leaf tea designed to calm pelvic tension, reduce inflammation, nourish uterine lining, and foster balanced hormonal rhythms.",
        description: "A restorative womb tea blended with traditional uterine tonics. Red raspberry leaf gently tones the pelvic musculature while spearmint and chamomile calm inflammation and soothe the nervous system.",
        ingredients: [
            { name: "Red Raspberry Leaf", percentage: "35%", role: "Uterine tonic that strengthens pelvic floor and endometrium." },
            { name: "Spearmint Leaf", percentage: "25%", role: "Helps modulate elevated free testosterone in women." },
            { name: "Nettle Leaf", percentage: "20%", role: "Iron-rich mineral nutritive supporting healthy blood." },
            { name: "Chamomile & Lemon Balm", percentage: "20%", role: "Soothes smooth muscles, cramps, and reduces emotional tension." }
        ],
        usage: "Infuse 1 tablespoon in freshly boiled water for 10-15 minutes. Drink 1-2 cups daily.",
        duration: "Safe for daily consumption throughout the entire menstrual cycle."
    },
    "micro-guard": {
        id: "micro-guard",
        name: "Criterion Life Micro-Guard",
        category: "Systemic & Microbial Detox",
        badge: "Antimicrobial Defense",
        price: 30000,
        formattedPrice: "₦30,000",
        form: "60 Concentrated Capsules",
        image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
        shortDesc: "High-potency botanical antimicrobial compound specifically formulated to assist the body in clearing stubborn bacterial, fungal, and infection-related imbalances.",
        description: "An intensive botanical defense formula designed to support systemic microbial balance. Specifically indicated where subclinical pelvic infections, chronic dysbiosis, Staphylococcus, or vaginal/prostatic flora imbalances hinder reproductive success.",
        ingredients: [
            { name: "African Mahogany Powder", percentage: "20%", role: "Traditional bitter bark known for strong anti-pathogenic properties." },
            { name: "Violet Tree (Securidaca) Powder", percentage: "19.5%", role: "Deep tissue antimicrobial and systemic purifying agent." },
            { name: "Echinacea Extract", percentage: "30.1%", role: "Immunomodulator that activates leukocyte phagocytosis." },
            { name: "Garlic Extract (Allicin-rich)", percentage: "20%", role: "Broad-spectrum antibacterial and antifungal agent." },
            { name: "Turmeric Powder", percentage: "10.1%", role: "Anti-inflammatory and mucosal tissue protectant." }
        ],
        usage: "Take 2 capsules twice daily after meals with plenty of water.",
        duration: "30 to 60 days course depending on infection severity."
    },
    "hepato-guard": {
        id: "hepato-guard",
        name: "Criterion Life Hepato-Guard",
        category: "Systemic & Microbial Detox",
        badge: "Liver Cleanse",
        price: 28000,
        formattedPrice: "₦28,000",
        form: "60 Concentrated Capsules",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        shortDesc: "Essential hepatic wellness formula engineered to strengthen Phase 1 and 2 liver detoxification, clear circulating xenoestrogens, and promote bile flow.",
        description: "The liver is the primary organ responsible for breaking down circulating hormones (excess estrogen and toxic metabolites). Hepato-Guard provides targeted antioxidant protection to hepatocytes and accelerates Phase 2 sulfation and glucuronidation pathways.",
        ingredients: [
            { name: "Turmeric Powder (Curcumin)", percentage: "39.9%", role: "Stimulates bile flow and shields liver cells from oxidative stress." },
            { name: "Milk Thistle Extract (Silymarin)", percentage: "30.0%", role: "Regenerates damaged hepatocytes and stabilizes cell membranes." },
            { name: "Dandelion Root Extract", percentage: "24.9%", role: "Enhances hepatic toxin clearance and gentle diuresis." },
            { name: "Cayenne Pepper", percentage: "5.1%", role: "Boosts gastrointestinal absorption and vascular delivery." }
        ],
        usage: "Take 1-2 capsules daily before bedtime with warm water.",
        duration: "Recommended as part of any 30-day foundational detox."
    },
    "couple-bundle": {
        id: "couple-bundle",
        name: "Couple Conception & Cleansing Kit",
        category: "Comprehensive Care Bundles",
        badge: "Best Value Protocol",
        price: 88000,
        formattedPrice: "₦88,000",
        form: "Full 60-Day Dual Couple Protocol",
        image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
        shortDesc: "The ultimate 60-day dual fertility protocol. Combines Gonado-Guard for him, Women's Cycle Support for her, and Micro-Guard for microbial clearance.",
        description: "Fertility is a shared journey. This comprehensive dual protocol provides synchronized support for both partners: eliminating latent infections, optimizing male sperm parameters, regulating female ovulation, and creating an optimal uterine environment for conception.",
        ingredients: [
            { name: "1x Criterion Life Gonado-Guard", percentage: "Partner 1", role: "Male spermatogenesis and testosterone support." },
            { name: "1x Women's Cycle Support", percentage: "Partner 2", role: "Female hormonal and ovulatory regulation." },
            { name: "1x Micro-Guard Antimicrobial", percentage: "Shared", role: "Synchronized microbial clearance for both partners." },
            { name: "1x Endocrine Harmony Tea", percentage: "Partner 2", role: "Pelvic relaxation and womb nourishment." }
        ],
        usage: "Includes personalized dosage timetable and lifestyle guidelines for both partners.",
        duration: "Comprehensive 60-day dual treatment."
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CRITERION_PRODUCTS;
}
