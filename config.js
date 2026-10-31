const GEMINI_KEY =`AIzaSyAejxTfOhSMgy5ARPnT4szWPWls7FiH1os`;

// كود الاتصال بـ Gemini مباشرة
// هذا هو الرابط والمسار الصحيح بالكامل لطلب الـ API
const url = `https://googleapis.com{GEMINI_KEY}`;
 {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: userMessage }] }]
  })
});
