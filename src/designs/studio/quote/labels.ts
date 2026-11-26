import type { Locale } from '@/i18n/translations';

// Labels shared by the form, car viewer, estimate and outgoing enquiry.
const arabic: Record<string, string> = {
  'Sedan or hatch': 'سيدان أو هاتشباك',
  'Coupe or sports car': 'كوبيه أو سيارة رياضية',
  'SUV or 4x4': 'سيارة رياضية متعددة الاستخدامات أو دفع رباعي',
  'Pickup or large SUV': 'بيك أب أو سيارة دفع رباعي كبيرة',
  'Camry, Altima, Model 3, BMW 5 Series': 'كامري، ألتيما، موديل ٣، بي إم دبليو الفئة الخامسة',
  'Porsche 911, Supra, Corvette, Mustang': 'بورشه ٩١١، سوبرا، كورفيت، موستانغ',
  'Land Cruiser, Range Rover, Patrol, Model Y': 'لاند كروزر، رينج روفر، باترول، موديل Y',
  'Hilux, F-150, Escalade, G-Class': 'هايلكس، فورد F-150، إسكاليد، مرسيدس الفئة G',
  White: 'أبيض', Black: 'أسود', Silver: 'فضي', Grey: 'رمادي',
  Blue: 'أزرق', Red: 'أحمر', Green: 'أخضر', Other: 'لون آخر',
  Front: 'المقدمة', Sides: 'الجوانب', 'Roof & pillars': 'السقف والقوائم', Rear: 'الخلف',
  'Front bumper': 'الصدام الأمامي', Bonnet: 'غطاء المحرك', Headlights: 'المصابيح الأمامية',
  'Left front fender': 'الرفرف الأمامي الأيسر', 'Right front fender': 'الرفرف الأمامي الأيمن',
  'Left mirror': 'المرآة اليسرى', 'Right mirror': 'المرآة اليمنى',
  'Left A-pillar': 'القائم الأمامي الأيسر', 'Right A-pillar': 'القائم الأمامي الأيمن', Roof: 'السقف',
  'Front left door': 'الباب الأمامي الأيسر', 'Front right door': 'الباب الأمامي الأيمن',
  'Rear left door': 'الباب الخلفي الأيسر', 'Rear right door': 'الباب الخلفي الأيمن',
  'Left rocker panel': 'العتبة الجانبية اليسرى', 'Right rocker panel': 'العتبة الجانبية اليمنى',
  'Left rear quarter': 'الرفرف الخلفي الأيسر', 'Right rear quarter': 'الرفرف الخلفي الأيمن',
  'Rear bumper': 'الصدام الخلفي', 'Boot / tailgate': 'غطاء الصندوق أو الباب الخلفي', Spoiler: 'الجناح الخلفي',
  'Front End Protection': 'حماية الواجهة الأمامية', 'Track Package': 'باقة الحلبة', 'Full Body Protection': 'حماية الهيكل بالكامل',
  'The parts that take the stone chips.': 'تغطية الأجزاء الأمامية الأكثر عرضة لضربات الحصى.',
  'Front End plus rockers, rear bumper and fenders, A-pillars, door edges and handles.': 'حماية المقدمة، إضافة إلى العتبات والصدام والرفارف الخلفية والقوائم الأمامية وحواف الأبواب ومقابضها.',
  'Every painted panel, roof and boot included, door jambs too.': 'جميع أجزاء الهيكل المطلية، بما فيها السقف وغطاء الصندوق وإطارات الأبواب الداخلية.',
  'Custom seat covers': 'أغطية مقاعد حسب الطلب', 'Tailored to your model. Leather, synthetic or fabric.': 'تُفصّل لطراز سيارتك من الجلد الطبيعي أو الصناعي أو القماش.',
  'Full seat upholstery': 'تنجيد المقاعد بالكامل', 'Seats re-covered, door panels too if you like.': 'نعيد تنجيد المقاعد، ويمكن إضافة بطانات الأبواب.',
  'Seat repair & stitching': 'إصلاح المقاعد وخياطتها', 'Worn bolsters, tears and split seams.': 'إصلاح الجوانب المهترئة والتمزقات والخياطة المفكوكة.',
  'Steering, dashboard or door panels': 'المقود أو لوحة القيادة أو بطانات الأبواب', 'Re-trimmed to match.': 'نجدّد الكسوة لتتناسق مع المقصورة.',
  'Custom floor mats': 'دعاسات أرضية حسب المقاس', '2D, 5D or 7D, made to measure.': 'دعاسات 2D أو 5D أو 7D مفصّلة على مقاس سيارتك.',
  'Genuine leather': 'جلد طبيعي', 'Synthetic leather': 'جلد صناعي', 'Microfiber leather': 'جلد من الألياف الدقيقة', Fabric: 'قماش', 'Help me choose': 'ساعدوني في الاختيار',
  'Light swirls': 'خدوش دائرية خفيفة', 'Fine circles you see in the sun, paint still glossy.': 'دوائر دقيقة تظهر تحت الشمس والطلاء لا يزال لامعاً.',
  'Heavy swirls & scratches': 'خدوش دائرية وعميقة', 'Visible marks from washes, keys or brushes.': 'آثار واضحة للغسيل أو المفاتيح أو الفُرش.',
  'Faded or oxidised': 'طلاء باهت أو متأكسد', 'Dull, chalky paint that has lost its colour.': 'طلاء مطفأ بمظهر طباشيري فقد لونه الأصلي.',
  'Not sure': 'لست متأكداً', 'We measure the paint depth and tell you.': 'نقيس سماكة الطلاء ونقترح المعالجة المناسبة.',
  'Matte black': 'أسود مطفي', 'Gloss black': 'أسود لامع', 'Satin black': 'أسود ساتان', 'A colour, ask us': 'لون آخر بالتشاور معنا',
  Morning: 'صباحاً', Afternoon: 'بعد الظهر', Evening: 'مساءً', '9 AM – 12 PM': '٩ صباحاً – ١٢ ظهراً', '12 – 5 PM': '١٢ ظهراً – ٥ مساءً', '5 – 9:30 PM': '٥ مساءً – ٩:٣٠ مساءً',
  'Paint protection film': 'فيلم حماية الطلاء', 'Ceramic coating': 'طلاء السيراميك', 'Polish & correction': 'التلميع وتصحيح الطلاء',
  'Detailing & premium wash': 'العناية الشاملة والغسيل الفاخر', 'Window tint': 'تظليل الزجاج', 'Seats, upholstery & mats': 'المقاعد والتنجيد والدعاسات', 'Wrap & styling': 'التغليف وتعديل المظهر',
  '2–4 days': 'من يومين إلى ٤ أيام', '1–2 days': 'يوم إلى يومين', '3–5 hours': 'من ٣ إلى ٥ ساعات',
  '1–3 hours': 'من ساعة إلى ٣ ساعات', '1–3 days': 'من يوم إلى ٣ أيام', 'Confirmed after inspection': 'تُحدَّد المدة بعد المعاينة',
  'Classic Ceramic': 'سيراميك كلاسيك', 'Premium Ceramic': 'سيراميك بريميوم', 'Ultimate Ceramic': 'سيراميك ألتيميت',
  '60% heat rejection': 'عزل حراري بنسبة ٦٠٪', '75% heat rejection': 'عزل حراري بنسبة ٧٥٪', '85% heat rejection': 'عزل حراري بنسبة ٨٥٪',
  '50% VLT, UAE compliant. All side and rear windows.': 'نفاذية الضوء ٥٠٪، متوافق مع أنظمة الإمارات. يشمل النوافذ الجانبية والخلفية.',
  'Multiple shade options. We confirm the shade with you.': 'تتوفر درجات تظليل متعددة ونؤكد معك الدرجة المطلوبة.',
  'Darkest legal shade. Windshield film included.': 'أعلى درجة تظليل مسموح بها. يشمل فيلم الزجاج الأمامي.',
  'Choose the shape closest to your car to continue.': 'اختر نوع الهيكل الأقرب إلى سيارتك.',
  'Choose a coverage, or tap the panels you want covered.': 'اختر مساحة التغطية أو حدّد أجزاء السيارة التي تريد حمايتها.',
  'Pick the closest match, or “Not sure”.': 'اختر الوصف الأقرب لحالة الطلاء أو اختر «لست متأكداً».',
  'Choose a level to continue.': 'اختر مستوى العناية المطلوب.', 'Choose a film to continue.': 'اختر فيلم التظليل المطلوب.',
  'Tick at least one thing you’d like done.': 'اختر عملاً واحداً على الأقل للمقصورة.',
  'Tap the parts to wrap, or turn on chrome delete.': 'اختر الأجزاء المراد تغليفها أو حدّد تغطية الكروم.',
  'Choose a day.': 'اختر اليوم المناسب.', 'Choose a time of day.': 'اختر الفترة المناسبة.',
  'Choose at least one service.': 'اختر خدمة واحدة على الأقل.', 'Tell us your name.': 'أدخل اسمك.',
  'Add a mobile number we can reach.': 'أدخل رقم جوال يمكننا التواصل معك عليه.', 'Check your email address.': 'تحقّق من عنوان بريدك الإلكتروني.',
  'Tick the box so we can reply to you.': 'ضع علامة في المربع حتى نتمكّن من الرد عليك.',
};

export function quoteLabel(text: string, locale: Locale = 'en'): string {
  return locale === 'ar' ? arabic[text] ?? text : text;
}

export function quoteNumber(value: number, locale: Locale, useGrouping = true): string {
  return value.toLocaleString(locale === 'ar' ? 'ar-AE-u-nu-arab' : 'en-US', { useGrouping });
}

export function quoteAmount(value: number, locale: Locale = 'en'): string {
  const amount = quoteNumber(value, locale);
  return locale === 'ar' ? `${amount} د.إ.` : `AED ${amount}`;
}

export const latinDigits = (value: string) => value.replace(/[٠-٩۰-۹]/g, (n) => String(n.charCodeAt(0) - (n <= '٩' ? 0x660 : 0x6f0)));
