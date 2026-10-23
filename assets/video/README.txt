فيديوهات الموقع — أربعة.

  intro.mp4          الصفحة الرئيسية — الانترو، بيشتغل خلفية الهيرو
  awan-studio.mp4    صفحة أوان للدوبلاج — انترو الصفحة، خلفية الهيرو
  awan-feature.mp4   صفحة أوان للدوبلاج — الفيديو اللي بينتشاف، بصوته،
                     بعد الخدمات وقبل صفّ البوسترات
  golden-city.mp4    صفحة مدينة الإنتاج السينمائي والتلفزيوني — انترو الصفحة، خلفية الهيرو

في نوعين هون، وكل نوع انضغط على طريقته. الأصول وصلت كلّها 1080p بـ٦٠
إطار/ثانية وبيتريت ١٧–١٨ ميغابت/ثانية، يعني تقيلة جداً للويب.

**التلاتة تبع الهيرو** (intro، awan-studio، golden-city) بتفتح صفحاتها:
بتشتغل لحالها، بتلفّ، وبتبان كاملة بعرض الصفحة — ما في شي بينقصّ منها وما
في كلام بينحطّ فوقها، لأنّ الفيديوهات نفسها فيها كتابات محروقة بالكادر. **انشال منهن مسار الصوت كلّياً** — المتصفّح
أصلاً بيكتّمهن، فالصوت كان بايت ضايع — ونزلوا على ٣٠ إطار/ثانية و1920 عرض
وH.264 بـCRF 30 مع faststart.

  intro.mp4          ٥٣MB ← 4.5MB   ٢٥ ثانية
  awan-studio.mp4    ٦٠MB ← 5.1MB   ٣٠ ثانية
  golden-city.mp4    ٥١MB ← 6.1MB   ٢٣ ثانية

**awan-feature.mp4** مشهد للمشاهدة مو خلفية: إله مشغّل بأزرار، ما بيشتغل
لحالو، وبيحمّل بس معلوماته لحدّ ما حدا يضغط play. صوته ضلّ معه (AAC 96k)
لأنّه هو كل الفكرة، والفيديو 1600×900 بـ٣٠ إطار/ثانية وCRF 31 وسقف بيتريت
1.5 ميغابت.

  awan-feature.mp4   ٢٠٨MB ← 13MB   ١:٤٣ دقيقة، بصوته

المجموع ٢٩MB لأربع فيديوهات، وأي صفحة ما بتحمّل غير فيديو واحد — والفيديو
اللي بصوته ما بيحمّل ولا بايت لحدّ ما حدا يطلبه.

لو بدّك تبدّل واحد منهن، نفس الوصفة:

  للهيرو     ffmpeg -i in.mp4 -an -r 30 -vf scale=1920:-2 -c:v libx264 \
             -preset medium -crf 30 -pix_fmt yuv420p -movflags +faststart out.mp4
  للمشاهدة   ffmpeg -i in.mp4 -r 30 -vf scale=1600:-2 -c:v libx264 \
             -preset medium -crf 31 -maxrate 1.5M -bufsize 3M -c:a aac -b:a 96k \
             -pix_fmt yuv420p -movflags +faststart out.mp4

وبعدها اقصّ الكادر الثابت تبعه: `ffmpeg -ss 0.2 -i out.mp4 -frames:v 1
-vf scale=1600:-2 -q:v 4 ../img/poster-<الصفحة>.jpg` — من أوّل كادر للهيرو،
ومن كادر يستاهل يتشاف للفيديو اللي بصوته.

---

Four reels, 39MB in total. The three hero reels are wallpaper — their audio
tracks are stripped, since the browser mutes them anyway — at 1080p30,
CRF 30, faststart. The feature on the dubbing page keeps its sound (AAC
128k) at CRF 29 with a 3Mbps ceiling, and loads nothing until someone
presses play. Each page's poster is cut from its own reel.
