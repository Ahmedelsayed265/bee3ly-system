import type { Locale } from '@/features/i18n/messages';
import type { HelpArticle } from './types';

/**
 * Help articles live here so a non-engineer can edit the Arabic copy.
 * To add one: append an object, keep slug unique, set lastUpdated to today.
 * Official Meta URLs we are sure about are inlined.
 * Unverified Meta URLs stay as TODO comments — do not invent a link.
 *
 * TODO verify: Instagram "switch to professional account" has no stable URL
 * we confirmed. The steps below follow the Instagram app.
 * TODO verify: moving a personal WhatsApp number to WhatsApp Business.
 * TODO verify: Facebook "Settings > Business integrations" deep link.
 * TODO verify: a direct "add payment method" URL. We link Ads Manager instead.
 */
const UPDATED = '2026-10-08';

export const helpArticles: HelpArticle[] = [
  {
    slug: 'connect-overview',
    category: 'start',
    title: 'خريطة الربط: إيه المطلوب وبالترتيب',
    keywords: ['ترتيب', 'صفحة', 'انستجرام', 'واتساب', 'اعلانات', 'بداية'],
    intro: 'هتعرف تربط قنواتك بالترتيب الصح. حوالي ١٠ دقايق قراءة.',
    duration: 'قراءة ١٠ دقايق',
    before: [
      'حساب فيسبوك شخصي تقدر تفتحه.',
      'تكون أنت صاحب الصفحة، أو Admin عليها.',
    ],
    success:
      'في الإعدادات، حالة الربط بتعلم على الصفحة، إنستجرام، واتساب، وحساب الإعلانات.',
    steps: [
      {
        title: 'اعمل صفحة فيسبوك',
        body: 'Bee3ly بيرد من صفحة، مش من حسابك الشخصي. لو عندك صفحة خلاص، عدّي للخطوة الجاية.',
      },
      {
        title: 'اربط الصفحة من إعدادات Bee3ly',
        body: 'من القنوات اضغط ربط فيسبوك. ميتا هتفتح نافذة. وافق، وارجع تختار الصفحة.',
      },
      {
        title: 'خلّي إنستجرام Professional واربطه بالصفحة',
        body: 'الحساب الشخصي مش بيظهر. لازم يكون Business أو Creator، ومربوط بنفس الصفحة.',
      },
      {
        title: 'اربط واتساب',
        body: 'من نفس شاشة القنوات. الرقم لازم يتسجل في نافذة ميتا لحد الآخر.',
      },
      {
        title: 'اعمل Business Portfolio وحساب إعلانات',
        body: 'ده مطلوب لو هتنشر إعلان من Bee3ly. العملة جنيه مصري، والمنطقة القاهرة. العملة مبتتغيرش بعدين.',
      },
      {
        title: 'ارجع لـ Bee3ly واختار حساب الإعلانات',
        body: 'أعد الربط لو الحساب متعمل بعد أول مرة. اختار الصفحة، وبعدين الحساب اللي أول رقمه act_.',
      },
    ],
    problems: [
      {
        title: 'ربطت الصفحة ومفيش إنستجرام',
        body: 'الغالب إنستجرام لسه Personal، أو مش مربوط بالصفحة. اقرأ موضوع إنستجرام.',
      },
      {
        title: 'مفيش قائمة حسابات إعلانات',
        body: 'يا الحساب لسه متعملش، يا الصلاحية مش متديّة. اقرأ إنشاء الحساب وصلاحيات الإعلانات.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'create-facebook-page',
    category: 'channels',
    title: 'إزاي أعمل صفحة فيسبوك',
    keywords: ['صفحة', 'فيسبوك', 'انشاء', 'page'],
    intro: 'هتعمل صفحة للمتجر. حوالي ٥ دقايق.',
    duration: '٥ دقايق',
    before: ['حساب فيسبوك شخصي مفتوح.', 'اسم واضح للمتجر.'],
    success: 'تقدر تفتح الصفحة وتشوف زر إدارة الصفحة. الاسم ظاهر للناس.',
    steps: [
      {
        title: 'افتح إنشاء الصفحات',
        body: 'من الكمبيوتر افتح الرابط ده وسجّل دخولك: https://www.facebook.com/pages/create',
        screenshot: 'screenshot: صفحة إنشاء صفحة فيسبوك',
      },
      {
        title: 'اكتب اسم الصفحة',
        body: 'اسم المتجر زي ما العملاء بيعرفوه. تقدر تغيّره بعدين، بس خليّه واضح من الأول.',
      },
      {
        title: 'اختار الفئة',
        body: 'أقرب وصف للنشاط. مطعم، صيدلية، ملابس… مش لازم تبقى مثالية.',
      },
      {
        title: 'أضف صورة وصورة غلاف',
        body: 'الناس بتثق أكتر لما الصفحة شكلها جاهز. صورة اللوجو تكفي دلوقتي.',
      },
      {
        title: 'احفظ وافتح الصفحة',
        body: 'لو الصفحة ظهرت في قائمة صفحاتك، الخطوة خلصت.',
      },
    ],
    problems: [
      {
        title: 'الاسم مش متاح',
        body: 'زود كلمة زي المدينة أو نوع المنتج. مثال: دخون مدينة نصر.',
      },
      {
        title: 'مش لاقي الصفحة بعدين',
        body: 'من فيسبوك افتح القائمة، ثم الصفحات. لازم تكون أنت Admin مش مجرد معجب بالصفحة.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'connect-facebook',
    category: 'channels',
    title: 'إزاي أربط الصفحة بـ Bee3ly',
    keywords: ['ربط', 'فيسبوك', 'ادمن', 'admin', 'صلاحية'],
    intro: 'هتربط الصفحة عشان الردود تيجي في صندوق Bee3ly. حوالي ٣ دقايق.',
    duration: '٣ دقايق',
    before: [
      'صفحة فيسبوك جاهزة.',
      'أنت Admin على الصفحة. المحرر أو المعلن مش كفاية.',
    ],
    success:
      'في القنوات، فيسبوك ظاهر متصل، واسم الصفحة ظاهر. حالة الربط عليها علامة صح.',
    steps: [
      {
        title: 'ادخل إعدادات Bee3ly، تبويب القنوات',
        body: 'دور على كارت فيسبوك.',
        screenshot: 'screenshot: كارت فيسبوك في الإعدادات',
      },
      {
        title: 'اضغط ربط',
        body: 'نافذة ميتا هتفتح. لو اتقفلت قبل ما توافق، ابدأ من جديد.',
      },
      {
        title: 'وافق على الصفحات والرسائل',
        body: 'سيب الصفحات اللي Bee3ly محتاجها متعلّمة. لو شلت صلاحية، الربط هيكمّل ناقص.',
      },
      {
        title: 'ارجع واختار الصفحة',
        body: 'مش كل صفحاتك. اختار صفحة المتجر بس.',
      },
    ],
    problems: [
      {
        title: 'مش لاقي الصفحة في القائمة',
        body: 'أنت مش Admin. اطلب من صاحب الصفحة يضيفك كـ Admin، وبعدين أعد الربط.',
      },
      {
        title: 'النافذة قفلت لوحدها',
        body: 'امنع حاجب النوافذ المنبثقة للموقع، وافتح الربط تاني.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'instagram-professional',
    category: 'channels',
    title: 'إزاي أحوّل إنستجرام وأربطه',
    keywords: ['انستجرام', 'professional', 'business', 'احترافي', 'صفحة'],
    intro:
      'هتحوّل الحساب لحساب مهني، تربطه بصفحة الفيسبوك، وبعدين بـ Bee3ly. حوالي ١٠ دقايق.',
    duration: '١٠ دقايق',
    before: [
      'تطبيق إنستجرام على الموبايل.',
      'صفحة فيسبوك أنت Admin عليها.',
      'الحساب مش شخصي. الشخصي مش بيتربط.',
    ],
    success:
      'في Bee3ly، إنستجرام ظاهر متصل. في نافذة اختيار الصفحة مكتوب إن الصفحة معها إنستجرام.',
    steps: [
      {
        title: 'حوّل الحساب لـ Professional',
        body: 'من تطبيق إنستجرام: الإعدادات، ثم الحساب، ثم التبديل إلى حساب مهني. اختار Business.',
        screenshot: 'screenshot: تحويل إنستجرام لحساب مهني',
      },
      {
        title: 'اربطه بصفحة الفيسبوك',
        body: 'من نفس الإعدادات اختار الصفحة. لازم تبقى نفس الصفحة اللي هتربطها في Bee3ly.',
      },
      {
        title: 'ارجع لـ Bee3ly واعمل ربط فيسبوك تاني',
        body: 'لو كنت رابط الصفحة قبل تحويل إنستجرام، أعد الربط عشان الحساب يظهر.',
      },
      {
        title: 'اختار نفس الصفحة',
        body: 'لو الصفحة مكتوب عليها إن معها إنستجرام، الربط تم.',
      },
    ],
    problems: [
      {
        title: 'لسه Personal',
        body: 'ارجع لخطوة التحويل. Creator كمان مقبول، بس Business أوضح للمتاجر.',
      },
      {
        title: 'مربوط بصفحة تانية',
        body: 'فك الربط من الصفحة الغلط، واربطه بصفحة المتجر، وبعدين أعد ربط Bee3ly.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'connect-whatsapp',
    category: 'channels',
    title: 'إزاي أربط واتساب',
    keywords: ['واتساب', 'whatsapp', 'رقم', 'business'],
    intro:
      'هتربط رقم واتساب الأعمال عشان الشات يوصل لـ Bee3ly. حوالي ١٠ دقايق.',
    duration: '١٠ دقايق',
    before: [
      'رقم تقدر تستلم عليه رسالة أو مكالمة دلوقتي.',
      'الرقم مش شغال على واتساب العادي في نفس اللحظة. اقرأ التحذير تحت.',
    ],
    success: 'واتساب في القنوات ظاهر متصل، ورسالة تجربة بتوصل لصندوق الوارد.',
    steps: [
      {
        title: 'افهم موضوع الرقم الأول',
        body: 'الرقم يا يكون فاضي، يا يتحوّل من واتساب العادي. التحويل بيوقف تطبيق واتساب العادي على الرقم ده. متكمّلش لو الرقم ده خط العملاء اليومي ولسه محتاجه على التطبيق العادي.',
      },
      {
        title: 'من Bee3ly اضغط ربط واتساب',
        body: 'نافذة ميتا هتفتح. كمّلها لحد رسالة النجاح. لو قفلتها في النص، الربط مش هيتحسب.',
        screenshot: 'screenshot: نافذة تسجيل واتساب',
      },
      {
        title: 'اختار أو أنشئ حساب واتساب الأعمال',
        body: 'سمّه باسم المتجر. اختار الرقم، ودخّل الكود اللي هيوصلك.',
      },
      {
        title: 'ارجع لـ Bee3ly',
        body: 'استنى شوية. لما الكارت يقول متصل، ابعت رسالة للرقم من موبايل تاني وجرّب.',
      },
    ],
    problems: [
      {
        title: 'الرقم مستخدم على واتساب العادي',
        body: 'ميتا هتطلب نقل الرقم. لو نقلته، تطبيق واتساب العادي على الرقم ده هيفصل. لو مش جاهز، استخدم رقم تاني.',
      },
      {
        title: 'الكود مش واصل',
        body: 'جرّب الاتصال بدل الرسالة. اتأكد إن الرقم مكتوب بمفتاح مصر ٢٠.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'business-portfolio',
    category: 'ads',
    title: 'إزاي أعمل Business Portfolio',
    keywords: ['business manager', 'portfolio', 'اعمال', 'محفظة'],
    intro:
      'ده المجلد اللي يجمع الصفحة وحساب الإعلانات. حوالي ٥ دقايق. اسمه القديم Business Manager.',
    duration: '٥ دقايق',
    before: ['حساب فيسبوك.', 'صفحة المتجر جاهزة.'],
    success: 'تفتح إعدادات الأعمال وتشوف اسم النشاط، والصفحة جواه.',
    steps: [
      {
        title: 'افتح إعدادات الأعمال',
        body: 'من الكمبيوتر: https://business.facebook.com/settings',
        screenshot: 'screenshot: إعدادات Business Portfolio',
      },
      {
        title: 'لو مفيش نشاط، اعمل واحد',
        body: 'اختار إنشاء، وسمّه باسم المتجر. استخدم إيميلك.',
      },
      {
        title: 'ضيف الصفحة كأصل',
        body: 'من الحسابات، ثم الصفحات، أضف صفحة المتجر. لازم تكون Admin عشان الإضافة تتم.',
      },
    ],
    problems: [
      {
        title: 'مش قادر أضيف الصفحة',
        body: 'اطلب صلاحية Admin من صاحب الصفحة، أو ادخل بنفس الحساب اللي عمل الصفحة.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'create-ad-account',
    category: 'ads',
    title: 'إزاي أعمل حساب إعلانات',
    keywords: ['اعلانات', 'act', 'عملة', 'جنيه', 'قاهرة', 'دفع'],
    intro:
      'هتعمل حساب إعلانات بالجنيه وبتوقيت القاهرة، وتضيف طريقة دفع. حوالي ١٠ دقايق. العملة مبتتغيرش بعد الحفظ.',
    duration: '١٠ دقايق',
    before: [
      'Business Portfolio جاهز.',
      'صفحة المتجر متضافة جواه.',
      'بطاقة أو محفظة للدفع.',
    ],
    success:
      'في Bee3ly، بعد إعادة الربط، قائمة حساب الإعلانات فيها حساب أول رقمه act_. حالة الربط تعلم عليه.',
    steps: [
      {
        title: 'افتح إعدادات الأعمال',
        body: 'https://business.facebook.com/settings ثم الحسابات، ثم حسابات الإعلانات، ثم إضافة.',
      },
      {
        title: 'اختار العملة والمنطقة',
        body: 'العملة: EGP جنيه مصري. المنطقة الزمنية: القاهرة. راجعهم قبل الحفظ. ميتا مش بتسمح بتغيير العملة بعد كده.',
      },
      {
        title: 'ديك لنفسك صلاحية كاملة',
        body: 'من أشخاص الحساب، أضف حسابك الشخصي بصلاحية إدارة كاملة. من غير كده Bee3ly مش هيشوف الحساب.',
      },
      {
        title: 'اربط الصفحة كأصل',
        body: 'من الحساب الإعلاني، الأصول المرتبطة، أضف صفحة المتجر.',
      },
      {
        title: 'أضف طريقة دفع',
        body: 'من مدير الإعلانات https://adsmanager.facebook.com افتح الفوترة وأضف البطاقة. من غير طريقة دفع الإعلان مش هيتفعّل بعدين.',
        screenshot: 'screenshot: إضافة طريقة دفع في مدير الإعلانات',
      },
      {
        title: 'ارجع لـ Bee3ly وأعد ربط فيسبوك',
        body: 'اختار الصفحة، وبعدين اختار حساب الإعلانات من القائمة.',
      },
    ],
    problems: [
      {
        title: 'العملة طلعت غلط',
        body: 'متكمّلش على الحساب ده. اعمل حساب جديد بالعملة الصح. القديم هيفضل زي ما هو.',
      },
      {
        title: 'القائمة فاضية في Bee3ly',
        body: 'راجع إنك Admin على الحساب، وإنك وافقت على صلاحيات الإعلانات. اقرأ موضوع الصلاحيات.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'ads-permissions',
    category: 'ads',
    title: 'إزاي أتأكد إن Bee3ly واخد صلاحيات الإعلانات',
    keywords: ['صلاحيات', 'ads', 'اعادة ربط', 'تكامل'],
    intro: 'هتتأكد إن ميتا سايب Bee3ly يشوف حسابات الإعلانات. حوالي ٣ دقايق.',
    duration: '٣ دقايق',
    before: [
      'ربطت فيسبوك مرة على الأقل.',
      'حساب إعلانات موجود وأنت عليه بصلاحية كاملة.',
    ],
    success:
      'بعد إعادة الربط، قائمة حساب الإعلانات ظاهرة، وتقدر تختار واحد. رسالة «أعد ربط ميتا لتفعيل الإعلانات» تختفي.',
    steps: [
      {
        title: 'افتح تكاملات الأعمال في فيسبوك',
        body: 'من إعدادات فيسبوك دور على Business integrations أو التطبيقات ومواقع الويب. شيل Bee3ly لو ظاهر بصلاحيات ناقصة، عشان الموافقة الجاية تبقى نظيفة.',
        screenshot: 'screenshot: قائمة تكاملات الأعمال',
      },
      {
        title: 'من Bee3ly اضغط إعادة ربط فيسبوك',
        body: 'في نافذة ميتا سيّب صلاحيات الإعلانات متعلّمة. متقفلش النافذة قبل الموافقة.',
      },
      {
        title: 'اختار الصفحة وحساب الإعلانات',
        body: 'الحساب شكله act_ وبعده أرقام. لو العملة ظاهرة، اتأكد إنها EGP.',
      },
    ],
    problems: [
      {
        title: 'لسه مفيش حسابات',
        body: 'الصلاحية اتديّت بس الحساب مش متشارك معاك. ارجع لموضوع إنشاء حساب الإعلانات، خطوة الصلاحية الكاملة.',
      },
      {
        title: 'الرسالة بتقول أعد الربط',
        body: 'التوكن خلص أو اتسحب. إعادة الربط هي الحل. متبعتش التوكن لحد.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'troubleshooting',
    category: 'problems',
    title: 'أشهر الأخطاء وحلها',
    keywords: ['مشكلة', 'خطا', 'admin', 'توكن', 'دفع', 'نافذة'],
    intro: 'دور على الجملة القريبة من اللي ظاهر عندك. كل حل في سطرين.',
    duration: 'قراءة ٥ دقايق',
    before: ['اعرف أنهي قناة واقفة من حالة الربط في الإعدادات.'],
    success: 'الصف اللي كان ناقص يبقى عليه علامة صح.',
    steps: [
      {
        title: 'مش Admin على الصفحة',
        body: 'صاحب الصفحة يضيفك Admin. بعدين أعد ربط فيسبوك.',
      },
      {
        title: 'إنستجرام Personal',
        body: 'حوّله Professional من التطبيق، واربطه بالصفحة، وأعد ربط Bee3ly.',
      },
      {
        title: 'إنستجرام مش مربوط بالصفحة',
        body: 'من إنستجرام اختار صفحة المتجر مش صفحة تانية.',
      },
      {
        title: 'مفيش Ad Account',
        body: 'اعمل حساب من Business Portfolio. العملة EGP والقاهرة.',
      },
      {
        title: 'الصفحة مش متربطة بالحساب الإعلاني',
        body: 'من إعدادات الأعمال أضف الصفحة كأصل على الحساب الإعلاني.',
      },
      {
        title: 'مفيش طريقة دفع',
        body: 'من مدير الإعلانات أضف بطاقة. Bee3ly مش بياخد فلوس الإعلان. ميتا هي اللي بتحصّلها.',
      },
      {
        title: 'التوكن انتهى',
        body: 'هتشوف «أعد ربط ميتا». اضغط إعادة ربط ووافق تاني. ده مش بيمسح المحادثات.',
      },
      {
        title: 'نافذة ميتا اتقفلت',
        body: 'مفيش ربط نص نص. افتح الزر تاني وكمّل لحد ما ترجع لـ Bee3ly لوحدك.',
      },
      {
        title: 'الإعلان مش ظاهر في ميتا',
        body: 'اقرأ موضوع «الإعلان مش ظاهر في ميتا». الغالب الزر كان محاكاة، أو التأكيد متضغطش، أو الحساب المفتوح في مدير الإعلانات غير الحساب المختار في Bee3ly.',
      },
    ],
    problems: [
      {
        title: 'عملت كل ده ولسه ناقص',
        body: 'ابعت لنا من صفحة التواصل، واكتب أنهي صف في حالة الربط عليه علامة خطأ.',
      },
    ],
    lastUpdated: UPDATED,
  },
  {
    slug: 'ad-not-created',
    category: 'problems',
    title: 'الإعلان مش ظاهر في ميتا',
    keywords: [
      'اعلان',
      'اعلان مش ظاهر',
      'paused',
      'محاكاة',
      'تأكيد',
      'شروط',
      'جمهور',
      'custom audience',
      'draft',
      'حساب',
      'دفع',
    ],
    intro:
      'هتطلع الإعلان المتوقف في مدير الإعلانات. حوالي ١٠ دقايق. المتوقف مش بيصرف فلوس.',
    duration: '١٠ دقايق',
    before: [
      'صفحة فيسبوك متصلة في Bee3ly.',
      'في صفحة الحملات، حساب إعلانات مختار.',
      'أنت داخل فيسبوك بنفس الشخص اللي ربط Bee3ly.',
    ],
    success:
      'في Bee3ly الحملة مكتوب عليها متوقفة على ميتا. في مدير الإعلانات نفس الاسم وحالته Paused. مفيش زر Review and publish على الصف ده.',
    steps: [
      {
        title: 'اضغط الزر اللي بيبعت لميتا',
        body: 'محاكاة فقط بتحفظ الحملة جوه Bee3ly ومش بتعمل إعلان. اضغط إطلاق بمساعدة. هتطلع رسالة اسمها تأكيد الإجراء. اضغط تأكيد. لو قفلت الرسالة، مفيش إعلان.',
      },
      {
        title: 'خلّي الحساب واحد هنا وهناك',
        body: 'فوق في مدير الإعلانات فيه رقم الحساب. في Bee3ly، صفحة الحملات، اختار نفس الرقم. لو Bee3ly على حساب وأنت فاتح حساب تاني، الإعلان مش هيظهر قدامك. افتح المدير من هنا: https://adsmanager.facebook.com',
      },
      {
        title: 'لو القائمة فيها حساب واحد بس، استخدمه',
        body: 'مدير الإعلانات بيعرض الحسابات المتضافة لك بس. لو حساب زي Bee3ly Test مش ظاهر، سيبه. اختار الحساب الظاهر، ونفس الاختيار في Bee3ly.',
      },
      {
        title: 'اقبل شروط قوائم العملاء',
        body: 'لو Bee3ly كتب Accept Custom Audience terms، ميتا واقفة الإعلان لحد الموافقة. افتح الصفحة دي وأنت داخل فيسبوك: https://www.facebook.com/ads/manage/customaudiences/tos/ لو طلعت Sorry, this content is not available، الرقم في الرابط مش رقم الحساب المفتوح. انسخ الرقم من فوق مدير الإعلانات، وحطه في آخر الرابط بعد act=',
      },
      {
        title: 'شاشة الإعداد مش الإعلان',
        body: 'Get set up to run ads معناها الحساب لسه جديد. اختار صفحة المتجر واضغط Confirm. طريقة الدفع تقدر تضغط Skip for now. قفل كارت auto-apply من X. متضيفش بطاقة على حساب مش هتستخدمه.',
      },
      {
        title: 'اعرف صف Bee3ly من المسودة',
        body: 'صف اسمه New Sales Ad Set وحالته In draft وزراره Review and publish مسودة متعملة من مدير الإعلانات نفسه. إعلان Bee3ly اسمه اسم الحملة، وحالته Paused. سيب التفعيل. التفعيل هو اللي يبدأ الصرف.',
      },
    ],
    problems: [
      {
        title: 'الشروط اتقبلت والخطأ لسه موجود',
        body: 'الموافقة اتحفظت على حساب، وBee3ly لسه مختار حساب تاني. وحّد الرقم في الاتنين، وبعدين إطلاق بمساعدة ثم تأكيد.',
      },
      {
        title: 'مين اللي بيدفع؟',
        body: 'ميتا بتحصّل من طريقة الدفع اللي على حساب الإعلانات. Bee3ly مش بياخد ميزانية الإعلان. الإعلان المتوقف مش بيتخصم منه. أول ما تضغط تفعيل، ميتا تقدر تبدأ الخصم.',
      },
      {
        title: 'الصفحة مش متضافة على الحساب',
        body: 'من إعدادات الأعمال افتح الصفحة، ثم الأصول المرتبطة، وأضف حساب الإعلانات. متعملش حساب جديد بالزرار الأزرق. الإعدادات من هنا: https://business.facebook.com/settings',
      },
    ],
    en: {
      title: 'The ad is not showing in Meta',
      keywords: [
        'ad',
        'not created',
        'paused',
        'simulation',
        'confirm',
        'custom audience',
        'terms',
        'draft',
        'payment',
        'ad account',
      ],
      intro:
        'You will get the ad into Ads Manager as paused. About 10 minutes. A paused ad does not spend money.',
      duration: '10 minutes',
      before: [
        'A Facebook Page is connected in Bee3ly.',
        'An ad account is selected on the Campaigns page.',
        'You are logged into Facebook as the same person who connected Bee3ly.',
      ],
      success:
        'In Bee3ly the campaign says paused on Meta. In Ads Manager it has the same name and the status Paused. That row has no Review and publish button.',
      steps: [
        {
          title: 'Press the button that sends the ad to Meta',
          body: 'Simulation only saves the campaign inside Bee3ly. It does not create an ad. Press Assisted launch. A box asks you to confirm. Press Confirm. If you close the box, nothing is created.',
        },
        {
          title: 'Use one account in both places',
          body: 'The account number is at the top of Ads Manager. On the Bee3ly Campaigns page, select that same number. If Bee3ly uses one account and Ads Manager is open on another, you will not see the ad. Open Ads Manager here: https://adsmanager.facebook.com',
        },
        {
          title: 'If the list has one account, use that one',
          body: 'Ads Manager only lists accounts assigned to you. If an account such as Bee3ly Test is missing, leave it. Select the account you can see, and select that same account in Bee3ly.',
        },
        {
          title: 'Accept the customer list terms',
          body: 'If Bee3ly says Accept Custom Audience terms, Meta stopped the ad until you accept. Open this page while you are logged into Facebook: https://www.facebook.com/ads/manage/customaudiences/tos/ If it says Sorry, this content is not available, the number in the link is not the open account. Copy the number at the top of Ads Manager and add it at the end of the link after act=',
        },
        {
          title: 'The setup screen is not the ad',
          body: 'Get set up to run ads means the account is still new. Choose the store Page and press Confirm. For the payment method you can press Skip for now. Close the auto-apply card with X. Do not add a card on an account you will not use.',
        },
        {
          title: 'Tell a Bee3ly ad from a draft',
          body: 'A row named New Sales Ad Set, with status In draft and a Review and publish button, is a draft made inside Ads Manager. A Bee3ly ad uses the campaign name and the status Paused. Leave Activate alone. Activate is what starts spending.',
        },
      ],
      problems: [
        {
          title: 'You accepted the terms and the error is still there',
          body: 'The acceptance was saved on one account, and Bee3ly still has another account selected. Make the number the same in both places, then press Assisted launch and Confirm.',
        },
        {
          title: 'Who gets charged?',
          body: 'Meta charges the payment method on the ad account. Bee3ly does not take the ad budget. A paused ad is not charged. When you press Activate, Meta can start charging.',
        },
        {
          title: 'The Page is not added to the account',
          body: 'In Business settings open the Page, then Connected assets, and add the ad account. Do not create a new account with the blue Add button. Settings are here: https://business.facebook.com/settings',
        },
      ],
    },
    lastUpdated: UPDATED,
  },
];

export function findHelpArticle(slug: string) {
  return helpArticles.find((article) => article.slug === slug) ?? null;
}

export function localizeArticle(
  article: HelpArticle,
  locale: Locale,
): HelpArticle {
  if (locale !== 'en' || !article.en) return article;
  return { ...article, ...article.en };
}
