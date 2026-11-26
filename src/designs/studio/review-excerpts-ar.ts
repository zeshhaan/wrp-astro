// Match the exact excerpt so an edited or different review never gets an old translation.
const excerpts = new Map<string, string>([
  [
    "They just finished a matte finish STEK PPF job on my Golf GTI, and it has completely transformed the car. The team's expertise and professionalism are unmatched, but what really blew me away was the pricing—extremely fair and well below the current market rates for premium PPF.",
    "ركّبوا لسيارتي جولف GTI فيلم STEK المطفي، وتغيّر شكل السيارة بالكامل. خبرة الفريق واحترافيته ممتازتان، وأكثر ما فاجأني السعر. كان منصفاً جداً وأقل بكثير من أسعار أفلام الحماية الممتازة في السوق.",
  ],
  [
    "Honestly, if you're sick of those cashgrab detailing shops in Dubai that charge a fortune, rush the job, and try to upsell you the second you walk in, just go to WRP. They actually took their time with it, did a flawless job, and didn't cut any corners.",
    "بصراحة، إذا مللت من المحلات في دبي التي تبالغ في السعر وتستعجل في الشغل وتحاول بيعك إضافات من لحظة دخولك، اذهب إلى WRP. أخذوا وقتهم مع سيارتي، وشغلهم متقن حتى آخر تفصيل.",
  ],
  [
    "The team kept me updated throughout the process with pictures and videos, and the workmanship is truly amazing. Car was delivered exactly on the promised time.",
    "طوال فترة العمل كان الفريق يرسل لي صوراً وفيديوهات لأتابع سيارتي. شغلهم رائع فعلاً، وسلّموني السيارة بالضبط في الموعد الذي وعدوني به.",
  ],
  [
    "They used STEK Dynoshield and the final result is stunning—perfect installation and an amazing glossy finish.",
    "استخدموا فيلم STEK Dynoshield. التركيب متقن واللمعة جميلة جداً، والنتيجة رائعة.",
  ],
  [
    "They matched the PPF exactly with the same quality and finish as the existing film on the car, and the result is seamless — it blends in like factory installation with excellent attention to detail.",
    "طابقوا فيلم الحماية مع الفيلم الموجود على السيارة من حيث الجودة والتشطيب. لا يظهر فرق بينهما، وكأن الفيلم مركّب من المصنع. اهتمامهم بالتفاصيل واضح.",
  ],
  [
    "The attention to detail is on another level — the car looked better than when I first got it. It’s definitely on the premium side price-wise, but you can see where the money goes.",
    "اهتمامهم بالتفاصيل شيء آخر. السيارة صارت أجمل من يوم استلمتها. سعرهم مرتفع نسبياً، لكن النتيجة توضّح لك مقابل ماذا دفعت.",
  ],
  [
    "I got a PPF on my car. The service is amazing. Afzal kept me informed on the progress of the process. It’s been a really good experience with these guys.",
    "ركّبت عندهم فيلم حماية لسيارتي، والخدمة ممتازة. أفضل كان يخبرني أين وصل الشغل أولاً بأول. تجربتي معهم كانت طيبة جداً.",
  ],
  [
    "Absolutely thrilled with my window tinting! The team was friendly and professional. The process was smooth, the quality is outstanding, and my car looks so much better.",
    "سعيدة جداً بتظليل سيارتي! الفريق ودود ومحترف، ومن البداية إلى النهاية كان كل شيء سهلاً. الجودة ممتازة وشكل السيارة صار أجمل بكثير.",
  ],
  [
    "I went for the Matte black hood + spoiler combo and i must say that the result is outstanding. Huge thanks to Mr. Afzal and the remaining crew members.",
    "اخترت الأسود المطفي لغطاء المحرك والجناح الخلفي، والنتيجة بصراحة رائعة. شكراً جزيلاً للأستاذ أفضل وبقية الفريق.",
  ],
  [
    "The seat stitching quality is flawless and looks factory-finished. The full car detailing was done to perfection, and the engine compartment cleaning was incredibly thorough and professionally handled.",
    "خياطة المقاعد متقنة وكأنها من المصنع. اعتنوا بالسيارة كاملة، ونظّفوا حجرة المحرك بعناية واحترافية واضحتين.",
  ],
  [
    "Shahul and his team did an amazing job and restored the car bonnet & the paint with some polishing and looked like the issue never existed!",
    "شاهول وفريقه قاموا بعمل رائع. عالجوا غطاء المحرك ولمّعوا الطلاء حتى بدا وكأن الضرر لم يحدث أصلاً!",
  ],
  [
    "The shine after the polish was unreal, and the interior looked cleaner than the day I bought it. They kept me updated, delivered on time, and didn’t try to push any unnecessary extras.",
    "اللمعة بعد التلميع كانت مذهلة، وداخل السيارة أنظف من يوم اشتريتها. أطلعوني على سير الشغل وسلّموني في الموعد ولم يحاولوا إقناعي بأي إضافات لا أحتاجها.",
  ],
  [
    "Gave my car for ppf, tinting, and floor mats. All came out well and top class. Applied perfectly and no flaws.",
    "أخذت سيارتي إليهم لتركيب فيلم حماية وتظليل الزجاج والدعّاسات. كل شيء خرج بمستوى ممتاز. التركيب مضبوط ومن دون عيوب.",
  ],
  [
    "I choose avery dennison ppf for my car The team explained everything clearly and delivered on time. My car looks brand new and so easy to maintain now.",
    "اخترت فيلم حماية Avery Dennison لسيارتي. شرح لي الفريق كل شيء بوضوح وسلّموني في الموعد. تبدو سيارتي الآن كالجديدة وأصبحت العناية بها أسهل بكثير.",
  ],
  [
    "Got my car detailed at WRP, and they did an amazing job honestly. The car was super dirty when i dropped it off and they made it look brand new inside and out.",
    "عملوا عناية شاملة لسيارتي في WRP، وبصراحة شغلهم رائع. سلّمتهم إياها متّسخة جداً ورجعت إليّ كالجديدة من الداخل والخارج.",
  ],
  [
    "Best place for ppf, window tint and detailing in Dubai",
    "أفضل مكان في دبي لفيلم الحماية وتظليل الزجاج والعناية بالسيارة.",
  ],
  [
    "My husband Mahal and I got our rental car for some exterior work on the car bonnet due to paint damage.\n\nWe were warmly greeted and assisted by Sumaya and she looked after us while the hood was being fixed.",
    "أحضرت أنا وزوجي ماهال سيارة الإيجار لإصلاح ضرر في طلاء غطاء المحرك. استقبلتنا سميّة بحفاوة وساعدتنا واهتمّت بنا أثناء الإصلاح.",
  ],
  [
    "it now looks like brand-new showroom condition",
    "تبدو الآن كسيارة جديدة في صالة العرض.",
  ],
  [
    "Very happy with their work. Got complete interior detailing done along with exterior wash for better paint.",
    "سعيد جداً بشغلهم. طلبت عناية كاملة بالمقصورة مع غسيل خارجي لتحسين مظهر الطلاء.",
  ],
  [
    "car looked like a brand new car after the detailing service",
    "بعد العناية الشاملة، بدت السيارة كأنها جديدة.",
  ],
]);

export const translatedExcerpt = (original: string) => excerpts.get(original);
