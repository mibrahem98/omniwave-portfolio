# ملاحظات التنفيذ الأصلي للوسائط

## Expo ScreenOrientation

تدعم Expo ضبط القفل عبر `lockAsync` وإرجاعه إلى سياسة النظام عبر `unlockAsync`. يوصي دليل Expo باستخدام خيار `orientation` لكل شاشة في Expo Router عندما يحتاج مسار محدد إلى اتجاه مختلف. يحتاج iOS إلى بناء يدعم الاتجاهات المطلوبة، وقد يتأثر سلوك التدوير على iPad بوضع Split View.

المصدر: <https://docs.expo.dev/versions/latest/sdk/screen-orientation/>

## Expo Video

يدعم `VideoView` خصائص `fullscreenOptions`، ونداءات دخول وخروج الملء الكامل، وطرق العرض `contain` و`cover` و`fill`. يحافظ `contain` على نسبة أبعاد الفيديو وقد يظهر أشرطة، فيما يغطي `cover` الإطار مع احتمال قص الأطراف. يتطلب PiP تفعيل `supportsPictureInPicture` في إضافة البناء و`allowsPictureInPicture` في الواجهة.

المصدر: <https://docs.expo.dev/versions/latest/sdk/video/>

## Expo DocumentPicker وMediaLibrary

يجب استخدام `copyToCacheDirectory: true` عندما يحتاج التطبيق إلى قراءة الملف مباشرة بعد اختيار المستخدم له. تتيح MediaLibrary طلب أذونات دقيقة للصوت والفيديو على Android الحديث، وتعيد أصولاً قد تستخدم `ph://` على iOS؛ يلزم الحصول على معلومات الأصل أو نسخه إلى مساحة التطبيق قبل حفظه وتشغيله.

المصادر: <https://docs.expo.dev/versions/latest/sdk/document-picker/> و<https://docs.expo.dev/versions/latest/sdk/media-library/>
