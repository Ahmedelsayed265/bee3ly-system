import type { Locale } from '@/features/i18n/messages';

export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const privacy: Record<Locale, LegalDocument> = {
  ar: {
    title: 'سياسة الخصوصية',
    lastUpdated: '29 سبتمبر 2026',
    sections: [
      {
        title: 'من نحن',
        paragraphs: [
          'bee3ly منصة تساعد التجار على إدارة محادثات العملاء والطلبات عبر قنوات مثل فيسبوك وإنستجرام وواتساب، بما في ذلك مساعد ذكاء اصطناعي لردود آلية.',
          'تنطبق هذه السياسة على استخدامك لموقع bee3ly وتطبيق الويب المرتبط به والخدمات المقدمة من خلال حسابك.',
        ],
      },
      {
        title: 'البيانات التي نجمعها',
        paragraphs: [
          'بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، واسم النشاط التجاري عند التسجيل.',
          'بيانات التشغيل: المنتجات، الطلبات، العملاء، المحادثات، الرسائل الواردة والصادرة، وإعدادات الذكاء الاصطناعي والقنوات.',
          'بيانات القنوات المتصلة: عند ربط Meta أو WhatsApp، نخزّن معرفات الحسابات والرموز المشفرة اللازمة لاستقبال وإرسال الرسائل نيابة عنك.',
          'بيانات تقنية: سجلات الاستخدام، عنوان IP تقريبي، نوع المتصفح، وملفات تعريف الارتباط/session للمصادقة.',
        ],
      },
      {
        title: 'كيف نستخدم البيانات',
        paragraphs: [
          'تشغيل الخدمة: عرض صندوق الوارد، إنشاء الطلبات والليدز، الإشعارات، والتحليلات.',
          'الذكاء الاصطناعي: معالجة نص المحادثات (ومرفقات محددة مثل صور الإيصالات) لتوليد ردود واقتراحات وفق إعدادات التاجر.',
          'الأمان والامتثال: منع إساءة الاستخدام، تشخيص الأعطال، والامتثال للالتزامات القانونية.',
          'لا نبيع بياناتك الشخصية لأطراف ثالثة لأغراض تسويقية.',
        ],
      },
      {
        title: 'مشاركة البيانات',
        paragraphs: [
          'مزودو البنية: استضافة، قواعد بيانات، وخدمات AI/قنوات عند الحاجة لتشغيل المنصة (بموجب عقود وسرية).',
          'Meta / WhatsApp: عند ربط قنواتك، تخضع البيانات أيضاً لسياسات Meta المنطبقة على تلك المنتجات.',
          'الإفصاح القانوني: عند طلب جهة مختصة وفقاً للقانون، أو لحماية حقوق bee3ly والمستخدمين.',
        ],
      },
      {
        title: 'الاحتفاظ والحذف',
        paragraphs: [
          'نحتفظ بالبيانات طوال مدة حسابك النشط ولمدة معقولة بعد الإغلاق للنسخ الاحتياطي والالتزامات القانونية.',
          'يمكنك طلب حذف الحساب أو تصحيح البيانات عبر التواصل معنا؛ قد نبقي سجلات محدودة حيث يفرض القانون ذلك.',
        ],
      },
      {
        title: 'حقوقك',
        paragraphs: [
          'حسب قوانين بلدك، قد يكون لك الحق في الوصول، التصحيح، الحذف، أو الاعتراض على معالجة معينة.',
          'للمطالبات: راسلنا على support@bee3ly.com مع وصف الطلب واسم حسابك.',
        ],
      },
      {
        title: 'تحديثات هذه السياسة',
        paragraphs: [
          'قد نحدّث هذه السياسة؛ سننشر النسخة الجديدة على هذه الصفحة مع تاريخ «آخر تحديث». استمرارك في استخدام الخدمة بعد التحديث يعني موافقتك على النسخة المحدّثة.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lastUpdated: 'September 29, 2026',
    sections: [
      {
        title: 'Who we are',
        paragraphs: [
          'bee3ly helps merchants manage customer conversations and orders across channels such as Facebook, Instagram, and WhatsApp, including AI-assisted replies.',
          'This policy applies to your use of the bee3ly website, web application, and services tied to your account.',
        ],
      },
      {
        title: 'Data we collect',
        paragraphs: [
          'Account data: name, email, phone, and business name when you register.',
          'Operational data: products, orders, customers, conversations, inbound/outbound messages, and AI/channel settings.',
          'Connected channels: when you link Meta or WhatsApp, we store account identifiers and encrypted tokens needed to receive and send messages on your behalf.',
          'Technical data: usage logs, approximate IP, browser type, and cookies/session data for authentication.',
        ],
      },
      {
        title: 'How we use data',
        paragraphs: [
          'Service delivery: inbox, orders, leads, notifications, and analytics.',
          'AI: processing conversation text (and selected attachments such as payment screenshots) to generate replies and suggestions according to merchant settings.',
          'Security and compliance: abuse prevention, troubleshooting, and legal obligations.',
          'We do not sell your personal data to third parties for their marketing.',
        ],
      },
      {
        title: 'Sharing',
        paragraphs: [
          'Infrastructure providers: hosting, databases, and AI/channel services as needed to run the platform (under confidentiality commitments).',
          'Meta / WhatsApp: when you connect channels, data is also subject to applicable Meta policies.',
          'Legal disclosure: when required by law or to protect bee3ly and users.',
        ],
      },
      {
        title: 'Retention and deletion',
        paragraphs: [
          'We retain data while your account is active and for a reasonable period afterward for backup and legal needs.',
          'You may request account deletion or correction by contacting us; we may retain limited records where required by law.',
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'Depending on your jurisdiction, you may have rights to access, correct, delete, or object to certain processing.',
          'Contact support@bee3ly.com with your request and account email.',
        ],
      },
      {
        title: 'Updates',
        paragraphs: [
          'We may update this policy; the latest version will be posted on this page with the “Last updated” date. Continued use after changes means you accept the updated policy.',
        ],
      },
    ],
  },
};

const terms: Record<Locale, LegalDocument> = {
  ar: {
    title: 'الشروط والأحكام',
    lastUpdated: '29 سبتمبر 2026',
    sections: [
      {
        title: 'قبول الشروط',
        paragraphs: [
          'بإنشاء حساب أو استخدام bee3ly، فإنك توافق على هذه الشروط. إذا كنت تستخدم الخدمة نيابة عن شركة، فأنت تؤكد أن لديك صلاحية لربطها بهذه الشروط.',
        ],
      },
      {
        title: 'الخدمة',
        paragraphs: [
          'bee3ly أداة لإدارة المحادثات والطلبات والتسويق عبر قنوات متصلة؛ لا نضمن توفراً بنسبة 100% وقد نحدّث أو نوقف ميزات مع إشعار معقول عند الإمكان.',
          'مساعد الذكاء الاصطناعي يقدم اقتراحات آلية؛ أنت مسؤول عن مراجعة الردود، الأسعار، والالتزامات تجاه عملائك قبل تأكيد الطلبات أو المدفوعات.',
        ],
      },
      {
        title: 'حسابك ومسؤولياتك',
        paragraphs: [
          'أنت مسؤول عن سرية كلمة المرور وعن كل نشاط يتم عبر حسابك.',
          'يجب أن تكون بيانات نشاطك التجاري دقيقة وأن تمتثل للقوانين المحلية (التجارة الإلكترونية، حماية المستهلك، الضرائب، والتراخيص).',
          'لا تستخدم المنصة لرسائل غير مرغوبة، احتيال، محتوى غير قانوني، أو انتهاك حقوق الغير.',
        ],
      },
      {
        title: 'القنوات الخارجية (Meta وغيرها)',
        paragraphs: [
          'ربط فيسبوك أو إنستجرام أو واتساب يخضع لشروط وسياسات Meta المنفصلة؛ أنت مسؤول عن الحصول على الموافقات اللازمة من عملائك للمراسلة.',
          'قد تتوقف الخدمة جزئياً إذا ألغت Meta أو WhatsApp صلاحيات التطبيق أو حسابك التجاري.',
        ],
      },
      {
        title: 'الرسوم',
        paragraphs: [
          'خطط الاشتراك والأسعار معروضة في لوحة bee3ly؛ قد تتغير مع إشعار مسبق وفق خطة حسابك. الضرائب والرسوم البنكية إضافية حيث ينطبق.',
        ],
      },
      {
        title: 'الملكية الفكرية',
        paragraphs: [
          'منصة bee3ly وعلامتها ومحتواها التقني مملوكة لنا أو لمرخصينا. تحتفظ بملكية بياناتك التجارية (منتجات، عملاء، رسائل).',
        ],
      },
      {
        title: 'إخلاء المسؤولية وحدودها',
        paragraphs: [
          'الخدمة تُقدّم «كما هي» ضمن حدود القانون. لا نتحمل مسؤولية خسائر غير مباشرة أو فقدان أرباح ناتجة عن انقطاع القنوات أو أخطاء AI ما لم ينص القانون على خلاف ذلك.',
        ],
      },
      {
        title: 'إنهاء الخدمة',
        paragraphs: [
          'يمكنك إيقاف حسابك في أي وقت. يجوز لنا تعليق أو إنهاء حسابك عند مخالفة هذه الشروط أو إساءة استخدام خطيرة.',
        ],
      },
      {
        title: 'القانون والتواصل',
        paragraphs: [
          'تُفسَّر هذه الشروط وفق القانون المصري ما لم يُتفق كتابياً على غير ذلك. للاستفسارات: support@bee3ly.com.',
        ],
      },
    ],
  },
  en: {
    title: 'Terms & Conditions',
    lastUpdated: 'September 29, 2026',
    sections: [
      {
        title: 'Acceptance',
        paragraphs: [
          'By creating an account or using bee3ly, you agree to these Terms. If you use the service on behalf of a business, you confirm you have authority to bind that business.',
        ],
      },
      {
        title: 'The service',
        paragraphs: [
          'bee3ly helps you manage conversations, orders, and campaigns on connected channels; we do not guarantee 100% uptime and may change or discontinue features with reasonable notice when possible.',
          'AI suggestions are automated; you are responsible for reviewing replies, pricing, and customer commitments before confirming orders or payments.',
        ],
      },
      {
        title: 'Your account',
        paragraphs: [
          'You are responsible for keeping your credentials secure and for activity under your account.',
          'Your business information must be accurate and comply with applicable laws (e-commerce, consumer protection, tax, licensing).',
          'Do not use the platform for spam, fraud, illegal content, or infringement of others’ rights.',
        ],
      },
      {
        title: 'Third-party channels (Meta, etc.)',
        paragraphs: [
          'Connecting Facebook, Instagram, or WhatsApp is subject to Meta’s separate terms and policies; you must have proper consent to message customers.',
          'Service may be limited if Meta or WhatsApp revokes app or business access.',
        ],
      },
      {
        title: 'Fees',
        paragraphs: [
          'Subscription plans and pricing are shown in bee3ly; they may change with advance notice per your plan. Taxes and payment fees may apply.',
        ],
      },
      {
        title: 'Intellectual property',
        paragraphs: [
          'The bee3ly platform, brand, and software are owned by us or our licensors. You retain ownership of your business data (products, customers, messages).',
        ],
      },
      {
        title: 'Disclaimer and liability',
        paragraphs: [
          'The service is provided “as is” to the extent permitted by law. We are not liable for indirect losses or lost profits from channel outages or AI errors unless required otherwise by law.',
        ],
      },
      {
        title: 'Termination',
        paragraphs: [
          'You may stop using your account at any time. We may suspend or terminate accounts for material breaches or abuse.',
        ],
      },
      {
        title: 'Governing law and contact',
        paragraphs: [
          'These Terms are governed by the laws of Egypt unless otherwise agreed in writing. Questions: support@bee3ly.com.',
        ],
      },
    ],
  },
};

export type LegalDocumentId = 'privacy' | 'terms';

export function getLegalDocument(
  id: LegalDocumentId,
  locale: Locale,
): LegalDocument {
  return id === 'privacy' ? privacy[locale] : terms[locale];
}
