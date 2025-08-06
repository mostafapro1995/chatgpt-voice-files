// مفاتيح API
const OPENAI_API_KEY = "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";
const ASSEMBLY_API_KEY = "8c6a47655653447aa8ce70fa2b211e07";
const NFT_STORAGE_API_KEY = "c436806c.af9863eba14d43e8848586356f256e14";

// DOM Elements
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const uploadImage = document.getElementById("uploadImage");
const uploadAudio = document.getElementById("uploadAudio");
const uploadVideo = document.getElementById("uploadVideo");
const recordBtn = document.getElementById("startRecord");
const screenRecordBtn = document.getElementById("screenRecord");
const recordingIndicator = document.getElementById("recording-indicator");

// إرسال رسالة إلى OpenAI
async function sendToOpenAI(message) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: message }]
      })
    });

    const data = await res.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      console.error("خطأ في استجابة OpenAI:", data);
      return "حدث خطأ أثناء الحصول على الرد من OpenAI.";
    }
  } catch (error) {
    console.error("فشل الاتصال بـ OpenAI:", error);
    return "تعذر الاتصال بـ OpenAI.";
  }
}

// رفع ملفات لـ NFT Storage
async function uploadToNftStorage(file) {
  try {
    const res = await fetch("https://api.nft.storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NFT_STORAGE_API_KEY}`
      },
      body: file
    });
    const data = await res.json();
    return `https://${data.value.cid}.ipfs.nftstorage.link`;
  } catch (err) {
    console.error("فشل رفع الملف إلى NFT.storage:", err);
    alert("حدث خطأ أثناء رفع الملف.");
  }
}

// تفريغ صوت باستخدام AssemblyAI
async function transcribeAudio(file) {
  try {
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { authorization: ASSEMBLY_API_KEY },
      body: file
    });
    const uploadData = await uploadRes.json();

    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLY_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({ audio_url: uploadData.upload_url })
    });
    const transcriptData = await transcriptRes.json();

    let status = "processing";
    let result = null;
    while (status !== "completed" && status !== "error") {
      await new Promise(res => setTimeout(res, 3000));
      const polling = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
        headers: { authorization: ASSEMBLY_API_KEY }
      });
      result = await polling.json();
      status = result.status;
    }

    if (status === "completed") {
      return result.text;
    } else {
      throw new Error("فشل تفريغ الصوت.");
    }

  } catch (err) {
    console.error("خطأ في تفريغ الصوت:", err);
    return "تعذر تفريغ الصوت.";
  }
}

// عرض رسالة في الشات
function appendMessage(content, sender = "user", isMedia = false) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = isMedia ? content : content.replace(/\n/g, "<br>");
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// إرسال نص
sendBtn.onclick = async () => {
  const text = input.value.trim();
  if (!text) return;
  appendMessage(text, "user");
  input.value = "";
  const reply = await sendToOpenAI(text);
  appendMessage(reply, "bot");
};

// إرسال بالإنتر
input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendBtn.click();
});

// تحميل صورة
uploadImage.onchange = async () => {
  const file = uploadImage.files[0];
  if (!file) return;
  const url = await uploadToNftStorage(file);
  appendMessage(`<img src="${url}" alt="صورة">`, "user", true);
  const reply = await sendToOpenAI(`انظر إلى هذه الصورة: ${url}`);
  appendMessage(reply, "bot");
};

// تحميل فيديو
uploadVideo.onchange = async () => {
  const file = uploadVideo.files[0];
  if (!file) return;
  const url = await uploadToNftStorage(file);
  appendMessage(`<video src="${url}" controls></video>`, "user", true);
  const reply = await sendToOpenAI(`هذا الفيديو: ${url}`);
  appendMessage(reply, "bot");
};

// تحميل صوت
uploadAudio.onchange = async () => {
  const file = uploadAudio.files[0];
  if (!file) return;
  const url = await uploadToNftStorage(file);
  appendMessage(`<audio src="${url}" controls></audio>`, "user", true);
  const transcript = await transcribeAudio(file);
  const reply = await sendToOpenAI(`تم تفريغ الصوت: ${transcript}`);
  appendMessage(reply, "bot");
};

// تسجيل صوت مباشر
let mediaRecorder;
let chunks = [];

recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    recordingIndicator.style.display = "none";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      chunks = [];
      const url = URL.createObjectURL(blob);
      appendMessage(`<audio src="${url}" controls></audio>`, "user", true);
      const transcript = await transcribeAudio(blob);
      const reply = await sendToOpenAI(`تفريغ التسجيل: ${transcript}`);
      appendMessage(reply, "bot");
    };

    mediaRecorder.start();
    recordingIndicator.style.display = "inline-block";

  } catch (err) {
    console.error("فشل تسجيل الصوت:", err);
    alert("لم يتم السماح باستخدام الميكروفون.");
  }
};

// تسجيل شاشة
screenRecordBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const recorder = new MediaRecorder(stream);
    const screenChunks = [];

    recorder.ondataavailable = e => screenChunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(screenChunks, { type: "video/webm" });
      const url = await uploadToNftStorage(blob);
      appendMessage(`<video src="${url}" controls></video>`, "user", true);
      const reply = await sendToOpenAI(`فيديو الشاشة: ${url}`);
      appendMessage(reply, "bot");
    };

    recorder.start();
    setTimeout(() => recorder.stop(), 10000); // يسجل 10 ثوانٍ فقط

  } catch (err) {
    console.error("فشل تسجيل الشاشة:", err);
    alert("لم يتم منح إذن مشاركة الشاشة.");
  }
};


