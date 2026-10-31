// api/chat.js - خادم جيرميناي (Gemini) الآمن الكامل على منصة Vercel
export default async function handler(req, res) {
  // السماح بطلب البيانات عبر بروتوكول POST فقط لحماية السيرفر
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // قراءة المفتاح السري بأمان من بيئة عمل Vercel المخفية خلف الكواليس
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير موجود في إعدادات Vercel' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'نص الرسالة فارغ' });
    }

    // إعداد التوجيه الخاص بشخصية البوت "أنوبي" لدمجه مع سؤال المستخدم
    const systemInstruction = "أنت مرشد الزمن أنوبي، رفيق ذكي وخبير ومرح في التاريخ الفرعوني والحضارة المصرية القديمة، تجيب باختصار وتشويق وتستخدم الإيموجي المناسبة.";
    const fullPrompt = `${systemInstruction}\nسؤال المستكشف: ${message}`;

    // الاتصال برابط الهيئة الرسمي لـ Google Gemini API
    const response = await fetch(`https://googleapis.com{apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      return res.status(response.status).json({ error: "فشل الاتصال بمزود الذكاء الاصطناعي" });
    }

    const data = await response.json();
    
    // استخراج النص الصافي المردود من البنية الهيكلية لردود جيرميناي بدقة
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      const botReply = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ reply: botReply });
    } else {
      throw new Error("تنسيق رد غير متوقع من بنية Gemini API");
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر أثناء معالجة رد أنوبي' });
  }
}
