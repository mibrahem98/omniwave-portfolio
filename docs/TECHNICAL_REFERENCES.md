# المراجع التقنية المعتمدة

## تشغيل الصوت الأصلي

يدعم `expo-audio` تشغيل الصوت في الخلفية عبر إعداد `enableBackgroundPlayback` في إضافة Expo، ويستلزم استمرار التحكم على Android تفعيل عناصر شاشة القفل وبيانات المسار. كما تحتاج جلسة الصوت إلى `shouldPlayInBackground` عند التشغيل. [1]

توصي إرشادات Apple بأن يتصرف تطبيق الصوت وفق توقعات النظام: يترك مستوى الصوت للنظام، يراعي تغيير مخرج الصوت، ويتعامل مع انقطاع السماعات والتدخلات الصوتية والسياقات الخارجية بوضوح. [2]

## أثر ذلك في OmniWave

يحمل `app.config.ts` إعداد البناء لتشغيل الخلفية، بينما تضبط طبقة `player-store.tsx` جلسة الصوت وبيانات شاشة القفل. تبقى معاينة الويب مفيدة للواجهة، لكنها لا تؤكد سلوك الخلفية أو شاشة القفل أو Bluetooth؛ تُختبر هذه المسارات على iOS وAndroid فعليين.

## المراجع

[1]: https://docs.expo.dev/versions/latest/sdk/audio/ "Expo Audio"
[2]: https://developer.apple.com/design/human-interface-guidelines/playing-audio "Apple HIG — Playing audio"
