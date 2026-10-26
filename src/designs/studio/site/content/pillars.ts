/**
 * Copy of the live pillar pages (src/pages/{wrap,reinforce,protect}.astro and
 * their Arabic twins under src/pages/ar/), word for word, for the Studio
 * versions. Taken from the live files on 2026-10-26; when the redesign goes
 * live, the live routes render the Studio template from this data instead.
 *
 * `faqSchema` is the live page's FAQPage JSON-LD exactly (its wording differs
 * slightly from the visible answers on some pages, as it does live).
 * A string starting with "@t:" is a key in src/i18n/translations.ts.
 */
import type { PillarCopy } from '../PillarPage.astro';

export const pillars: Record<string, PillarCopy> = {
  "en/wrap": {
    "title": "W is for Wrap | Vehicle Wrapping Dubai | WRP",
    "description": "Discover WRP's vehicle wrapping services - complete color transformation, custom designs, and paint protection for Dubai's luxury vehicles",
    "crumb": "Wrap",
    "hero": {
      "eyebrow": "THE FIRST PILLAR",
      "h1": "W is for Wrap",
      "lede": "Transform your vehicle's appearance with premium vinyl wrapping. From subtle elegance to bold statements, we bring your vision to life."
    },
    "intro": {
      "h2": "Vehicle Transformation",
      "paras": [
        "Vehicle wrapping is the art of applying premium vinyl film over your car's original paint, enabling complete color transformation while protecting the factory finish underneath. Whether you desire a full color change, custom design, or subtle accents, wrapping offers limitless possibilities.",
        "Our expert installers use precision techniques and premium materials to achieve seamless results. Every wrap is computer-cut for perfect panel coverage, applied in a climate-controlled environment, and finished to showroom perfection."
      ],
      "cards": [
        {
          "icon": "palette",
          "title": "Unlimited Colors",
          "desc": "Thousands of colors and finishes to choose from"
        },
        {
          "icon": "shield",
          "title": "Paint Protection",
          "desc": "Protects original paint from chips and scratches"
        },
        {
          "icon": "rotate-ccw",
          "title": "Fully Reversible",
          "desc": "Return to factory paint anytime without damage"
        },
        {
          "icon": "trending-up",
          "title": "Value Preservation",
          "desc": "Maintains resale value with protected paint"
        }
      ]
    },
    "services": {
      "h2": "Wrap Services",
      "sub": "Comprehensive wrapping solutions for every vision",
      "cards": [
        {
          "title": "Full Color Change",
          "desc": "Complete vehicle transformation with premium vinyl. Choose from matte, gloss, satin, or metallic finishes. Perfect for creating a unique look while protecting your factory paint.",
          "featured": false
        },
        {
          "title": "Custom Design",
          "desc": "Bespoke graphics, racing stripes, and personalized designs. Our designers work with you to create one-of-a-kind aesthetics that reflect your personality.",
          "featured": true
        },
        {
          "title": "Chrome Delete & Accents",
          "desc": "Transform chrome trim, window surrounds, and badges with satin or gloss black vinyl. Subtle yet impactful modifications for a modern, aggressive look.",
          "featured": false
        }
      ]
    },
    "pillars": {
      "h2": "The Three Pillars of WRP",
      "sub": "Discover our complete philosophy of automotive excellence",
      "cards": [
        {
          "title": "Reinforce",
          "desc": "Advanced protection systems that strengthen your vehicle's defense. Paint Protection Film and ceramic coating technologies engineered for Dubai's extreme climate.",
          "featured": false,
          "href": "/reinforce/",
          "label": "EXPLORE REINFORCE",
          "letter": "R"
        },
        {
          "title": "Protect",
          "desc": "Meticulous care and maintenance programs that preserve your vehicle's perfection. Premium wash, paint correction, and detailing services that maintain showroom condition.",
          "featured": false,
          "href": "/protect/",
          "label": "EXPLORE PROTECT",
          "letter": "P"
        }
      ]
    },
    "faq": {
      "h2": "Frequently Asked Questions",
      "sub": "Common questions about vehicle wrapping",
      "items": [
        {
          "q": "What is vehicle wrapping?",
          "a": "Vehicle wrapping is the process of applying a vinyl film over your car's original paint. It allows complete color transformation, custom designs, and paint protection while being fully reversible."
        },
        {
          "q": "How long does a car wrap last in Dubai?",
          "a": "Quality vinyl wraps typically last 3-5 years in Dubai's climate with proper care. Premium films with UV protection can last up to 7 years. Regular maintenance and garage storage extend wrap life."
        },
        {
          "q": "Can wraps be removed without damaging paint?",
          "a": "Yes, professional-grade wraps can be safely removed without damaging your factory paint. In fact, wraps protect the original paint underneath, preserving your vehicle's resale value."
        }
      ]
    },
    "cta": {
      "h2": "Ready to Transform Your Vehicle?",
      "text": "Explore endless possibilities with premium vehicle wrapping. Our team will help bring your vision to life.",
      "button": "GET A QUOTE"
    },
    "faqSchema": {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is vehicle wrapping?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Vehicle wrapping is the process of applying a vinyl film over your car\'s original paint. It allows complete color transformation, custom designs, and paint protection while being fully reversible.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does a car wrap last in Dubai?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Quality vinyl wraps typically last 3-5 years in Dubai\'s climate with proper care. Premium films with UV protection can last up to 7 years. Regular maintenance and garage storage extend wrap life.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can wraps be removed without damaging paint?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, professional-grade wraps can be safely removed without damaging your factory paint. In fact, wraps protect the original paint underneath, preserving your vehicle\'s resale value.',
          },
        },
      ],
    }
  },
  "en/reinforce": {
    "title": "R is for Reinforce | Paint Protection Dubai | WRP",
    "description": "Discover WRP's paint protection philosophy - ceramic coating and PPF solutions that reinforce your vehicle's defense against Dubai's harsh environment",
    "crumb": "Reinforce",
    "hero": {
      "eyebrow": "THE SECOND PILLAR",
      "h1": "R is for Reinforce",
      "lede": "Advanced protection systems that strengthen your vehicle's defense against Dubai's extreme climate."
    },
    "intro": {
      "h2": "Protection Layered to Perfection",
      "paras": [
        "Reinforce represents our commitment to long-term paint protection. In Dubai's harsh environment—with extreme heat, sandstorms, and intense UV radiation—your vehicle needs more than basic care.",
        "Our reinforcement solutions combine military-grade Paint Protection Film with nano-ceramic coating technology, creating multiple layers of defense that work together to preserve your vehicle's finish for years to come."
      ],
      "cards": [
        {
          "icon": "shield-check",
          "title": "PPF Protection",
          "desc": "Military-grade film guards against impacts"
        },
        {
          "icon": "droplets",
          "title": "Ceramic Shield",
          "desc": "Nano-coating for chemical resistance"
        },
        {
          "icon": "layers",
          "title": "Combined Defense",
          "desc": "Synergistic protection system"
        },
        {
          "icon": "clock",
          "title": "Long-Term Value",
          "desc": "7-10 years of protection"
        }
      ]
    },
    "services": {
      "h2": "Reinforcement Solutions",
      "sub": "Premium protection systems engineered for Dubai's extreme conditions",
      "cards": [
        {
          "title": "Paint Protection Film (PPF)",
          "desc": "Transparent thermoplastic urethane film that absorbs impacts from rocks, debris, and scratches. Self-healing technology repairs minor damage with heat. The ultimate physical barrier for your paint.",
          "featured": false,
          "href": "/services/paint-protection-film/",
          "label": "EXPLORE PPF"
        },
        {
          "title": "Ceramic Coating",
          "desc": "Liquid polymer that chemically bonds with paint, creating a durable nano-ceramic layer. Provides hydrophobic properties, chemical resistance, and scratch resistance. Essential for Dubai's environment.",
          "featured": false,
          "href": "/services/ceramic-coating/",
          "label": "EXPLORE CERAMIC"
        },
        {
          "title": "Window Tinting & Window Film",
          "desc": "Advanced ceramic window tinting film with up to 98% IR rejection and 99%+ UV block. Multiple shades available, anti-yellowing, and glare reduction. Transforms your driving comfort in Dubai's heat.",
          "featured": false,
          "href": "/services/window-film/",
          "label": "EXPLORE WINDOW TINTING"
        }
      ]
    },
    "pillars": {
      "h2": "The Three Pillars of WRP",
      "sub": "Discover our complete philosophy of automotive excellence",
      "cards": [
        {
          "title": "Wrap",
          "desc": "Transform your vehicle's appearance with premium vinyl wrapping. Complete color changes, custom designs, and chrome delete services that express your personality while protecting factory paint.",
          "featured": false,
          "href": "/wrap/",
          "label": "EXPLORE WRAP",
          "letter": "W"
        },
        {
          "title": "Protect",
          "desc": "Meticulous care and maintenance programs that preserve your vehicle's perfection. Premium wash, paint correction, and detailing services that maintain showroom condition.",
          "featured": false,
          "href": "/protect/",
          "label": "EXPLORE PROTECT",
          "letter": "P"
        }
      ]
    },
    "faq": {
      "h2": "Frequently Asked Questions",
      "sub": null,
      "items": [
        {
          "q": "What does \"Reinforce\" mean at WRP?",
          "a": "Reinforce represents our protection philosophy — strengthening your vehicle's defense against environmental damage through PPF, ceramic coating, and window film technologies."
        },
        {
          "q": "Should I get PPF or ceramic coating?",
          "a": "They serve different purposes. PPF protects against physical damage (rock chips, scratches), while ceramic coating provides chemical resistance and easier maintenance. For ultimate protection in Dubai, we recommend both."
        },
        {
          "q": "Can PPF and ceramic coating be combined?",
          "a": "Yes, and we recommend it. Applying ceramic coating over PPF is our most popular protection package. It combines physical impact protection with chemical resistance and enhanced gloss."
        },
        {
          "q": "Why add window film in Dubai?",
          "a": "Ceramic window film rejects up to 98% of infrared heat and 99%+ of UV rays. In Dubai's extreme temperatures, this significantly reduces cabin heat, protects interiors from fading, and reduces AC load — improving both comfort and fuel efficiency."
        }
      ]
    },
    "cta": {
      "h2": "Reinforce Your Investment",
      "text": "Protect your vehicle with our advanced protection systems. Our team will help you choose the right protection.",
      "button": "GET A QUOTE"
    },
    "faqSchema": {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does "Reinforce" mean at WRP?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Reinforce represents our protection philosophy - strengthening your vehicle\'s defense against environmental damage through PPF, ceramic coating, and window film technologies.',
          },
        },
        {
          '@type': 'Question',
          name: 'Should I get PPF or ceramic coating?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'They serve different purposes. PPF protects against physical damage (rock chips, scratches), while ceramic coating provides chemical resistance and easier maintenance. For ultimate protection in Dubai, we recommend both.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can PPF and ceramic coating be combined?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, and we recommend it. Applying ceramic coating over PPF is our most popular protection package. It combines physical impact protection with chemical resistance and enhanced gloss.',
          },
        },
        {
          '@type': 'Question',
          name: 'Why add window film in Dubai?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Ceramic window film rejects up to 98% of infrared heat and 99%+ of UV rays. In Dubai\'s extreme temperatures, this significantly reduces cabin heat, protects interiors from fading, and reduces AC load—improving both comfort and fuel efficiency.',
          },
        },
      ],
    }
  },
  "en/protect": {
    "title": "P is for Protect | Car Detailing & Maintenance Dubai | WRP",
    "description": "Discover WRP's protection services - premium car wash, car polish and paint correction, leather upholstery care, and maintenance programs that preserve your vehicle's perfection",
    "crumb": "Protect",
    "hero": {
      "eyebrow": "THE THIRD PILLAR",
      "h1": "P is for Protect",
      "lede": "Meticulous care and maintenance that preserves showroom perfection, inside and out."
    },
    "intro": {
      "h2": "Ongoing Excellence",
      "paras": [
        "Protection at WRP goes beyond one-time treatments. It's a philosophy of continuous care and maintenance that keeps your vehicle looking and performing its best. From regular professional washing to car polish, paint correction, and upholstery care, we ensure lasting perfection.",
        "Dubai's environment is particularly harsh on vehicles. Dust, sand, extreme heat, and UV exposure require vigilant maintenance. Our protection services prevent damage before it occurs and address issues as soon as they appear, maintaining your investment's value and appearance."
      ],
      "cards": [
        {
          "icon": "droplets",
          "title": "Hand Wash",
          "desc": "pH-neutral products, no harsh brushes"
        },
        {
          "icon": "sparkles",
          "title": "Paint Correction",
          "desc": "Restore clarity and remove defects"
        },
        {
          "icon": "shield",
          "title": "Interior Care",
          "desc": "Leather conditioning and deep cleaning"
        },
        {
          "icon": "calendar",
          "title": "Maintenance Plans",
          "desc": "Regular care programs available"
        }
      ]
    },
    "services": {
      "h2": "Protection Services",
      "sub": "Comprehensive care programs for lasting perfection",
      "cards": [
        {
          "title": "Premium Car Wash",
          "desc": "Meticulous hand washing using luxury-grade products and proper techniques. Two-bucket method, microfiber materials, spot-free filtered water, and premium wax polish for showroom-shiny finish.",
          "featured": false,
          "href": "/services/premium-car-wash/",
          "label": "LEARN MORE"
        },
        {
          "title": "Car Polish & Paint Correction",
          "desc": "Multi-stage car polish and paint correction that removes swirl marks, scratches, and oxidation. Restores your paint's original depth and clarity. Essential before applying any protective coatings.",
          "featured": true,
          "href": "/services/polish/",
          "label": "EXPLORE SERVICE"
        },
        {
          "title": "Leather & Upholstery Care",
          "desc": "Professional leather and upholstery cleaning, conditioning, and protection for luxury cabins. Deep stain treatment, odor neutralization, and material-safe restoration for daily comfort and long-term value.",
          "featured": false,
          "href": "/services/leather-upholstery/",
          "label": "EXPLORE SERVICE"
        }
      ]
    },
    "pillars": {
      "h2": "The Three Pillars of WRP",
      "sub": "Discover our complete philosophy of automotive excellence",
      "cards": [
        {
          "title": "Wrap",
          "desc": "Transform your vehicle's appearance with premium vinyl wrapping. Complete color changes, custom designs, and chrome delete services that express your personality while protecting factory paint.",
          "featured": false,
          "href": "/wrap/",
          "label": "EXPLORE WRAP",
          "letter": "W"
        },
        {
          "title": "Reinforce",
          "desc": "Advanced protection systems that strengthen your vehicle's defense. Paint Protection Film and ceramic coating technologies engineered for Dubai's extreme climate.",
          "featured": false,
          "href": "/reinforce/",
          "label": "EXPLORE REINFORCE",
          "letter": "R"
        }
      ]
    },
    "faq": {
      "h2": "Frequently Asked Questions",
      "sub": null,
      "items": [
        {
          "q": "What does \"Protect\" mean at WRP?",
          "a": "Protect represents our comprehensive maintenance and care philosophy - regular professional detailing, paint correction, and preservation services that maintain your vehicle's showroom condition."
        },
        {
          "q": "How often should I detail my car in Dubai?",
          "a": "For daily-driven vehicles in Dubai, we recommend professional detailing every 1-2 months. Dubai's dust, sand, and heat require more frequent care than other climates. Regular maintenance prevents long-term damage."
        },
        {
          "q": "What's included in premium car wash?",
          "a": "Our premium car wash includes hand wash with pH-neutral products, wheel and tire detailing, clay bar treatment, interior vacuum and wipe-down, premium wax polish application, and protective detail spray for showroom-shiny finish. We never use automatic car washes that can damage paint."
        }
      ]
    },
    "cta": {
      "h2": "Maintain Your Perfection",
      "text": "Regular professional care keeps your vehicle looking its absolute best. Speak with our team about a protection plan.",
      "button": "GET A QUOTE"
    },
    "faqSchema": {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What does "Protect" mean at WRP?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Protect represents our comprehensive maintenance and care philosophy - regular professional detailing, paint correction, and preservation services that maintain your vehicle\'s showroom condition.',
          },
        },
        {
          '@type': 'Question',
          name: 'How often should I detail my car in Dubai?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'For daily-driven vehicles in Dubai, we recommend professional detailing every 1-2 months. Dubai\'s dust, sand, and heat require more frequent care than other climates. Regular maintenance prevents long-term damage.',
          },
        },
        {
          '@type': 'Question',
          name: 'What\'s included in premium car wash?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Our premium car wash includes hand wash with pH-neutral products, wheel and tire detailing, clay bar treatment, interior vacuum and wipe-down, and protective detail spray. We never use automatic car washes that can damage paint.',
          },
        },
      ],
    }
  },
  "ar/wrap": {
    "title": "W تعني غلّف | تغليف سيارات فاخر في دبي | WRP",
    "description": "اكتشف خدمات تغليف السيارات لدى WRP في دبي. تغيير لون كامل، تصاميم مخصصة، وحماية إضافية للطلاء بخامات فينيل عالية الجودة.",
    "crumb": "غلّف",
    "hero": {
      "eyebrow": "الركيزة الأولى",
      "h1": "W تعني غلّف",
      "lede": "غيّر شخصية سيارتك بتغليف فينيل فاخر. من الأناقة الهادئة إلى المظهر الجريء، ننفّذ رؤيتك بدقة تليق بالسيارات المميزة."
    },
    "intro": {
      "h2": "تحوّل بصري كامل",
      "paras": [
        "تغليف السيارة هو فن استخدام طبقات فينيل احترافية لتغيير اللون أو إضافة تفاصيل مخصصة فوق الطلاء الأصلي. يمنحك حرية كبيرة في التصميم مع الحفاظ على طبقة الطلاء الأساسية تحتها.",
        "في WRP نعتمد على خامات ممتازة وتقنيات تركيب دقيقة للحصول على نتيجة نظيفة ومتجانسة. يتم قص كل جزء بدقة، وتجهيز السطح بعناية، وتنفيذ التركيب داخل بيئة مناسبة للوصول إلى نتيجة نهائية تليق بمستوى السيارة."
      ],
      "cards": [
        {
          "icon": "palette",
          "title": "ألوان بلا حدود",
          "desc": "خيارات واسعة من الألوان واللمسات النهائية بين اللامع والمطفي والساتان والمعدني"
        },
        {
          "icon": "shield",
          "title": "حماية إضافية للطلاء",
          "desc": "يساعد على تقليل أثر الخدوش الخفيفة والعوامل اليومية على الطلاء الأصلي"
        },
        {
          "icon": "rotate-ccw",
          "title": "قابل للإزالة",
          "desc": "يمكن العودة إلى الطلاء الأصلي لاحقاً عند الحاجة مع إزالة احترافية صحيحة"
        },
        {
          "icon": "trending-up",
          "title": "الحفاظ على القيمة",
          "desc": "يحافظ على مظهر السيارة ويضيف طبقة حماية تساعد في صون قيمة إعادة البيع"
        }
      ]
    },
    "services": {
      "h2": "خدمات التغليف",
      "sub": "حلول تغليف متكاملة تناسب من يريد تغييراً كاملاً أو لمسات محددة ومدروسة.",
      "cards": [
        {
          "title": "تغيير اللون بالكامل",
          "desc": "تحويل كامل لشكل السيارة باستخدام فينيل فاخر. اختر بين اللامع أو المطفي أو الساتان أو التشطيبات الخاصة لتحصل على مظهر مختلف بالكامل مع الحفاظ على الطلاء الأصلي تحت التغليف.",
          "featured": false
        },
        {
          "title": "تصميم مخصص",
          "desc": "خطوط، رسومات، تفاصيل سباق، أو هوية بصرية خاصة بك. نعمل معك على تصميم مظهر فريد يعكس ذوقك ويجعل السيارة أكثر تميزاً على الطريق.",
          "featured": true
        },
        {
          "title": "إزالة الكروم والتفاصيل",
          "desc": "تعديل أنيق للتفاصيل الخارجية مثل الكروم وإطارات النوافذ والشعارات باستخدام فينيل أسود أو تشطيبات أخرى تمنح السيارة مظهراً أكثر حداثة وحضوراً.",
          "featured": false
        }
      ]
    },
    "pillars": {
      "h2": "ركائز WRP الثلاث",
      "sub": "اكتشف كيف تتكامل فلسفة WRP بين التغليف والحماية والعناية المستمرة للوصول إلى نتيجة متكاملة.",
      "cards": [
        {
          "title": "عزّز",
          "desc": "أنظمة حماية متقدمة مثل فيلم حماية الطلاء وطلاء السيراميك صُممت لتقوية دفاع السيارة أمام مناخ دبي القاسي والعوامل اليومية.",
          "featured": false,
          "href": "/reinforce/",
          "label": "استكشف عزّز",
          "letter": "R"
        },
        {
          "title": "احمِ",
          "desc": "برامج عناية وصيانة دقيقة تحافظ على مستوى السيارة بصرياً وعملياً من الداخل والخارج، وتمنع تراجع المظهر مع الوقت.",
          "featured": false,
          "href": "/protect/",
          "label": "استكشف احمِ",
          "letter": "P"
        }
      ]
    },
    "faq": {
      "h2": "الأسئلة الشائعة",
      "sub": "أكثر الأسئلة التي تصلنا حول تغليف السيارات في دبي",
      "items": [
        {
          "q": "ما هو تغليف السيارة؟",
          "a": "هو تطبيق طبقة فينيل فوق الطلاء الأصلي بهدف تغيير اللون أو إضافة تصميم مخصص مع توفير حماية إضافية للسطح."
        },
        {
          "q": "كم يدوم التغليف في دبي؟",
          "a": "يعتمد ذلك على نوع الخامة وطريقة الاستخدام والعناية، لكن التغليف الاحترافي بخامات جيدة يدوم عادة عدة سنوات مع العناية المناسبة."
        },
        {
          "q": "هل يمكن إزالة التغليف دون إتلاف الطلاء؟",
          "a": "نعم، عند استخدام خامات أصلية وتنفيذ إزالة صحيحة. وفي كثير من الحالات يساعد التغليف في حماية الطلاء الأصلي خلال فترة الاستخدام."
        }
      ]
    },
    "cta": {
      "h2": "جاهز لتغيير شخصية سيارتك؟",
      "text": "اكتشف ما يمكن أن يقدمه التغليف الاحترافي لسيارتك، ودع فريقنا يساعدك في اختيار اللون أو التصميم والخامة المناسبة.",
      "button": "@t:home.hero.getQuote"
    },
    "faqSchema": {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'ما هو تغليف السيارة؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'تغليف السيارة هو تطبيق طبقة فينيل عالية الجودة فوق الطلاء الأصلي للسيارة. يتيح تغيير اللون بالكامل أو إضافة تفاصيل مخصصة مع حماية الطلاء الأصلي، ويمكن إزالته لاحقاً بشكل آمن عند التنفيذ الصحيح.',
          },
        },
        {
          '@type': 'Question',
          name: 'كم يدوم تغليف السيارة في دبي؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'التغليف عالي الجودة يدوم عادة من 3 إلى 5 سنوات في مناخ دبي مع العناية المناسبة، وقد تصل بعض الخامات الممتازة إلى مدة أطول. طريقة الاستخدام، والغسيل، والتخزين، وجودة التطبيق تؤثر مباشرة على عمر التغليف.',
          },
        },
        {
          '@type': 'Question',
          name: 'هل يمكن إزالة التغليف دون إتلاف الطلاء؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'نعم. عند استخدام خامات احترافية وتطبيقها وإزالتها بالطريقة الصحيحة، يمكن إزالة التغليف دون الإضرار بطلاء المصنع. بل إن التغليف يساعد أيضاً في حماية الطلاء الأصلي والحفاظ على قيمة السيارة.',
          },
        },
      ],
    }
  },
  "ar/reinforce": {
    "title": "R تعني عزّز | حماية طلاء متقدمة في دبي | WRP",
    "description": "اكتشف فلسفة WRP في تعزيز حماية السيارة عبر فيلم حماية الطلاء وطلاء السيراميك وتظليل النوافذ وأفلام الزجاج، لحماية تدوم في ظروف دبي القاسية.",
    "crumb": "عزّز",
    "hero": {
      "eyebrow": "الركيزة الثانية",
      "h1": "R تعني عزّز",
      "lede": "أنظمة حماية متقدمة تقوّي دفاع السيارة أمام حرارة دبي العالية والرمال والعوامل اليومية التي تؤثر على الطلاء والزجاج والمقصورة."
    },
    "intro": {
      "h2": "طبقات حماية تعمل معاً",
      "paras": [
        "في دبي، السيارة لا تواجه مجرد استخدام يومي، بل تواجه حرارة شديدة، ورمالاً دقيقة، وأشعة شمس قاسية، ومخاطر الطريق. لذلك لا يكفي حل واحد في كثير من الحالات. تعني ركيزة عزّز بناء منظومة حماية متكاملة حسب طبيعة السيارة وطريقة استخدامها.",
        "نعتمد في هذه الركيزة على حلول مثل فيلم حماية الطلاء وطلاء السيراميك وأفلام الزجاج السيراميكية، بحيث تؤدي كل طبقة دورها في تقليل التآكل البصري والحفاظ على اللمعان والقيمة وسهولة الصيانة."
      ],
      "cards": [
        {
          "icon": "shield-check",
          "title": "حماية PPF",
          "desc": "طبقة مخصصة للتعامل مع الحصى والخدوش والأثر اليومي على الطلاء"
        },
        {
          "icon": "droplets",
          "title": "درع سيراميكي",
          "desc": "مقاومة أفضل للعوامل الكيميائية وسهولة أعلى في التنظيف ولمعان يدوم"
        },
        {
          "icon": "layers",
          "title": "حماية متعددة الطبقات",
          "desc": "حلول تكمل بعضها للحصول على دفاع أذكى وأكثر استقراراً"
        },
        {
          "icon": "clock",
          "title": "قيمة أطول مدى",
          "desc": "تقليل التآكل البصري والحفاظ على المظهر العام بمرور الوقت"
        }
      ]
    },
    "services": {
      "h2": "حلول التعزيز والحماية",
      "sub": "أنظمة حماية فاخرة تم اختيارها لتناسب بيئة دبي الصعبة وتحافظ على السيارة بصرياً ووظيفياً.",
      "cards": [
        {
          "title": "فيلم حماية الطلاء (PPF)",
          "desc": "طبقة شفافة عالية الأداء تمتص كثيراً من أثر الحصى والخدوش والعوامل اليومية. خيار أساسي لمن يريد حماية فعلية للطلاء مع مظهر شبه غير مرئي.",
          "featured": false,
          "href": "/services/paint-protection-film/",
          "label": "استكشف PPF"
        },
        {
          "title": "طلاء السيراميك",
          "desc": "طبقة نانوية ترتبط بالسطح لتوفر طرداً للماء، ومقاومة للعوامل الكيميائية، ولمعاناً ثابتاً، وصيانة أسهل للسيارة في الاستخدام اليومي.",
          "featured": false,
          "href": "/services/ceramic-coating/",
          "label": "استكشف السيراميك"
        },
        {
          "title": "تظليل النوافذ وأفلام الزجاج",
          "desc": "أفلام زجاج متقدمة تقلل انتقال الحرارة والوهج وتحمي المقصورة من الأشعة، مع خيارات درجات متعددة ترفع الراحة والخصوصية داخل السيارة.",
          "featured": false,
          "href": "/services/window-film/",
          "label": "استكشف أفلام الزجاج"
        }
      ]
    },
    "pillars": {
      "h2": "ركائز WRP الثلاث",
      "sub": "ابدأ بالمظهر، عزّز الحماية، ثم حافظ على النتيجة بعناية مستمرة ضمن فلسفة متكاملة واحدة.",
      "cards": [
        {
          "title": "غلّف",
          "desc": "غيّر شكل السيارة بهوية بصرية جديدة باستخدام تغليف فاخر يحافظ في الوقت نفسه على طبقة الطلاء الأصلية تحتها.",
          "featured": false,
          "href": "/wrap/",
          "label": "استكشف غلّف",
          "letter": "W"
        },
        {
          "title": "احمِ",
          "desc": "برامج عناية وصيانة تحافظ على النتيجة بعد الحماية، وتمنع فقدان اللمعان أو تراكم العيوب بمرور الوقت.",
          "featured": false,
          "href": "/protect/",
          "label": "استكشف احمِ",
          "letter": "P"
        }
      ]
    },
    "faq": {
      "h2": "الأسئلة الشائعة",
      "sub": null,
      "items": [
        {
          "q": "ماذا تعني ركيزة عزّز في WRP؟",
          "a": "تعني بناء نظام حماية متكامل للسيارة باستخدام حلول متقدمة تقلل أثر العوامل اليومية والبيئية على المظهر والسطح."
        },
        {
          "q": "هل أختار PPF أم طلاء السيراميك؟",
          "a": "يعتمد ذلك على أولويتك. إن كنت تبحث عن حماية مادية من أثر الطريق فـ PPF مهم، وإن أردت سهولة تنظيف ولمعاناً ومقاومة كيميائية فالسيراميك أساسي، وغالباً يكون الجمع بينهما أفضل حل."
        },
        {
          "q": "هل يمكن الجمع بين PPF وطلاء السيراميك؟",
          "a": "نعم، وهذا من أكثر الخيارات فعالية لمن يريد مستوى حماية أعلى ومظهراً أسهل في الصيانة على المدى الطويل."
        },
        {
          "q": "لماذا يهم تظليل النوافذ في دبي؟",
          "a": "لأنه يرفع الراحة داخل المقصورة، ويقلل انتقال الحرارة، ويساعد في حماية المواد الداخلية من تأثير الشمس المباشر."
        }
      ]
    },
    "cta": {
      "h2": "عزّز حماية استثمارك",
      "text": "احمِ سيارتك بحلول متقدمة مصممة لظروف دبي، وسنساعدك في اختيار النظام الأنسب حسب الاستخدام اليومي ومستوى الحماية المطلوب.",
      "button": "@t:home.hero.getQuote"
    },
    "faqSchema": {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'ماذا تعني ركيزة عزّز في WRP؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'تعني ركيزة عزّز في فلسفة WRP تقوية دفاعات السيارة بطبقات حماية متقدمة مثل فيلم حماية الطلاء وطلاء السيراميك وأفلام الزجاج، بحيث تعمل هذه الحلول معاً لمواجهة ظروف دبي القاسية.',
          },
        },
        {
          '@type': 'Question',
          name: 'هل أختار PPF أم طلاء السيراميك؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'لكل حل وظيفة مختلفة. PPF يحمي من الأثر المادي مثل الحصى والخدوش، بينما يمنح طلاء السيراميك مقاومة كيميائية ولمعاناً وصيانة أسهل. وفي كثير من الحالات يكون الجمع بينهما هو الخيار الأقوى.',
          },
        },
        {
          '@type': 'Question',
          name: 'هل يمكن الجمع بين PPF وطلاء السيراميك؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'نعم، وهذا من أكثر الحلول طلباً. عند تطبيق السيراميك فوق PPF تحصل على حماية من الصدمات السطحية مع مقاومة أفضل للعوامل الخارجية ولمعان أسهل في الصيانة.',
          },
        },
        {
          '@type': 'Question',
          name: 'لماذا يهم تظليل النوافذ في دبي؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'أفلام الزجاج السيراميكية تقلل انتقال الحرارة وتحد من الأشعة فوق البنفسجية بشكل كبير، ما يرفع راحة القيادة ويحمي المقصورة ويخفف الحمل على التكييف في حرارة دبي المرتفعة.',
          },
        },
      ],
    }
  },
  "ar/protect": {
    "title": "P تعني احمِ | عناية وصيانة سيارات فاخرة في دبي | WRP",
    "description": "اكتشف فلسفة WRP في العناية المستمرة بالسيارات: غسيل سيارات فاخر، تلميع وتصحيح طلاء، عناية داخلية، وبرامج صيانة تحافظ على قيمة سيارتك ومظهرها.",
    "crumb": "احمِ",
    "hero": {
      "eyebrow": "الركيزة الثالثة",
      "h1": "P تعني احمِ",
      "lede": "عناية وصيانة دقيقة تحافظ على مستوى صالة العرض، من الخارج والداخل، وتمنع تراجع المظهر مع مرور الوقت."
    },
    "intro": {
      "h2": "تميّز مستمر لا يتوقف",
      "paras": [
        "في WRP، الحماية لا تعني فقط تركيب طبقة أو تنفيذ خدمة مرة واحدة. تعني ركيزة احمِ وضع روتين عناية يحافظ على السيارة في أفضل حالة ممكنة، بصرياً وعملياً، ويمنع تراكم العيوب الصغيرة حتى لا تتحول إلى مشاكل أكبر.",
        "بيئة دبي قاسية على السيارات. الغبار والرمال والحرارة والأشعة فوق البنفسجية تؤثر يومياً على المظهر الخارجي والمقصورة. خدماتنا في هذه الركيزة صممت لتبقي السيارة نظيفة، متألقة، ومحافظة على قيمتها على المدى الطويل."
      ],
      "cards": [
        {
          "icon": "droplets",
          "title": "غسيل يدوي آمن",
          "desc": "منتجات مناسبة للطلاء وتقنيات تمنع الخدوش والعلامات غير المرغوبة"
        },
        {
          "icon": "sparkles",
          "title": "تصحيح الطلاء",
          "desc": "استعادة اللمعان وإزالة كثير من العيوب البصرية الناتجة عن الاستخدام"
        },
        {
          "icon": "shield",
          "title": "عناية داخلية",
          "desc": "تنظيف وترطيب وحماية للجلد والتنجيد والمواد الداخلية"
        },
        {
          "icon": "calendar",
          "title": "خطط صيانة",
          "desc": "برامج دورية للعناية المنتظمة حسب طبيعة استخدام السيارة"
        }
      ]
    },
    "services": {
      "h2": "خدمات العناية المستمرة",
      "sub": "خدمات مصممة للحفاظ على مستوى السيارة بصرياً وعملياً بين الحماية الأساسية والاستخدام اليومي.",
      "cards": [
        {
          "title": "غسيل سيارات فاخر",
          "desc": "غسيل يدوي دقيق باستخدام منتجات ممتازة وتقنيات صحيحة للحفاظ على الطلاء والجنوط والتفاصيل الخارجية دون تعريضها لخدوش أو تآكل مبكر.",
          "featured": false,
          "href": "/services/premium-car-wash/",
          "label": "اعرف المزيد"
        },
        {
          "title": "تلميع وتصحيح الطلاء",
          "desc": "معالجة متعددة المراحل لإزالة علامات الدوامات والخدوش الخفيفة والأكسدة، واستعادة عمق الطلاء ولمعانه قبل أي خطوة حماية لاحقة أو كخدمة مستقلة.",
          "featured": true,
          "href": "/services/polish/",
          "label": "استكشف الخدمة"
        },
        {
          "title": "العناية بالجلد والتنجيد",
          "desc": "تنظيف احترافي وترطيب وحماية للمقصورات الفاخرة، مع معالجة البقع والروائح والعناية بالمواد الداخلية بما يحافظ على الراحة والمظهر والقيمة.",
          "featured": false,
          "href": "/services/leather-upholstery/",
          "label": "استكشف الخدمة"
        }
      ]
    },
    "pillars": {
      "h2": "ركائز WRP الثلاث",
      "sub": "تعرف على كيف تبدأ التجربة من المظهر، ثم الحماية، ثم الحفاظ على النتيجة على المدى الطويل.",
      "cards": [
        {
          "title": "غلّف",
          "desc": "غيّر حضور السيارة بصرياً بتغليف فاخر، ألوان مخصصة، وتفاصيل تمنحها شخصية مختلفة مع الحفاظ على الطلاء الأصلي.",
          "featured": false,
          "href": "/wrap/",
          "label": "استكشف غلّف",
          "letter": "W"
        },
        {
          "title": "عزّز",
          "desc": "طبقات حماية متقدمة مثل PPF وطلاء السيراميك وأفلام الزجاج لحماية السيارة من البيئة القاسية والاستخدام اليومي.",
          "featured": false,
          "href": "/reinforce/",
          "label": "استكشف عزّز",
          "letter": "R"
        }
      ]
    },
    "faq": {
      "h2": "الأسئلة الشائعة",
      "sub": null,
      "items": [
        {
          "q": "ماذا تعني ركيزة احمِ في WRP؟",
          "a": "تعني أن السيارة تحتاج إلى عناية مستمرة ومنهجية، لا مجرد خدمة متفرقة، حتى يبقى شكلها ومستواها العام في أفضل حالة ممكنة."
        },
        {
          "q": "كم مرة يجب أن أخضع سيارتي للتفصيل في دبي؟",
          "a": "يعتمد ذلك على الاستخدام اليومي والتخزين ونوع القيادة، لكن الصيانة المنتظمة في دبي ضرورية بسبب الغبار والحرارة والرمال."
        },
        {
          "q": "ماذا تشمل خدمة غسيل السيارات الفاخر؟",
          "a": "تشمل غسيلاً يدوياً آمناً، وتجفيفاً مناسباً، وتنظيفاً للتفاصيل الأساسية، ولمسات نهائية تحافظ على نظافة السيارة ومظهرها دون الإضرار بالطلاء."
        }
      ]
    },
    "cta": {
      "h2": "حافظ على تألق سيارتك",
      "text": "العناية المنتظمة هي ما يصنع الفرق الحقيقي مع الوقت. تحدث مع فريقنا لوضع خطة مناسبة لطبيعة سيارتك واستخدامك اليومي.",
      "button": "@t:home.hero.getQuote"
    },
    "faqSchema": {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'ماذا تعني ركيزة احمِ في WRP؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'تعني ركيزة احمِ في فلسفتنا العناية المستمرة بالسيارة، من الغسيل الاحترافي إلى تصحيح الطلاء والعناية الداخلية وبرامج الصيانة الدورية التي تحافظ على مستوى السيارة طوال الوقت.',
          },
        },
        {
          '@type': 'Question',
          name: 'كم مرة يجب أن أخضع سيارتي للتفصيل في دبي؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'بالنسبة للسيارات المستخدمة يومياً في دبي، نوصي بالعناية الاحترافية المنتظمة بحسب أسلوب الاستخدام والبيئة المحيطة. الغبار والحرارة والرمال تجعل الصيانة الدورية أكثر أهمية من كثير من المدن الأخرى.',
          },
        },
        {
          '@type': 'Question',
          name: 'ماذا تشمل خدمة غسيل السيارات الفاخر؟',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'تشمل عادة الغسيل اليدوي بمنتجات متعادلة الحموضة، وتنظيف الجنوط والإطارات، وتجفيفاً آمناً، وتنظيفاً أساسياً للمقصورة، مع لمسات نهائية تحافظ على المظهر وتمنح السيارة نظافة واضحة دون الإضرار بالطلاء.',
          },
        },
      ],
    }
  },
};
