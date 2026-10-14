صور الموقع. الموجود هون كلّه مقصوص ومضغوط للويب.

  awan-group-ink.png    لوغو AWAN GROUP بالحبر الغامق — بيظهر بالشريط العلوي
                        بالثيم النهاري، وبالفوتر بالثيم الليلي.
  awan-group-cream.png  نفس اللوغو بالأبيض — بيظهر بالشريط العلوي بالليلي،
                        وبالفوتر بالنهاري. كل سطح بياخد النسخة اللي بتبان عليه.
  logo-light.png        الأصل الأبيض بدقّة كاملة (١٧٠٤×٤٥٣) — منّه انعملت
                        النسختين فوق.
  logo.png              اللوغو الملوّن (العصفور + AWAN PRODUCTION LLC) بخلفية
                        شفافة — مستعمل للأيقونة وصورة المشاركة.
  hero-poster.jpg       الكادر الثابت تحت الهيرو — بيبان لحدّ ما يشتغل الفيديو،
                        وبيضلّ ظاهر لو ما في فيديو أصلاً.

  work-01.jpg      وردة شامية              ← صفّ «أعمال المدينة الذهبية»
  work-02.jpg      سلاسل دهب
  work-03.jpg      النوايا
  work-04.jpg      العربجي
  work-05.jpg      العربجي ٢
  work-06.jpg      السبع
  work-07.jpg      سوق الحرير
  work-08.jpg      مقامات العشق
  work-10.jpg      باب الحارة

  work-09.jpg      رحلتي إلى الشهرة        ← صفّ «أعمال أوان للدوبلاج»
  work-11.jpg      لم يكن حبيبي
  work-12.jpg      ملخص كرة القدم
  work-13.jpg      عهد الوفا
  work-14.jpg      الشيف الصغير
  work-15.jpg      الشيف الصغير — الموسم الثاني
  work-16.jpg      القطط الصغيرة
  work-17.jpg      ذئب مئة بالمئة — أسطورة حجر القمر
  work-18.jpg      ذئب مئة بالمئة — كتاب هاث
  work-19.jpg      ريمي وبو
  work-20.jpg      أكاديمية الخوارق
  work-21.jpg      ريا الأرنوبة
  work-22.jpg      أودو
  work-23.jpg      رحلة الحب

بوسترات الأعمال بتقبل أي نسبة — كل بطاقة إطار 3:4 بارتفاع واحد، والبوستر
بيندرج جوّاته كامل وما بينقصّ منّه شي، وتعبئة ضبابية من نفس الملف بتسدّ الباقي
(بتتعيّن من `src` الصورة بـ main.js، فما في تحميل تاني). وقت تبدّل بوستر،
حدّث `width` و`height` على الـ <img> بـ index.html لتطابق مقاس الصورة الجديدة.

---

Every work poster sits in the same 3:4 frame at one height: the artwork is
fitted whole, never cropped, and a blurred copy of the same file fills what is
left over — main.js reads that address off the card's own <img>, so the blur
costs no second request. When you swap a poster, update its width/height on the
<img> in index.html to match the new file.
